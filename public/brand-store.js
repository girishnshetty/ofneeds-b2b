const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const sameBrand = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export function brandStoreURL(brand, supplierId = '') {
  return `#store/${encodeURIComponent(brand)}${supplierId ? `?supplier=${encodeURIComponent(supplierId)}` : ''}`;
}
export function parseBrandStoreRoute(hash) {
  const route = String(hash).replace(/^#/, '');
  if (!route.toLowerCase().startsWith('store/')) return null;
  try {
    const [encodedBrand, query = ''] = route.slice(6).split('?');
    const storeBrand = decodeURIComponent(encodedBrand).trim();
    const storeSupplierId = new URLSearchParams(query).get('supplier') || '';
    if (!storeBrand || storeBrand.length > 80 || storeSupplierId.length > 100) return null;
    return { page: 'brand-store', storeBrand, storeSupplierId };
  } catch { return null; }
}
export function selectBrandProducts(products, brand, supplierId = '') {
  return products.filter(product => sameBrand(product.brand, brand) && (!supplierId || product.dealerId === supplierId) && product.active !== false && product.dealer?.verified);
}
export function renderBrandStore({ brand, supplierId = '', catalogAccess, products, dealers, sort = 'featured' }, productCard) {
  const brandLink = `<a href="${esc(brandStoreURL(brand))}" data-action="brand-store" data-brand="${esc(brand)}">${esc(brand)}</a>`;
  const supplier = dealers.find(dealer => dealer.id === supplierId);
  const title = supplierId && supplier ? `${brand} at ${supplier.businessName}` : `${brand} store`;
  const breadcrumb = `<nav class="store-breadcrumb" aria-label="Store navigation"><a href="#products" data-page="products">All products</a><span aria-hidden="true">/</span>${supplierId ? brandLink : `<span>${esc(brand)}</span>`}${supplierId && supplier ? `<span aria-hidden="true">/</span><span>${esc(supplier.businessName)}</span>` : ''}</nav>`;
  if (!catalogAccess) return `<main class="page-wrap brand-store-page">${breadcrumb}<header class="page-header"><span class="section-kicker">Brand store</span><h1>${esc(brand)} store</h1><p>Sign in with an approved business account to see this brand’s supplier listings and available stock. Wholesale prices require a GST-verified buyer account.</p><button class="btn btn-primary" data-action="login">Sign in to view store</button></header></main>`;
  const listings = selectBrandProducts(products, brand, supplierId);
  if (sort === 'price-low') listings.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  if (sort === 'price-high') listings.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
  if (sort === 'stock') listings.sort((a, b) => b.available - a.available);
  const suppliers = dealers.filter(dealer => dealer.verified && (!supplierId || dealer.id === supplierId) && dealer.brands?.some(name => sameBrand(name, brand)));
  const groups = suppliers.map(dealer => ({ dealer, products: listings.filter(product => product.dealerId === dealer.id) }));
  return `<main class="page-wrap brand-store-page">${breadcrumb}<header class="store-hero"><div><span class="section-kicker">${supplierId ? 'Supplier brand store' : 'Brand store'}</span><h1>${esc(title)}</h1><p>Explore all ${esc(brand)} products listed by ${supplierId ? 'this supplier' : 'authorized suppliers'}. Each listing shows its own stock, MOQ and buyer price.</p><div class="store-metrics"><span><strong>${listings.length}</strong> ${listings.length === 1 ? 'product' : 'products'}</span><span><strong>${suppliers.length}</strong> ${suppliers.length === 1 ? 'supplier' : 'suppliers'}</span></div></div><div class="store-sort"><label for="sort-store-products">Sort products</label><select id="sort-store-products" class="sort-select"><option value="featured" ${sort === 'featured' ? 'selected' : ''}>Featured</option><option value="price-low" ${sort === 'price-low' ? 'selected' : ''}>Price: Low to high</option><option value="price-high" ${sort === 'price-high' ? 'selected' : ''}>Price: High to low</option><option value="stock" ${sort === 'stock' ? 'selected' : ''}>Stock available</option></select></div></header>${groups.length ? groups.map(group => `<section class="store-supplier" aria-labelledby="store-${esc(group.dealer.id)}"><header class="store-supplier-head"><div><span class="section-kicker">Brand authorization reviewed</span><h2 id="store-${esc(group.dealer.id)}">${esc(group.dealer.businessName)}</h2><p>${esc(group.dealer.city)}${group.dealer.state ? `, ${esc(group.dealer.state)}` : ''} · ${group.products.length} ${esc(brand)} ${group.products.length === 1 ? 'product' : 'products'}</p></div><div class="store-supplier-actions"><button class="btn btn-outline btn-sm" data-action="supplier-profile" data-id="${esc(group.dealer.id)}">Supplier profile</button>${!supplierId ? `<a class="btn btn-outline btn-sm" href="${esc(brandStoreURL(brand, group.dealer.id))}" data-action="brand-store" data-brand="${esc(brand)}" data-supplier="${esc(group.dealer.id)}">Open supplier store ↗</a>` : ''}<button class="btn btn-outline btn-sm" data-action="contact" data-dealer="${esc(group.dealer.id)}">Contact supplier</button></div></header>${group.products.length ? `<div class="product-grid store-products">${group.products.map(productCard).join('')}</div>` : `<div class="empty-products"><strong>No ${esc(brand)} products listed by this supplier yet</strong>Contact the supplier to ask about its upcoming catalog.</div>`}</section>`).join('') : `<section class="empty-products"><strong>${supplierId ? 'This supplier does not currently have authorized supply for this brand' : `No authorized ${esc(brand)} supply is listed yet`}</strong>Only supplier-published products appear here. <a href="#brands" data-page="brands" class="text-link">Explore other brands →</a></section>`}</main>`;
}
