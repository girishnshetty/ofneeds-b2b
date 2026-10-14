import { randomUUID, createHash } from 'node:crypto';
import { normalizeCategory, SPEC_TEXT_FIELDS, SPEC_LIST_FIELDS, SPEC_NUMBER_FIELDS, listValues, CUSTOMIZATION_METHODS, OCCASIONS, SUSTAINABILITY_TAGS } from './public/sourcing-core.js';

export function productSpecs(payload, existing = {}) {
  const result = {};
  for (const field of SPEC_TEXT_FIELDS) if (payload[field] !== undefined) {
    const value = String(payload[field]).trim();
    const maximum = field === 'sku' ? 80 : 160;
    if (value.length > maximum) throw new Error(`${field} must be at most ${maximum} characters.`);
    result[field] = value;
  }
  for (const field of SPEC_LIST_FIELDS) if (payload[field] !== undefined) {
    const values = listValues(payload[field]);
    if (values.length > 20 || values.some(value => value.length > 100)) throw new Error(`${field} has too many or overly long values.`);
    const allowed = { customizationMethods: CUSTOMIZATION_METHODS, occasions: OCCASIONS, sustainabilityTags: SUSTAINABILITY_TAGS }[field];
    if (allowed && values.some(value => !allowed.includes(value))) throw new Error(`Choose supported values for ${field}. Use | between values.`);
    result[field] = values;
  }
  for (const field of SPEC_NUMBER_FIELDS) if (payload[field] !== undefined) {
    const raw = payload[field], value = raw === '' || raw === null ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < (field === 'brandingMoq' ? 1 : 0) || (field !== 'brandingCost' && !Number.isInteger(value)))) throw new Error(`Enter a valid ${field}.`);
    result[field] = value;
  }
  return { ...Object.fromEntries([...SPEC_TEXT_FIELDS, ...SPEC_LIST_FIELDS, ...SPEC_NUMBER_FIELDS].filter(field => existing[field] !== undefined).map(field => [field, existing[field]])), ...result };
}
export const supplierSku = product => String(product.sku || product.model || '').trim().toLowerCase();
export const CSV_COLUMNS = ['sku', 'name', 'brand', 'model', 'category', 'price', 'mrp', 'gst', 'hsn', 'moq', 'stock', 'leadTime', 'leadDays', 'material', 'dimensions', 'weight', 'capacity', 'colors', 'sizes', 'warehouseLocation', 'customizationMethods', 'brandingMoq', 'brandingCost', 'brandingLeadDays', 'occasions', 'sustainabilityTags', 'deliveryLocations'];
export function parseCsv(raw) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > 1_000_000) throw new Error('Upload a CSV of at most 1 MB.');
  raw = raw.replace(/^\uFEFF/, '');
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  const finishCell = () => { row.push(cell.trim()); cell = ''; closed = false; };
  const finishRow = () => { finishCell(); if (row.some(Boolean)) rows.push(row); row = []; if (rows.length > 501) throw new Error('Import at most 500 product rows at a time.'); };
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (quoted) { if (char === '"') { if (raw[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += char; }
    else if (char === ',') finishCell();
    else if (char === '\n' || char === '\r') { if (char === '\r' && raw[i + 1] === '\n') i++; finishRow(); }
    else if (char === '"') { if (cell || closed) throw new Error('Malformed CSV quoting.'); quoted = true; }
    else { if (closed && char.trim()) throw new Error('Unexpected text after a quoted CSV field.'); if (!closed) cell += char; }
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  if (cell || row.length || closed) finishRow();
  const headers = rows.shift();
  if (!headers || new Set(headers).size !== headers.length || headers.some(key => !CSV_COLUMNS.includes(key))) throw new Error('Use unique column names from the OfNeeds CSV template.');
  for (const key of ['sku', 'name', 'brand', 'category', 'price', 'moq', 'stock']) if (!headers.includes(key)) throw new Error(`Missing required column: ${key}.`);
  if (!rows.length) throw new Error('The CSV contains no products.');
  return rows.map((cells, index) => ({ row: index + 2, data: Object.fromEntries(headers.map((key, column) => [key, cells[column] ?? ''])), errors: cells.length !== headers.length ? ['Column count does not match the header.'] : [] }));
}
export function createSourcingHandler(context) {
  const { store, requireUser, dealerFor, brandAuthorizationValid, activeStatuses, safeProduct, send, persist, addNotification } = context;
  const previews = new Map();
  store.enquiryBatches ||= []; store.importReports ||= [];
  const held = id => store.reservations.filter(item => item.productId === id && activeStatuses.has(item.status)).reduce((sum, item) => sum + item.quantity, 0);
  function validateRows(rows, dealer) {
    const seen = new Set();
    return rows.map(row => {
      const errors = [...row.errors]; const data = row.data; const sku = supplierSku(data);
      const matches = store.products.filter(item => item.dealerId === dealer.id && supplierSku(item) === sku);
      const existing = matches[0]; const fields = {};
      if (!data.sku || data.sku.length > 80) errors.push('SKU is required and must be at most 80 characters.');
      if (seen.has(sku) || matches.length > 1) errors.push('Duplicate supplier SKU. Use one row per SKU.'); seen.add(sku);
      if (!data.name || data.name.length > 160) errors.push('Product name is required, up to 160 characters.');
      if (!brandAuthorizationValid(dealer.id, data.brand)) errors.push('Brand authorization is not approved or has expired.');
      if (existing && existing.brand.toLowerCase() !== data.brand.toLowerCase()) errors.push('An existing SKU cannot move to another brand.');
      fields.category = normalizeCategory(data.category);
      if (!store.categories.map(normalizeCategory).includes(fields.category)) errors.push('Choose an OfNeeds category.');
      for (const key of ['price', 'moq', 'stock', 'mrp', 'gst']) {
        if (data[key] === undefined || data[key] === '') { if (['price', 'moq', 'stock'].includes(key)) errors.push(`${key} is required.`); continue; }
        const number = Number(data[key]);
        if (!Number.isFinite(number) || number < (key === 'moq' ? 1 : 0) || (['moq', 'stock'].includes(key) && !Number.isInteger(number)) || (key === 'gst' && number > 100)) errors.push(`Invalid ${key}.`);
        else fields[key] = number;
      }
      if (existing && fields.stock < Number(existing.sold || 0) + held(existing.id)) errors.push('Stock cannot be below sold plus active holds.');
      try { Object.assign(fields, productSpecs(data, existing)); } catch (error) { errors.push(error.message); }
      for (const key of ['name', 'brand', 'model', 'hsn', 'leadTime']) if (data[key] !== undefined) { if (data[key].length > 160) errors.push(`${key} is too long.`); fields[key] = data[key]; }
      return { row: row.row, sku: data.sku, name: data.name, action: existing ? 'Update' : 'Create', errors, existingId: existing?.id, fields };
    });
  }
  return async function handle(req, res, path, payload) {
    if (req.method === 'POST' && path === '/api/enquiry-batches') {
      const user = requireUser(req, res, ['buyer']); if (!user) return true;
      const key = String(payload.idempotencyKey || '');
      if (!/^[\w-]{16,100}$/.test(key)) { send(res, 400, { error: 'A valid enquiry submission key is required.' }); return true; }
      const fingerprint = createHash('sha256').update(JSON.stringify({ items: payload.items, deliveryDate: payload.deliveryDate, deliveryLocation: payload.deliveryLocation, notes: payload.notes })).digest('hex');
      const prior = store.enquiryBatches.find(item => item.buyerId === user.id && item.idempotencyKey === key);
      if (prior) { send(res, prior.fingerprint === fingerprint ? 200 : 409, prior.fingerprint === fingerprint ? { batch: prior, replayed: true } : { error: 'This submission key was already used for a different brief.' }); return true; }
      const location = String(payload.deliveryLocation || '').trim(), date = String(payload.deliveryDate || '');
      if (!location || location.length > 240 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date < new Date().toISOString().slice(0, 10) || String(payload.notes || '').length > 2000 || !Array.isArray(payload.items) || !payload.items.length || payload.items.length > 50) { send(res, 400, { error: 'Choose 1–50 products, a future delivery date and a delivery location. Keep notes within 2,000 characters.' }); return true; }
      const seen = new Set(), items = [];
      for (const row of payload.items) {
        const product = store.products.find(item => item.id === row?.productId && item.active !== false);
        if (!product || !brandAuthorizationValid(product.dealerId, product.brand) || (row.dealerId && row.dealerId !== product.dealerId)) { send(res, 403, { error: 'An enquiry item is unavailable or belongs to another supplier. Refresh the catalog.' }); return true; }
        const quantity = Number(row.quantity);
        if (seen.has(product.id) || !Number.isSafeInteger(quantity) || quantity < product.moq) { send(res, 400, { error: 'Use unique products and whole quantities meeting each MOQ.' }); return true; }
        seen.add(product.id); items.push({ productId: product.id, dealerId: product.dealerId, name: product.name, sku: product.sku || product.model || '', quantity });
      }
      const batch = { id: `BRIEF-${randomUUID().slice(0, 8)}`, buyerId: user.id, idempotencyKey: key, fingerprint, createdAt: new Date().toISOString(), deliveryDate: date, deliveryLocation: location, notes: String(payload.notes || '').trim(), items, supplierCount: new Set(items.map(item => item.dealerId)).size };
      const enquiries = items.map(item => ({ ...item, id: `RFQ-${randomUUID().slice(0, 8)}`, batchId: batch.id, buyerId: user.id, status: 'Awaiting response', createdAt: batch.createdAt, deliveryDate: date, deliveryLocation: location, notes: batch.notes }));
      store.enquiryBatches.unshift(batch); store.enquiries.unshift(...enquiries);
      addNotification(user.id, `Brief ${batch.id} sent: ${items.length} products to ${batch.supplierCount} suppliers. No stock is held by an enquiry.`);
      for (const dealerId of new Set(items.map(item => item.dealerId))) {
        const supplier = store.users.find(item => item.dealerId === dealerId || item.email === store.dealers.find(dealer => dealer.id === dealerId)?.email);
        if (supplier) addNotification(supplier.id, `Brief ${batch.id}: ${items.filter(item => item.dealerId === dealerId).length} products requested for ${location}.`);
      }
      await persist(); send(res, 201, { batch, replayed: false }); return true;
    }
    if (!path.startsWith('/api/dealer/import') && path !== '/api/dealer/product-details') return false;
    const user = requireUser(req, res, ['dealer']); if (!user) return true;
    const dealer = dealerFor(user); if (!dealer) { send(res, 403, { error: 'Supplier profile unavailable.' }); return true; }
    if (req.method === 'POST' && path === '/api/dealer/product-details') {
      const product = store.products.find(item => item.id === payload.productId && item.dealerId === dealer.id);
      if (!product) { send(res, 404, { error: 'Product not found in your catalog.' }); return true; }
      if (!brandAuthorizationValid(dealer.id, product.brand)) { send(res, 403, { error: 'Current brand authorization is required.' }); return true; }
      try {
        const specs = productSpecs(payload, product);
        const sku = supplierSku({ ...product, ...specs });
        if (sku && store.products.some(item => item.id !== product.id && item.dealerId === dealer.id && supplierSku(item) === sku)) throw new Error('This supplier SKU is already used.');
        Object.assign(product, specs, { updatedAt: new Date().toISOString() });
        await persist(); send(res, 200, { product: safeProduct(product, user) });
      } catch (error) { send(res, 400, { error: error.message }); } return true;
    }
    if (req.method === 'GET' && path === '/api/dealer/import-template') {
      res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="ofneeds-products.csv"', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' });
      res.end(CSV_COLUMNS.join(',') + '\r\n'); return true;
    }
    if (req.method === 'POST' && path === '/api/dealer/import/preview') {
      try {
        const rows = parseCsv(payload.csv), report = validateRows(rows, dealer);
        for (const [id, preview] of previews) if (preview.expiresAt < Date.now()) previews.delete(id);
        if (previews.size >= 500) { send(res, 429, { error: 'Import preview capacity reached. Retry later.' }); return true; }
        const previewId = randomUUID(), expiresAt = Date.now() + 10 * 60000;
        previews.set(previewId, { userId: user.id, rows, expiresAt, revisions: report.map(row => ({ id: row.existingId || null, updatedAt: store.products.find(item => item.id === row.existingId)?.updatedAt || null })) });
        send(res, 200, { previewId, expiresAt: new Date(expiresAt).toISOString(), valid: report.every(row => !row.errors.length), createCount: report.filter(row => row.action === 'Create').length, updateCount: report.filter(row => row.action === 'Update').length, rows: report.map(({ fields, existingId, ...row }) => ({ ...row, price: fields.price, stock: fields.stock })) });
      } catch (error) { send(res, 400, { error: error.message }); } return true;
    }
    if (req.method === 'POST' && path === '/api/dealer/import/commit') {
      const prior = store.importReports.find(item => item.previewId === payload.previewId && item.userId === user.id);
      if (prior) { send(res, 200, { report: prior, replayed: true }); return true; }
      const preview = previews.get(payload.previewId);
      if (!preview || preview.userId !== user.id || preview.expiresAt < Date.now()) { send(res, 409, { error: 'Preview expired or unavailable. Preview your CSV again.' }); return true; }
      const rows = validateRows(preview.rows, dealer);
      if (rows.some((row, index) => (row.existingId || null) !== preview.revisions[index].id || (store.products.find(item => item.id === row.existingId)?.updatedAt || null) !== preview.revisions[index].updatedAt)) { send(res, 409, { error: 'A listing changed since this preview. Preview the CSV again to review the current products.' }); return true; }
      if (rows.some(row => row.errors.length)) { send(res, 409, { error: 'Inventory or authorization changed, or the CSV has errors. Preview again before importing.', rows: rows.map(({ fields, existingId, ...row }) => row) }); return true; }
      const now = new Date().toISOString();
      const report = { id: `IMPORT-${randomUUID().slice(0, 8)}`, previewId: payload.previewId, userId: user.id, dealerId: dealer.id, createdAt: now, created: 0, updated: 0, rows: [] };
      for (const row of rows) {
        let product = store.products.find(item => item.id === row.existingId);
        if (!product) { product = { id: `p-${randomUUID().slice(0, 8)}`, dealerId: dealer.id, sold: 0, minStock: 10, gst: 18, image: '', warranty: '', color: '#f1f5f9', active: true }; store.products.unshift(product); report.created++; } else report.updated++;
        Object.assign(product, row.fields, { updatedAt: now, stockUpdatedAt: now, stockSource: 'csv', stockImportId: report.id });
        product.mrp ??= product.price;
        // Rebuild quantity breaks when an import explicitly changes base price/MOQ.
        product.tiers = [{ min: product.moq, max: 999999, price: product.price }];
        report.rows.push({ row: row.row, sku: row.sku, productId: product.id, action: row.action });
      }
      store.importReports.unshift(report); previews.delete(payload.previewId);
      await persist(); send(res, 200, { report, replayed: false }); return true;
    }
    send(res, 404, { error: 'Import route not found.' }); return true;
  };
}
