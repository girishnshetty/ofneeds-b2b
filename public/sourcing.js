import { filterProducts, CUSTOMIZATION_METHODS, OCCASIONS, SUSTAINABILITY_TAGS, SPEC_TEXT_FIELDS, SPEC_LIST_FIELDS, SPEC_NUMBER_FIELDS, listValues, stockFreshness } from './sourcing-core.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const money = value => value == null ? 'Not specified' : `₹${Number(value).toLocaleString('en-IN')}`;
const labels = { sku: 'Supplier SKU', material: 'Material', dimensions: 'Dimensions (with units)', weight: 'Weight (with units)', capacity: 'Capacity (with units)', warehouseLocation: 'Warehouse location', colors: 'Colours', sizes: 'Sizes', customizationMethods: 'Customization methods', occasions: 'Gifting occasions', sustainabilityTags: 'Sustainability claims', deliveryLocations: 'Delivery locations', brandingMoq: 'Branding MOQ', brandingCost: 'Branding cost per unit (₹, excl. GST)', brandingLeadDays: 'Extra branding lead time (days)', leadDays: 'Dispatch lead time (days)' };
const options = (values, selected, first = 'Any') => `<option value="">${first}</option>${values.map(value => `<option value="${esc(value)}" ${selected === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}`;
const filterFields = [['quantity', 'Required quantity', 'number'], ['maxMoq', 'Maximum MOQ', 'number'], ['minPrice', 'Minimum price (₹)', 'number'], ['warehouse', 'Warehouse location', 'text'], ['material', 'Material', 'text'], ['delivery', 'Delivery location', 'text'], ['maxLeadDays', 'Maximum dispatch days', 'number']];
const selectFields = [['customization', 'Customization method', CUSTOMIZATION_METHODS], ['occasion', 'Gifting occasion', OCCASIONS], ['sustainability', 'Sustainability claim', SUSTAINABILITY_TAGS]];
export function specificationFields(product = {}) {
  return `<div class="sourcing-spec-fields"><h3>Specifications & branding</h3><p class="form-note">Optional supplier-provided details. Leave unknown fields blank. Separate multiple values with |. Sustainability tags describe your own claims.</p><div class="field-grid">${SPEC_TEXT_FIELDS.map(key => `<div class="field"><label>${labels[key]}<input name="${key}" maxlength="${key === 'sku' ? 80 : 160}" value="${esc(product[key])}"></label></div>`).join('')}${SPEC_LIST_FIELDS.map(key => `<div class="field"><label>${labels[key]}<input name="${key}" value="${esc(listValues(product[key]).join(' | '))}" ${['customizationMethods', 'occasions', 'sustainabilityTags'].includes(key) ? `list="${key}-suggestions"` : ''}></label>${{ customizationMethods: CUSTOMIZATION_METHODS, occasions: OCCASIONS, sustainabilityTags: SUSTAINABILITY_TAGS }[key] ? `<datalist id="${key}-suggestions">${({ customizationMethods: CUSTOMIZATION_METHODS, occasions: OCCASIONS, sustainabilityTags: SUSTAINABILITY_TAGS }[key]).map(value => `<option value="${esc(value)}">`).join('')}</datalist><small>Options: ${esc(({ customizationMethods: CUSTOMIZATION_METHODS, occasions: OCCASIONS, sustainabilityTags: SUSTAINABILITY_TAGS }[key]).join(' · '))}</small>` : '<small>Use | between values</small>'}</div>`).join('')}${SPEC_NUMBER_FIELDS.map(key => `<div class="field"><label>${labels[key]}<input name="${key}" type="number" min="${key === 'brandingMoq' ? 1 : 0}" step="${key === 'brandingCost' ? '0.01' : 1}" value="${esc(product[key])}"></label></div>`).join('')}</div></div>`;
}
export function freshnessMarkup(product) {
  const freshness = product.stockFreshness || stockFreshness(product);
  const source = { manual: 'Supplier update', csv: 'Supplier CSV', demo: 'Demo inventory', unknown: 'Source unrecorded' }[freshness.source];
  return `<p class="stock-freshness ${freshness.status}"><span>${esc(source)} · ${freshness.status === 'recent' ? 'Updated within 7 days' : freshness.status === 'stale' ? 'Over 7 days old · reconfirm stock' : 'Stock update time unknown'}</span>${freshness.updatedAt ? `<time datetime="${esc(freshness.updatedAt)}">${esc(new Date(freshness.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }))}</time>` : ''}</p>`;
}
export function specificationDetails(product) {
  return `<section class="sourcing-details"><h3>Specifications & customization</h3><dl>${[...SPEC_TEXT_FIELDS, ...SPEC_LIST_FIELDS, ...SPEC_NUMBER_FIELDS].map(key => {
    let value = product[key]; if (SPEC_LIST_FIELDS.includes(key)) value = listValues(value).join(' · ');
    if (key === 'brandingCost') value = value == null ? '' : money(value);
    return `<div><dt>${labels[key]}</dt><dd>${esc(value === '' || value == null ? 'Not specified' : value)}</dd></div>`;
  }).join('')}</dl><p class="form-note">Specifications, branding options and sustainability claims are supplier-provided. Confirm feasibility and costs in the quote.</p>${freshnessMarkup(product)}</section>`;
}
export function createSourcingUI(context) {
  const { state, post, render, refreshCatalog, refreshDashboard, refreshAccount, toast, showModal, requireBuyer, authorizedBuyer } = context;
  state.sourcingFilters = {}; state.sort = 'featured';
  let owner = '', cart = [], requestKey = '', receipt = null, lastCsv = '';
  function readCart() {
    if (owner !== state.me?.id) {
      owner = state.me?.id || ''; requestKey = ''; receipt = null; cart = [];
      if (owner && authorizedBuyer()) { try { const data = JSON.parse(sessionStorage.getItem(`ofneeds-cart:${owner}`) || '[]'); if (Array.isArray(data)) cart = data.filter(row => typeof row.productId === 'string' && Number.isSafeInteger(row.quantity) && row.quantity > 0).slice(0, 50); } catch {} }
    }
    return cart;
  }
  function saveCart() { if (owner) { try { sessionStorage.setItem(`ofneeds-cart:${owner}`, JSON.stringify(cart)); } catch {} } }
  function changed() { requestKey = ''; receipt = null; saveCart(); }
  const rows = () => readCart().map(row => ({ ...row, product: state.products.find(product => product.id === row.productId) }));
  function visibleProducts() {
    const products = filterProducts(state.products, { ...state, ...state.sourcingFilters, ...(!authorizedBuyer() ? { minPrice: '', maxPrice: '' } : {}) });
    if (state.sort === 'price-low') products.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (state.sort === 'price-high') products.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    if (state.sort === 'stock') products.sort((a, b) => b.available - a.available);
    return products;
  }
  function filters() {
    return `<div class="filter-group sourcing-filters"><h4>Source for your brief</h4>${filterFields.map(([key, label, type]) => `<label>${label}<input class="filter-input" data-sourcing-filter="${key}" type="${type}" ${type === 'number' ? `min="${key === 'minPrice' ? 0 : 1}" step="1"` : ''} value="${esc(state.sourcingFilters[key])}" ${key === 'minPrice' && !authorizedBuyer() ? 'disabled' : ''}></label>`).join('')}${selectFields.map(([key, label, values]) => `<div class="sourcing-select"><label for="sourcing-filter-${key}">${label}</label><select id="sourcing-filter-${key}" class="filter-input" data-sourcing-filter="${key}">${options(values, state.sourcingFilters[key])}</select></div>`).join('')}<small>Required quantity must meet MOQ and fit available stock. Unspecified delivery or dispatch details do not match those filters.</small></div>`;
  }
  function cartPage() {
    if (!authorizedBuyer()) return `<main class="page-wrap"><h1>Enquiry basket</h1><p>A verified buyer account is required.</p><a class="btn btn-primary" data-page="auth" href="#auth">Sign in</a></main>`;
    const items = rows(), groups = Map.groupBy(items, row => row.product?.dealerId || 'unavailable');
    const histories = state.dashboard?.enquiryBatches || [];
    return `<main class="page-wrap sourcing-page"><header class="page-header"><span class="section-kicker">Your sourcing brief</span><h1>Enquiry basket</h1><p>Collect products, set quantities and send one delivery brief to their respective suppliers.</p><a href="#products" data-page="products" class="text-link">Continue exploring products →</a></header>${receipt ? `<div class="form-success" role="status"><strong>Brief ${esc(receipt.id)} sent.</strong> ${receipt.items.length} products sent to ${receipt.supplierCount} suppliers. Each supplier can quote for its own products in your workspace.</div>` : ''}${items.length ? `<form id="enquiry-basket-form"><div class="enquiry-layout"><section>${[...groups].map(([dealerId, group]) => `<article class="supplier-basket"><header><span class="section-kicker">${group.length} ${group.length === 1 ? 'product' : 'products'}</span><h2>${esc(group[0].product?.dealer?.businessName || 'Unavailable listings')}</h2><p>${esc(group[0].product?.dealer?.city || 'Remove unavailable products to continue.')}</p></header>${group.map(row => `<div class="basket-line"><div><strong>${esc(row.product?.name || row.productId)}</strong><p>${esc(row.product?.brand || '')} · SKU ${esc(row.product?.sku || row.product?.model || 'Not specified')}</p>${row.product ? `<small>${money(row.product.price)} / unit, excl. GST · ${row.product.available} available · MOQ ${row.product.moq}</small>${row.quantity > row.product.available ? '<p class="stock-warning">Quantity exceeds current stock. Ask the supplier about replenishment.</p>' : ''}` : '<p class="form-error">This listing is no longer accessible.</p>'}</div><label>Quantity<input name="qty-${esc(row.productId)}" data-cart-quantity="${esc(row.productId)}" type="number" min="${row.product?.moq || 1}" step="1" value="${row.quantity}" required></label><button type="button" class="text-link" data-action="basket-remove" data-id="${esc(row.productId)}" aria-label="Remove ${esc(row.product?.name || row.productId)}">Remove</button></div>`).join('')}</article>`).join('')}</section><aside class="brief-panel"><h2>One delivery brief</h2><p>${items.length} products · ${groups.size} suppliers</p><label>Required delivery date<input type="date" name="deliveryDate" min="${new Date().toISOString().slice(0, 10)}" required></label><label>Delivery city, state & PIN<input name="deliveryLocation" maxlength="240" required value="${esc(state.me.city || '')}"></label><label>Branding, packaging & delivery notes<textarea name="notes" rows="4" maxlength="2000"></textarea></label><p class="form-note">An enquiry does not reserve stock. Prices exclude GST, branding and delivery; your suppliers confirm the final quote.</p><div id="auth-message" role="status" aria-live="polite"></div><button class="btn btn-primary" ${items.some(row => !row.product) ? 'disabled' : ''}>Send enquiry to ${groups.size} suppliers ↗</button></aside></div></form>` : '<section class="empty-products"><strong>Your basket is empty</strong>Add products from the catalog to build a sourcing brief.</section>'}${histories.length ? `<section class="brief-history"><h2>Recently sent briefs</h2>${histories.slice(0, 10).map(batch => `<article><strong>${esc(batch.id)}</strong><span>${batch.items.length} products · ${batch.supplierCount} suppliers · ${esc(batch.deliveryLocation)}</span><a data-page="dashboard" data-section="enquiries" href="#dashboard">View responses →</a></article>`).join('')}</section>` : ''}</main>`;
  }
  function modal() {
    const model = state.modal;
    if (model?.type === 'product-specs') {
      const product = state.dashboard?.products.find(item => item.id === model.id); if (!product) return '';
      return `<div class="modal-backdrop" data-action="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="spec-title"><div class="modal-head"><div><h2 id="spec-title">Edit product specifications</h2><p>${esc(product.name)}</p></div><button class="modal-close" data-action="close-modal" aria-label="Close">×</button></div><form id="product-specs-form"><div class="modal-body"><input type="hidden" name="productId" value="${esc(product.id)}">${specificationFields(product)}<p class="form-note">Editing specifications does not refresh the stock timestamp.</p><div id="modal-message" role="status" aria-live="polite"></div></div><div class="modal-foot"><button type="button" class="btn btn-outline" data-action="close-modal">Cancel</button><button class="btn btn-primary">Save specifications</button></div></form></section></div>`;
    }
    if (model?.type !== 'csv-import') return '';
    const preview = model.preview, report = model.report;
    return `<div class="modal-backdrop" data-action="backdrop"><section class="modal sourcing-import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title"><div class="modal-head"><div><span class="section-kicker">Supplier catalog</span><h2 id="import-title">Import products from CSV</h2><p>Review every row before updating your own inventory.</p></div><button class="modal-close" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body">${report ? `<div class="form-success" role="status"><strong>Import ${esc(report.id)} completed.</strong><br>${report.created} created · ${report.updated} updated.</div><div class="table-scroll"><table class="data-table"><thead><tr><th>Row</th><th>SKU</th><th>Result</th></tr></thead><tbody>${report.rows.map(row => `<tr><td>${row.row}</td><td>${esc(row.sku)}</td><td>${row.action}</td></tr>`).join('')}</tbody></table></div>` : `<a class="text-link" href="/api/dealer/import-template" download>Download CSV template ↓</a><p class="form-note">Required: sku, name, brand, category, price, moq, stock. Prices exclude GST. Only your approved brands are allowed; existing supplier SKUs are updated. Images are added separately with your permission. Imported base prices/MOQs replace quantity price breaks.</p><details class="csv-guide"><summary>Available categories and supported tags</summary><p><strong>Categories:</strong> ${esc(state.categories.join(' · '))}</p><p><strong>Customization:</strong> ${esc(CUSTOMIZATION_METHODS.join(' · '))}</p><p><strong>Occasions:</strong> ${esc(OCCASIONS.join(' · '))}</p><p><strong>Sustainability claims:</strong> ${esc(SUSTAINABILITY_TAGS.join(' · '))}</p></details><form id="csv-preview-form"><label class="field">Choose CSV file (up to 1 MB, 500 rows)<input type="file" name="csvFile" accept=".csv,text/csv"></label><div class="field"><label for="supplier-csv-text">Or paste CSV</label><textarea id="supplier-csv-text" name="csv" rows="6" placeholder="sku,name,brand,category,price,moq,stock">${esc(lastCsv)}</textarea></div><div id="modal-message" role="status" aria-live="polite"></div><button class="btn btn-outline">${preview ? 'Preview again' : 'Preview import'}</button></form>${preview ? `<section class="import-preview"><h3>${preview.createCount} new · ${preview.updateCount} updates</h3><p class="${preview.valid ? 'form-success' : 'form-error'}">${preview.valid ? 'All rows passed validation. Nothing has been imported yet.' : 'Resolve the row errors and preview again. No rows have been imported.'}</p><div class="table-scroll"><table class="data-table"><thead><tr><th>Row / SKU</th><th>Product</th><th>Price / stock</th><th>Action / validation</th></tr></thead><tbody>${preview.rows.map(row => `<tr><td>${row.row}<br>${esc(row.sku)}</td><td>${esc(row.name)}</td><td>${money(row.price)}<br>${esc(row.stock)} units</td><td>${row.action}<br>${row.errors.length ? `<span class="form-error">${row.errors.map(esc).join('<br>')}</span>` : 'Ready'}</td></tr>`).join('')}</tbody></table></div><form id="csv-commit-form"><div id="modal-message" role="status" aria-live="polite"></div><button class="btn btn-primary" ${preview.valid ? '' : 'disabled'}>Import ${preview.rows.length} reviewed rows</button></form><p class="form-note">Preview expires after 10 minutes. Inventory and authorization are checked again when you import.</p></section>` : ''}`}</div><div class="modal-foot"><button class="btn btn-outline" data-action="close-modal">${report ? 'Done' : 'Cancel'}</button></div></section></div>`;
  }
  function enhance(root) {
    if (authorizedBuyer()) root.querySelector('.nav-right')?.insertAdjacentHTML('afterbegin', `<a class="basket-nav" href="#enquiry-cart" data-page="enquiry-cart" aria-label="Enquiry basket, ${readCart().length} products">Basket <span>${readCart().length}</span></a>`);
    const filterPanel = root.querySelector('#filter-panel');
    filterPanel?.querySelector('[data-action="apply-filters"]')?.insertAdjacentHTML('beforebegin', filters());
    const sort = root.querySelector('#sort-products'); if (sort) sort.value = state.sort;
    const tags = Object.entries(state.sourcingFilters).filter(([, value]) => value !== '' && value != null);
    if (filterPanel && tags.length) root.querySelector('.catalog-search')?.insertAdjacentHTML('afterend', `<div class="active-filters sourcing-active">${tags.map(([key, value]) => `<span class="tag">${esc([...filterFields, ...selectFields].find(field => field[0] === key)?.[1] || key)}: ${esc(value)}</span>`).join('')}</div>`);
    const productForm = root.querySelector('#product-form .field-grid'); if (productForm) productForm.insertAdjacentHTML('beforeend', `<div class="full">${specificationFields()}</div>`);
    if (state.modal?.type === 'product') {
      const product = state.products.find(item => item.id === state.modal.id);
      if (product) { root.querySelector('.modal-body')?.insertAdjacentHTML('beforeend', specificationDetails(product)); if (authorizedBuyer()) root.querySelector('.modal-foot')?.insertAdjacentHTML('afterbegin', `<button class="btn btn-outline" data-action="basket-add" data-id="${esc(product.id)}">Add to enquiry basket</button>`); }
    }
    if (state.me?.role === 'dealer' && state.dashSection === 'products') {
      root.querySelector('[data-action="add-product"]')?.insertAdjacentHTML('beforebegin', '<button class="btn btn-outline" data-action="csv-import">Import CSV</button> ');
      root.querySelectorAll('[data-action="edit-stock"]').forEach(button => { button.insertAdjacentHTML('afterend', `<button class="btn btn-outline btn-sm" data-action="product-specs" data-id="${esc(button.dataset.id)}">Specifications</button>`); const product = state.dashboard.products.find(item => item.id === button.dataset.id); if (product) button.closest('tr').querySelector('td:nth-child(4)').innerHTML = freshnessMarkup(product); });
      if (state.dashboard?.importReports?.length) root.querySelector('.dash-title-row')?.insertAdjacentHTML('afterend', `<section class="import-history"><strong>Recent CSV imports</strong>${state.dashboard.importReports.slice(0, 5).map(report => `<p>${esc(report.id)} · ${report.created} created · ${report.updated} updated · ${esc(new Date(report.createdAt).toLocaleString('en-IN'))}</p>`).join('')}</section>`);
    }
    root.querySelectorAll('[data-cart-quantity]').forEach(input => input.addEventListener('change', () => { const row = readCart().find(item => item.productId === input.dataset.cartQuantity); if (row) { row.quantity = Number(input.value); changed(); } }));
    root.querySelectorAll('#enquiry-basket-form input:not([data-cart-quantity]), #enquiry-basket-form textarea').forEach(input => input.addEventListener('input', () => { requestKey = ''; }));
    const csvForm = root.querySelector('#csv-preview-form');
    csvForm?.addEventListener('input', () => { if (state.modal?.preview) { state.modal.preview.valid = false; root.querySelector('#csv-commit-form button').disabled = true; } });
    csvForm?.addEventListener('change', () => { if (state.modal?.preview) { state.modal.preview.valid = false; root.querySelector('#csv-commit-form button').disabled = true; } });
  }
  async function click(action, trigger) {
    if (action === 'basket-add') {
      if (!requireBuyer()) return true;
      readCart(); const product = state.products.find(item => item.id === trigger.dataset.id); if (!product) return true;
      if (cart.some(row => row.productId === product.id)) { toast('This product is already in your enquiry basket.'); return true; }
      if (cart.length >= 50) { toast('Add up to 50 products per brief.', 'error'); return true; }
      cart.push({ productId: product.id, quantity: product.moq }); changed(); render(); toast('Added to your enquiry basket.'); return true;
    }
    if (action === 'basket-remove') { cart = readCart().filter(row => row.productId !== trigger.dataset.id); changed(); render(); return true; }
    if (action === 'csv-import') { lastCsv = ''; showModal('csv-import'); return true; }
    if (action === 'product-specs') { showModal('product-specs', { id: trigger.dataset.id }); return true; }
    return false;
  }
  async function submit(form, values) {
    if (form.id === 'enquiry-basket-form') {
      if (!requireBuyer()) return true;
      for (const row of readCart()) row.quantity = Number(values[`qty-${row.productId}`]); saveCart();
      requestKey ||= crypto.randomUUID();
      const result = await post('/api/enquiry-batches', { idempotencyKey: requestKey, items: cart.map(row => ({ ...row })), deliveryDate: values.deliveryDate, deliveryLocation: values.deliveryLocation, notes: values.notes });
      receipt = result.batch; cart = []; saveCart(); requestKey = '';
      await refreshDashboard(); await refreshAccount(); render(); toast(`Sourcing brief ${receipt.id} sent.`); return true;
    }
    if (form.id === 'product-specs-form') { await post('/api/dealer/product-details', values); state.modal = null; await refreshDashboard(); await refreshCatalog(); render(); toast('Product specifications updated.'); return true; }
    if (form.id === 'csv-preview-form') {
      const file = form.elements.csvFile.files[0]; if (file?.size > 1_000_000) throw new Error('Choose a CSV smaller than 1 MB.');
      const csv = file ? await file.text() : values.csv; lastCsv = csv;
      const preview = await post('/api/dealer/import/preview', { csv }); state.modal.preview = preview; render(); return true;
    }
    if (form.id === 'csv-commit-form') {
      const result = await post('/api/dealer/import/commit', { previewId: state.modal.preview.previewId });
      state.modal.report = result.report; await refreshDashboard(); await refreshCatalog(); render(); toast('Reviewed CSV rows imported.'); return true;
    }
    return false;
  }
  return { visibleProducts, cartPage, modal, enhance, click, submit, readFilters(root) { for (const input of root.querySelectorAll('[data-sourcing-filter]')) { if (!input.checkValidity()) { input.reportValidity(); return false; } } state.sourcingFilters = Object.fromEntries([...root.querySelectorAll('[data-sourcing-filter]')].map(input => [input.dataset.sourcingFilter, input.value])); return true; }, clearFilters() { state.sourcingFilters = {}; state.sort = 'featured'; }, card(product) { return `${freshnessMarkup(product)}${authorizedBuyer() ? `<button class="btn btn-outline basket-add" data-action="basket-add" data-id="${esc(product.id)}">${readCart().some(row => row.productId === product.id) ? 'In enquiry basket ✓' : 'Add to enquiry basket +'}</button>` : ''}`; } };
}
