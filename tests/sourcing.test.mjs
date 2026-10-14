import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { parseCsv, productSpecs, createSourcingHandler } from '../sourcing-services.mjs';
import { filterProducts, stockFreshness, normalizeCategory } from '../public/sourcing-core.js';

let child, fixture, buyer, supplier, pending;
const base = 'http://127.0.0.1:4180';
async function request(path, data, cookie) {
  const response = await fetch(base + path, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const database = async () => JSON.parse(await readFile(join(fixture, 'data/marketplace.json'), 'utf8'));
before(async () => {
  await mkdir('.tmp', { recursive: true }); fixture = await mkdtemp(resolve('.tmp/sourcing-test-'));
  for (const file of ['server.mjs', 'marketplace-services.mjs', 'sourcing-services.mjs']) await cp(file, join(fixture, file));
  await cp('catalog', join(fixture, 'catalog'), { recursive: true }); await mkdir(join(fixture, 'public')); await cp('public/sourcing-core.js', join(fixture, 'public/sourcing-core.js'));
  child = spawn(process.execPath, [join(fixture, 'server.mjs')], { env: { ...process.env, PORT: '4180', DEMO_MODE: 'true', OFNEEDS_DATA_DIR: join(fixture, 'data') }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', data => output += data); child.stderr.on('data', data => output += data);
  let ready = false;
  for (let i = 0; i < 60; i++) { try { if ((await request('/api/health')).status === 200) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 100)); }
  assert.ok(ready, output);
  buyer = (await request('/api/auth/login', { email: 'buyer@ofneeds.in', password: 'Buyer@1234' })).cookie;
  supplier = (await request('/api/auth/login', { email: 'dealer@ofneeds.in', password: 'Dealer@1234' })).cookie;
  pending = (await request('/api/auth/login', { email: 'sana@brightbox.in', password: 'Company@1234' })).cookie;
});
after(async () => { if (child?.exitCode === null) { child.kill(); await once(child, 'exit'); } });

test('CSV parser handles BOM, escaped quotes, commas and multiline cells; rejects malformed headers and quotes', () => {
  const result = parseCsv('\uFEFFsku,name,brand,category,price,moq,stock\r\nABC,"A, ""gift""\nset",JBL,Gift Sets & Hampers,100,10,50\r\n');
  assert.equal(result[0].data.name, 'A, "gift"\nset');
  assert.throws(() => parseCsv('sku,sku\nA,A'), /unique column/);
  assert.throws(() => parseCsv('sku,name,brand,category,price,moq,stock\nA,"bad'), /unclosed/);
  assert.throws(() => parseCsv('sku,name,brand,category,price,moq,stock\nA,"bad"oops,JBL,x,1,1,1'), /Unexpected/);
  assert.throws(() => parseCsv('sku,name,brand,category,price,moq,stock,image\nA,N,JBL,x,1,1,1,https://example.test'), /column names/);
});
test('Specifications validate optional fields and freshness distinguishes recent, stale and unknown inventory', () => {
  assert.deepEqual(productSpecs({ colors: 'Black | Blue | Black', brandingCost: '', leadDays: '5' }), { colors: ['Black', 'Blue'], brandingCost: null, leadDays: 5 });
  assert.throws(() => productSpecs({ brandingMoq: -1 }), /valid/);
  assert.throws(() => productSpecs({ customizationMethods: 'Imaginary service' }), /supported/);
  assert.equal(stockFreshness({ updatedAt: new Date().toISOString() }).status, 'unknown');
  assert.equal(stockFreshness({ stockUpdatedAt: new Date(Date.now() - 8 * 86400000).toISOString(), stockSource: 'csv' }).status, 'stale');
  assert.equal(stockFreshness({ stockUpdatedAt: new Date().toISOString(), stockSource: 'manual' }).status, 'recent');
  assert.equal(normalizeCategory('Backpacks & Bags'), 'Bags & Backpacks');
});
test('Grouped enquiry batches are supplier scoped, atomic and idempotent under concurrent retries', async () => {
  const before = await database();
  const payload = { idempotencyKey: 'test-sourcing-brief-001', items: [{ productId: 'p-1', quantity: 10 }, { productId: 'p-2', quantity: 20 }, { productId: 'p-3', quantity: 25 }], deliveryDate: '2099-01-01', deliveryLocation: 'Bengaluru, Karnataka 560001', notes: 'Please quote logo printing.' };
  const results = await Promise.all([request('/api/enquiry-batches', payload, buyer), request('/api/enquiry-batches', payload, buyer)]);
  assert.deepEqual(results.map(item => item.status).sort(), [200, 201]); assert.equal(results[0].data.batch.id, results[1].data.batch.id);
  const after = await database(); assert.equal(after.enquiryBatches.length, 1); assert.equal(after.enquiries.length - before.enquiries.length, 3);
  assert.equal(after.notifications.length - before.notifications.length, 2); // Buyer + the onboarded dealer-1 user, once each.
  assert.deepEqual(after.reservations, before.reservations);
  const batch = after.enquiryBatches[0]; assert.equal(batch.supplierCount, 2); assert.equal(after.enquiries.filter(item => item.batchId === batch.id && item.dealerId === 'dealer-1').length, 2);
  assert.equal((await request('/api/enquiry-batches', { ...payload, notes: 'Changed' }, buyer)).status, 409);
  const dashboard = (await request('/api/dashboard', null, buyer)).data;
  assert.equal(dashboard.enquiryBatches[0].id, batch.id); assert.equal(dashboard.enquiryBatches[0].idempotencyKey, undefined);
  assert.equal((await request('/api/rfqs/' + after.enquiries.find(item => item.batchId === batch.id && item.dealerId === 'dealer-1').id + '/quote', { price: 10000, gst: 18 }, supplier)).status, 200);
  assert.equal((await request('/api/rfqs/' + after.enquiries.find(item => item.batchId === batch.id && item.dealerId === 'dealer-2').id + '/quote', { price: 10000 }, supplier)).status, 404);
});
test('Enquiry batches reject cross-supplier, inaccessible, duplicate and below-MOQ rows without partial writes', async () => {
  const payload = { idempotencyKey: 'test-sourcing-invalid-01', deliveryDate: '2099-01-01', deliveryLocation: 'Mumbai', items: [{ productId: 'p-1', quantity: 10 }, { productId: 'p-3', dealerId: 'dealer-1', quantity: 25 }] };
  const before = await database();
  assert.equal((await request('/api/enquiry-batches', payload, buyer)).status, 403);
  assert.equal((await request('/api/enquiry-batches', { ...payload, items: [{ productId: 'unknown', quantity: 10 }] }, buyer)).status, 403);
  assert.equal((await request('/api/enquiry-batches', { ...payload, items: [{ productId: 'p-1', quantity: 9 }] }, buyer)).status, 400);
  assert.equal((await request('/api/enquiry-batches', { ...payload, items: [{ productId: 'p-1', quantity: 10 }, { productId: 'p-1', quantity: 10 }] }, buyer)).status, 400);
  assert.equal((await request('/api/enquiry-batches', payload, pending)).status, 403);
  assert.equal((await request('/api/enquiry-batches', payload, supplier)).status, 403);
  assert.equal((await request('/api/enquiry-batches', payload)).status, 401);
  assert.equal((await request('/api/rfqs', { productId: 'p-1', dealerId: 'dealer-2', quantity: 10 }, buyer)).status, 403);
  assert.deepEqual((await database()).enquiryBatches, before.enquiryBatches);
});
test('CSV preview reports duplicate SKUs, unauthorized brands, invalid prices and reserved-stock violations without writes', async () => {
  const csv = 'sku,name,brand,category,price,moq,stock\nDUP,First,JBL,Gift Sets & Hampers,100,10,50\nDUP,Second,JBL,Drinkware,100,10,50\nBAD,Other,Milton,Drinkware,-5,0,50\nJBLFLIP6BLK,Existing,JBL,Bluetooth Speakers,10250,10,1';
  const before = await database(), result = await request('/api/dealer/import/preview', { csv }, supplier);
  assert.equal(result.status, 200); assert.equal(result.data.valid, false); assert.ok(result.data.rows[1].errors.some(error => error.includes('Duplicate')));
  assert.ok(result.data.rows[2].errors.some(error => error.includes('authorization'))); assert.ok(result.data.rows[3].errors.some(error => error.includes('sold')));
  assert.deepEqual((await database()).products, before.products);
  assert.equal((await request('/api/dealer/import/commit', { previewId: result.data.previewId }, supplier)).status, 409);
  assert.equal((await request('/api/dealer/import/preview', { csv }, buyer)).status, 403);
  assert.equal((await request('/api/dealer/import/preview', { csv }, pending)).status, 403);
  assert.equal((await request('/api/dealer/import/preview', { csv })).status, 401);
});
test('CSV commit rechecks holds; subsequent imports update the same SKU and retries do not duplicate rows', async () => {
  const csv = 'sku,name,brand,category,price,moq,stock\nJBLFLIP6BLK,Flip 6 Portable Bluetooth Speaker,JBL,Bluetooth Speakers,10250,10,100';
  const preview = (await request('/api/dealer/import/preview', { csv }, supplier)).data; assert.equal(preview.valid, true);
  const reservation = (await request('/api/reservations', { productId: 'p-1', quantity: 60 }, buyer)).data.reservation; assert.ok(reservation);
  assert.equal((await request('/api/dealer/import/commit', { previewId: preview.previewId }, supplier)).status, 409);
  assert.equal((await database()).products.find(item => item.id === 'p-1').stock, 186);
  await request(`/api/reservations/${reservation.id}/status`, { status: 'Rejected' }, supplier);
  const ready = (await request('/api/dealer/import/preview', { csv }, supplier)).data;
  const results = await Promise.all([request('/api/dealer/import/commit', { previewId: ready.previewId }, supplier), request('/api/dealer/import/commit', { previewId: ready.previewId }, supplier)]);
  assert.ok(results.every(result => result.status === 200)); assert.equal(results[0].data.report.id, results[1].data.report.id);
  const again = (await request('/api/dealer/import/preview', { csv }, supplier)).data; assert.equal(again.updateCount, 1);
  await request('/api/dealer/import/commit', { previewId: again.previewId }, supplier);
  const data = await database(), product = data.products.find(item => item.id === 'p-1');
  assert.equal(data.products.filter(item => item.dealerId === 'dealer-1' && item.sku === 'JBLFLIP6BLK').length, 1);
  assert.equal(product.stock, 100); assert.equal(product.sold, 38); assert.equal(product.stockSource, 'csv');
  assert.ok(data.reservations.some(item => item.id === 'RES-2609-1024' && item.status === 'Reserved'));
});
test('Supplier specifications, CSV-created products and combined filters preserve private pricing and ownership', async () => {
  const csv = 'sku,name,brand,model,category,price,moq,stock,material,warehouseLocation,customizationMethods,brandingMoq,brandingCost,leadDays,occasions,sustainabilityTags,deliveryLocations\nPHASE1-DEMO,Gift Speaker Kit,JBL,KIT-A,Gift Sets & Hampers,1000,10,100,Aluminium,Bengaluru,Laser engraving,20,35,4,Onboarding,Reusable,Bengaluru | Mumbai';
  const preview = (await request('/api/dealer/import/preview', { csv }, supplier)).data; assert.equal(preview.valid, true);
  const imported = await request('/api/dealer/import/commit', { previewId: preview.previewId }, supplier); assert.equal(imported.data.report.created, 1);
  const product = (await request('/api/catalog?q=PHASE1-DEMO', null, buyer)).data.products[0]; assert.equal(product.material, 'Aluminium'); assert.equal(product.brandingCost, 35); assert.equal(product.stockFreshness.source, 'csv');
  const beforeTimestamp = product.stockFreshness.updatedAt;
  const edited = await request('/api/dealer/product-details', { productId: product.id, capacity: '1 kit', colors: 'Black | Blue', price: 1, dealerId: 'dealer-2', verified: true }, supplier); assert.equal(edited.status, 200);
  assert.equal(edited.data.product.price, 1000); assert.equal(edited.data.product.dealerId, 'dealer-1'); assert.equal(edited.data.product.stockFreshness.updatedAt, beforeTimestamp);
  assert.equal((await request('/api/dealer/product-details', { productId: 'p-3', material: 'Fake' }, supplier)).status, 404);
  assert.equal((await request('/api/dealer/product-details', { productId: product.id, sku: 'JBLFLIP6BLK' }, supplier)).status, 400);
  const query = '?q=PHASE1-DEMO&category=Gift%20Sets%20%26%20Hampers&brand=JBL&city=Bengaluru&warehouse=Bengaluru&minPrice=500&maxPrice=1200&maxMoq=20&quantity=50&material=aluminium&customization=Laser%20engraving&occasion=Onboarding&sustainability=Reusable&delivery=Mumbai&maxLeadDays=5';
  const filtered = (await request('/api/catalog' + query, null, buyer)).data.products;
  assert.equal(filtered.length, 1); assert.equal(filtered[0].id, product.id);
  assert.equal((await request('/api/catalog' + query.replace('quantity=50', 'quantity=101'), null, buyer)).data.products.length, 0);
  assert.equal((await request('/api/catalog' + query.replace('quantity=50', 'quantity=5'), null, buyer)).data.products.length, 0);
  assert.equal((await request('/api/catalog' + query.replace('maxLeadDays=5', 'maxLeadDays=3'), null, buyer)).data.products.length, 0);
  const privateProduct = (await request('/api/catalog?q=PHASE1-DEMO', null, supplier)).data.products[0]; assert.equal(privateProduct.price, null); assert.equal(privateProduct.brandingCost, null); assert.equal(privateProduct.stockImportId, undefined);
  assert.equal((await request('/api/catalog?q=PHASE1-DEMO')).data.products.length, 0);
  const all = (await request('/api/catalog', null, buyer)).data.products;
  assert.deepEqual(filterProducts(all, Object.fromEntries(new URLSearchParams(query.slice(1)))).map(item => item.id), filtered.map(item => item.id));
});
test('Invalid stock price never mutates inventory; stock confirmation records a manual timestamp', async () => {
  const before = (await database()).products.find(item => item.id === 'p-2');
  assert.equal((await request('/api/dealer/stock', { productId: 'p-2', stock: 100, price: 'invalid' }, supplier)).status, 400);
  assert.deepEqual((await database()).products.find(item => item.id === 'p-2'), before);
  const response = await request('/api/dealer/stock', { productId: 'p-2', stock: before.stock, price: before.price }, supplier);
  assert.equal(response.status, 200); assert.equal(response.data.product.stockFreshness.source, 'manual'); assert.equal(response.data.product.stockFreshness.status, 'recent');
});
test('CSV commits reject revisions changed after preview', async () => {
  const csv = 'sku,name,brand,category,price,moq,stock\n910-006929,MX Anywhere 3S Wireless Mouse,Logitech,IT & Computer Accessories,6350,10,74';
  const preview = (await request('/api/dealer/import/preview', { csv }, supplier)).data;
  assert.equal(preview.valid, true);
  await request('/api/dealer/product-details', { productId: 'p-2', material: 'Supplier corrected specification' }, supplier);
  const commit = await request('/api/dealer/import/commit', { previewId: preview.previewId }, supplier);
  assert.equal(commit.status, 409); assert.match(commit.data.error, /changed since this preview/);
  assert.equal((await database()).products.find(item => item.id === 'p-2').material, 'Supplier corrected specification');
});
test('CSV commit revalidates expired/revoked brand authorization and preview ownership', async () => {
  let authorized = true, actor = { id: 'supplier-a' }, response;
  const dealer = { id: 'dealer-a' };
  const store = { products: [], categories: ['Gift Sets & Hampers'], reservations: [], enquiries: [], users: [], dealers: [dealer], notifications: [] };
  const handler = createSourcingHandler({ store, requireUser: () => actor, dealerFor: () => dealer, brandAuthorizationValid: () => authorized, activeStatuses: new Set(), safeProduct: product => product, send: (_, status, data) => { response = { status, data }; }, persist: async () => {}, addNotification: () => {} });
  await handler({ method: 'POST' }, {}, '/api/dealer/import/preview', { csv: 'sku,name,brand,category,price,moq,stock\nA,Demo kit,JBL,Gift Sets & Hampers,100,10,20' });
  const id = response.data.previewId; assert.equal(response.data.valid, true);
  actor = { id: 'supplier-b' }; await handler({ method: 'POST' }, {}, '/api/dealer/import/commit', { previewId: id }); assert.equal(response.status, 409);
  actor = { id: 'supplier-a' }; authorized = false; await handler({ method: 'POST' }, {}, '/api/dealer/import/commit', { previewId: id });
  assert.equal(response.status, 409); assert.ok(response.data.rows[0].errors.some(error => error.includes('authorization'))); assert.equal(store.products.length, 0);
});
