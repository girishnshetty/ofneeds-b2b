// Shared by the browser and server so combined filters have identical semantics.
export const CATEGORY_ALIASES = { 'Backpacks & Bags': 'Bags & Backpacks', 'Audio & Headphones': 'Headphones & Earbuds', 'Smart Devices': 'Electronics', 'Gift Hampers': 'Gift Sets & Hampers', 'Caps': 'Caps & Headwear', 'Trophies': 'Awards & Trophies' };
export const normalizeCategory = value => CATEGORY_ALIASES[value] || value;
export const GIFTING_CATEGORIES = ['Gift Sets & Hampers', 'Caps & Headwear', 'Awards & Trophies', 'Eco-friendly Gifts', 'Desk Accessories', 'Packaging & Gift Boxes'];
export const CUSTOMIZATION_METHODS = ['Screen print', 'Laser engraving', 'Embroidery', 'UV print', 'Pad print', 'Digital print', 'Debossing', 'Sublimation'];
export const OCCASIONS = ['Onboarding', 'Employee appreciation', 'Client gifts', 'Events', 'Festive gifting'];
export const SUSTAINABILITY_TAGS = ['Recycled materials', 'Reusable', 'Plastic-free packaging', 'Responsibly sourced'];
export const SPEC_TEXT_FIELDS = ['sku', 'material', 'dimensions', 'weight', 'capacity', 'warehouseLocation'];
export const SPEC_LIST_FIELDS = ['colors', 'sizes', 'customizationMethods', 'occasions', 'sustainabilityTags', 'deliveryLocations'];
export const SPEC_NUMBER_FIELDS = ['brandingMoq', 'brandingCost', 'brandingLeadDays', 'leadDays'];
export const listValues = value => [...new Set((Array.isArray(value) ? value : String(value || '').split('|')).map(item => String(item).trim()).filter(Boolean))];
export function stockFreshness(product, now = Date.now()) {
  const timestamp = product.stockUpdatedAt;
  const valid = timestamp && Number.isFinite(Date.parse(timestamp)) && Date.parse(timestamp) <= now;
  return { source: ['manual', 'csv', 'demo'].includes(product.stockSource) ? product.stockSource : 'unknown', updatedAt: valid ? timestamp : null, status: !valid ? 'unknown' : now - Date.parse(timestamp) > 7 * 86400000 ? 'stale' : 'recent' };
}
const text = value => String(value || '').trim().toLowerCase();
export function filterProducts(products, filters = {}) {
  const q = text(filters.q ?? filters.query);
  const quantity = Number(filters.quantity || 0);
  return products.filter(product => {
    const search = [product.name, product.brand, product.model, product.sku, normalizeCategory(product.category), product.material, product.warehouseLocation, product.dealer?.businessName, product.dealer?.city].map(text).join(' ');
    return (!q || search.includes(q)) &&
      (!filters.category || normalizeCategory(product.category) === normalizeCategory(filters.category)) &&
      (!filters.brand || text(product.brand) === text(filters.brand)) &&
      (!filters.city || text(product.dealer?.city) === text(filters.city)) &&
      (!filters.warehouse || text(product.warehouseLocation).includes(text(filters.warehouse))) &&
      (filters.minPrice === '' || filters.minPrice == null || product.price == null || product.price >= Number(filters.minPrice)) &&
      (filters.maxPrice === '' || filters.maxPrice == null || product.price == null || product.price <= Number(filters.maxPrice)) &&
      (!filters.maxMoq || product.moq <= Number(filters.maxMoq)) &&
      (!quantity || (Number.isInteger(quantity) && quantity >= product.moq && product.available >= quantity)) &&
      (!(filters.inStock === true || filters.inStock === 'true') || product.available > 0) &&
      (!filters.material || text(product.material).includes(text(filters.material))) &&
      (!filters.customization || listValues(product.customizationMethods).some(value => text(value) === text(filters.customization))) &&
      (!filters.occasion || listValues(product.occasions).includes(filters.occasion)) &&
      (!filters.sustainability || listValues(product.sustainabilityTags).includes(filters.sustainability)) &&
      (!filters.delivery || listValues(product.deliveryLocations).some(value => text(value).includes(text(filters.delivery)))) &&
      (!filters.maxLeadDays || (product.leadDays != null && product.leadDays <= Number(filters.maxLeadDays)));
  });
}
