import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brandStoreURL, parseBrandStoreRoute, selectBrandProducts, renderBrandStore } from '../public/brand-store.js';

const dealers = [
  { id: 'dealer-a', businessName: 'First supplier', city: 'Bengaluru', verified: true, brands: ['JBL', 'Logitech'] },
  { id: 'dealer-b', businessName: 'Second supplier', city: 'Mumbai', verified: true, brands: ['JBL'] },
  { id: 'dealer-empty', businessName: 'No listings supplier', city: 'Delhi', verified: true, brands: ['JBL'] }
];
const products = [
  { id: 'a1', name: 'Speaker One', brand: 'JBL', dealerId: 'dealer-a', dealer: { verified: true }, available: 10, price: 1000 },
  { id: 'a2', name: 'Speaker Two', brand: 'JBL', dealerId: 'dealer-a', dealer: { verified: true }, available: 0, price: 2000 },
  { id: 'b1', name: 'Other supplier speaker', brand: 'JBL', dealerId: 'dealer-b', dealer: { verified: true }, available: 20, price: 900 },
  { id: 'mouse', brand: 'Logitech', dealerId: 'dealer-a', dealer: { verified: true } },
  { id: 'hidden', brand: 'JBL', dealerId: 'dealer-a', dealer: { verified: false } },
  { id: 'inactive', brand: 'JBL', dealerId: 'dealer-a', dealer: { verified: true }, active: false }
];

test('Brand store deep links preserve brand names, supplier scope and encoded special characters', () => {
  const url = brandStoreURL('Jack & Jones', 'supplier/a');
  assert.deepEqual(parseBrandStoreRoute(url), { page: 'brand-store', storeBrand: 'Jack & Jones', storeSupplierId: 'supplier/a' });
  assert.deepEqual(parseBrandStoreRoute('#store/boAt'), { page: 'brand-store', storeBrand: 'boAt', storeSupplierId: '' });
  assert.equal(parseBrandStoreRoute('#store/%E0%A4%A'), null);
  assert.equal(parseBrandStoreRoute('#store/'), null);
  assert.equal(parseBrandStoreRoute('#products'), null);
});
test('Brand stores select every active authorized product, retain zero stock and keep suppliers separate', () => {
  assert.deepEqual(selectBrandProducts(products, 'jbl').map(product => product.id), ['a1', 'a2', 'b1']);
  assert.deepEqual(selectBrandProducts(products, 'JBL', 'dealer-a').map(product => product.id), ['a1', 'a2']);
  assert.deepEqual(selectBrandProducts(products, 'JBL', 'dealer-b').map(product => product.id), ['b1']);
  assert.deepEqual(selectBrandProducts(products, 'JBL', 'missing'), []);
});
test('Store rendering groups products per seller and ignores unrelated catalog filters', () => {
  const rendered = [];
  const html = renderBrandStore({ brand: 'JBL', catalogAccess: true, products, dealers, sort: 'price-low' }, product => { rendered.push(product.id); return `<article>${product.name} · ${product.available} units · ₹${product.price}</article>`; });
  assert.deepEqual(rendered, ['a1', 'a2', 'b1']);
  assert.match(html, /First supplier/); assert.match(html, /Second supplier/);
  assert.match(html, /Speaker Two · 0 units · ₹2000/);
  assert.match(html, /No JBL products listed by this supplier yet/);
  const scoped = [];
  renderBrandStore({ brand: 'JBL', supplierId: 'dealer-a', catalogAccess: true, products, dealers }, product => { scoped.push(product.id); return ''; });
  assert.deepEqual(scoped, ['a1', 'a2']);
});
test('Gated and empty brand stores do not invent or disclose product prices or supplier details', () => {
  const gated = renderBrandStore({ brand: 'JBL', catalogAccess: false, products, dealers }, () => { throw new Error('Private products should not render'); });
  assert.match(gated, /Sign in to view store/); assert.ok(!gated.includes('1000')); assert.ok(!gated.includes('First supplier'));
  const empty = renderBrandStore({ brand: 'Unlisted brand', catalogAccess: true, products, dealers }, () => { throw new Error('Unrelated product should not render'); });
  assert.match(empty, /No authorized Unlisted brand supply is listed yet/);
  const escaped = renderBrandStore({ brand: '<img onerror=alert(1)>', catalogAccess: false, products, dealers }, () => '');
  assert.ok(!escaped.includes('<img')); assert.ok(escaped.includes('&lt;img'));
});
