import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { decodeProductPhoto, deliverEmail, makeRecoveryToken, tokenHash } from './marketplace-services.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const DATA_DIR = join(ROOT, 'data');
const DATA_FILE = join(DATA_DIR, 'marketplace.json');
const UPLOAD_DIR = join(DATA_DIR, 'documents');
const PHOTO_DIR = join(DATA_DIR, 'product-images');
const SITE_URL = (() => { try { const url = new URL(process.env.SITE_URL); return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)) ? url.origin : ''; } catch { return ''; } })();
const EMAIL_READY = Boolean(process.env.MAIL_GATEWAY_URL && process.env.MAIL_GATEWAY_TOKEN && process.env.MAIL_FROM);
const DEMO_MODE = process.env.DEMO_MODE !== 'false';
const policyURL = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
const BRAND_DIRECTORY = JSON.parse(readFileSync(join(ROOT, 'catalog', 'brands.json'), 'utf8'));
const CATEGORY_DIRECTORY = ['Electronics', 'Mobile Accessories', 'IT & Computer Accessories', 'Smart Watches', 'Watches', 'Bluetooth Speakers', 'Headphones & Earbuds', 'Audio & Headphones', 'Home Appliances', 'Kitchen Appliances', 'Drinkware', 'Backpacks & Bags', 'Bags & Backpacks', 'Trolleys & Luggage', 'Corporate Apparel', 'T-shirts & Polos', 'Footwear', 'Office Stationery', 'Lifestyle Products', 'Travel Accessories', 'Premium Gifting', 'Promotional Products', 'Personal Care & Wellness', 'Sports & Fitness', 'Eyewear', 'Smart Devices', 'Cameras'];
const normalizeCategory = category => ({ 'Backpacks & Bags': 'Bags & Backpacks', 'Audio & Headphones': 'Headphones & Earbuds', 'Smart Devices': 'Electronics' })[category] || category;
const PORT = Number(process.env.PORT || 4173);
const sessions = new Map();
const requestLimits = new Map();
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };

const hashPassword = (password, salt = randomBytes(16).toString('hex')) => ({ salt, hash: scryptSync(password, salt, 64).toString('hex') });
const passwordMatches = (password, user) => {
  const actual = scryptSync(password, user.password.salt, 64);
  const expected = Buffer.from(user.password.hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

function seedStore() {
  const now = new Date().toISOString();
  const dealers = [
    { id: 'dealer-1', businessName: 'Peak Supply Co.', contactName: 'Arjun Mehta', email: 'sales@peaksupply.in', phone: '+91 98765 43210', city: 'Bengaluru', state: 'Karnataka', pin: '560001', address: '12 Residency Road, Bengaluru, Karnataka 560001', website: 'peaksupply.in', verified: true, brands: ['JBL', 'Logitech', 'boAt'], type: 'Authorized Distributor' },
    { id: 'dealer-2', businessName: 'Westbridge Distributors', contactName: 'Riya Shah', email: 'hello@westbridge.in', phone: '+91 98200 11223', city: 'Mumbai', state: 'Maharashtra', pin: '400001', address: '42 Fort, Mumbai, Maharashtra 400001', website: 'westbridge.in', verified: true, brands: ['Milton', 'Parker', 'Wildcraft'], type: 'Authorized Dealer' },
    { id: 'dealer-3', businessName: 'Northstar Brand House', contactName: 'Karan Malhotra', email: 'trade@northstar.in', phone: '+91 98100 77889', city: 'New Delhi', state: 'Delhi', pin: '110001', address: '18 Connaught Place, New Delhi 110001', website: 'northstar.in', verified: true, brands: ['HP', 'Samsung', 'Philips'], type: 'Authorized Distributor' },
    { id: 'dealer-4', businessName: 'Orion Corporate Goods', contactName: 'Nisha Rao', email: 'orders@oriongoods.in', phone: '+91 94480 33445', city: 'Hyderabad', state: 'Telangana', pin: '500001', address: '6 Banjara Hills, Hyderabad, Telangana 500001', website: 'oriongoods.in', verified: true, brands: ['American Tourister', 'Noise'], type: 'Authorized Dealer' }
  ];
  const products = [
    { id: 'p-1', name: 'Flip 6 Portable Bluetooth Speaker', brand: 'JBL', model: 'JBLFLIP6BLK', category: 'Bluetooth Speakers', dealerId: 'dealer-1', mrp: 14999, price: 10250, gst: 18, hsn: '85182100', moq: 10, stock: 186, sold: 38, minStock: 20, leadTime: '3–5 days', warranty: '1 year manufacturer warranty', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85', color: '#eef2ff', updatedAt: now, description: 'Powerful JBL sound with 12 hours of playtime. A compact, memorable gift for teams and clients.', tiers: [{ min: 10, max: 49, price: 10250 }, { min: 50, max: 99, price: 9875 }, { min: 100, max: 9999, price: 9500 }] },
    { id: 'p-2', name: 'MX Anywhere 3S Wireless Mouse', brand: 'Logitech', model: '910-006929', category: 'IT & Computer Accessories', dealerId: 'dealer-1', mrp: 8995, price: 6350, gst: 18, hsn: '84716060', moq: 10, stock: 74, sold: 16, minStock: 15, leadTime: '2–4 days', warranty: '1 year limited hardware warranty', image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=85', color: '#f1f5f9', updatedAt: now, description: 'Precision tracking and quiet clicks in a travel-ready premium mouse.', tiers: [{ min: 10, max: 49, price: 6350 }, { min: 50, max: 9999, price: 5980 }] },
    { id: 'p-3', name: 'Hydra Stainless Steel Bottle, 1L', brand: 'Milton', model: 'HYDRA1000', category: 'Drinkware', dealerId: 'dealer-2', mrp: 1599, price: 970, gst: 18, hsn: '73239390', moq: 25, stock: 420, sold: 120, minStock: 50, leadTime: '4–7 days', warranty: '1 year warranty', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85', color: '#f0fdfa', updatedAt: now, description: 'Double-wall insulated stainless steel bottle with a leak-proof lid.', tiers: [{ min: 25, max: 99, price: 970 }, { min: 100, max: 499, price: 900 }, { min: 500, max: 9999, price: 850 }] },
    { id: 'p-4', name: 'Essential 25L Laptop Backpack', brand: 'Wildcraft', model: 'WIKI25BLK', category: 'Bags & Backpacks', dealerId: 'dealer-2', mrp: 2999, price: 1840, gst: 18, hsn: '42029200', moq: 20, stock: 32, sold: 61, minStock: 25, leadTime: '5–8 days', warranty: '1 year warranty', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85', color: '#fef3e8', updatedAt: now, description: 'Everyday 25L backpack with padded laptop compartment and water-resistant fabric.', tiers: [{ min: 20, max: 99, price: 1840 }, { min: 100, max: 9999, price: 1725 }] },
    { id: 'p-5', name: 'Galaxy Buds FE True Wireless', brand: 'Samsung', model: 'SM-R400NZ', category: 'Headphones & Earbuds', dealerId: 'dealer-3', mrp: 9999, price: 5990, gst: 18, hsn: '85183000', moq: 15, stock: 96, sold: 42, minStock: 20, leadTime: '3–6 days', warranty: '1 year manufacturer warranty', image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=85', color: '#f5f3ff', updatedAt: now, description: 'Comfort-fit noise-cancelling earbuds with a powerful, balanced sound profile.', tiers: [{ min: 15, max: 49, price: 5990 }, { min: 50, max: 9999, price: 5650 }] },
    { id: 'p-6', name: 'Smart Watch ColorFit Pulse 4', brand: 'Noise', model: 'NCPULSE4BLK', category: 'Smart Watches', dealerId: 'dealer-4', mrp: 4999, price: 2240, gst: 18, hsn: '91021200', moq: 20, stock: 112, sold: 75, minStock: 18, leadTime: '4–6 days', warranty: '1 year warranty', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85', color: '#fdf2f8', updatedAt: now, description: 'A bright AMOLED display and health tracking in a sleek everyday smartwatch.', tiers: [{ min: 20, max: 99, price: 2240 }, { min: 100, max: 9999, price: 2090 }] },
    { id: 'p-7', name: 'Parker Jotter Stainless Steel Pen', brand: 'Parker', model: 'PARKER-JOT-SS', category: 'Office Stationery', dealerId: 'dealer-2', mrp: 950, price: 565, gst: 18, hsn: '96081019', moq: 50, stock: 680, sold: 244, minStock: 100, leadTime: '2–5 days', warranty: '2 year international warranty', image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=900&q=85', color: '#ecfdf5', updatedAt: now, description: 'An enduring design icon, presented in a gift-ready premium box.', tiers: [{ min: 50, max: 199, price: 565 }, { min: 200, max: 999, price: 530 }, { min: 1000, max: 9999, price: 495 }] },
    { id: 'p-8', name: 'Pavilion Aero 13 Laptop Sleeve', brand: 'HP', model: '7XG12PA', category: 'IT & Computer Accessories', dealerId: 'dealer-3', mrp: 2499, price: 1380, gst: 18, hsn: '42029200', moq: 15, stock: 61, sold: 53, minStock: 15, leadTime: '5–8 days', warranty: '6 months warranty', image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=900&q=85', color: '#eff6ff', updatedAt: now, description: 'Slim, padded sleeve designed to protect laptops during the daily commute.', tiers: [{ min: 15, max: 49, price: 1380 }, { min: 50, max: 9999, price: 1280 }] }
  ];
  const categories = CATEGORY_DIRECTORY;
  const users = [
    { id: 'admin-1', role: 'admin', name: 'OfNeeds Admin', email: 'admin@ofneeds.in', companyName: 'OfNeeds', mobile: '+91 70907 95666', status: 'approved', gstin: '29AAACO1234F1Z5', password: hashPassword('Admin@1234') },
    { id: 'buyer-1', role: 'buyer', name: 'Ananya Iyer', email: 'buyer@ofneeds.in', companyName: 'Northstar Gifting Co.', mobile: '+91 98450 11122', status: 'approved', gstStatus: 'verified', gstin: '29AAACN1234F1Z2', city: 'Bengaluru', savedProducts: ['p-1', 'p-3'], password: hashPassword('Buyer@1234') },
    { id: 'dealer-user-1', role: 'dealer', name: 'Arjun Mehta', email: 'dealer@ofneeds.in', companyName: 'Peak Supply Co.', mobile: '+91 98765 43210', status: 'approved', dealerId: 'dealer-1', password: hashPassword('Dealer@1234') },
    { id: 'pending-1', role: 'buyer', name: 'Sana Kapoor', email: 'sana@brightbox.in', companyName: 'Brightbox Experiences', mobile: '+91 98111 22000', status: 'pending', gstStatus: 'pending', gstin: '07AAACB1234F1Z5', city: 'New Delhi', password: hashPassword('Company@1234') },
    { id: 'pending-2', role: 'dealer', name: 'Dev Malhotra', email: 'dev@urbanwares.in', companyName: 'Urban Wares India', mobile: '+91 98100 22100', status: 'pending', dealerType: 'Wholesaler', brand: 'boAt', city: 'New Delhi', gstin: '07AAACU1234F1Z7', password: hashPassword('Dealer@1234') }
  ];
  const authorizations = dealers.flatMap(dealer => dealer.brands.map(brand => ({ id: randomUUID(), dealerId: dealer.id, brand, status: 'verified', validFrom: now, validUntil: new Date(Date.now() + 365 * 86400000).toISOString(), verifiedAt: now })));
  return {
    version: 1, users, dealers, products, categories, authorizations, brandDirectory: BRAND_DIRECTORY,
    reservations: [{ id: 'RES-2609-1024', productId: 'p-1', dealerId: 'dealer-1', buyerId: 'buyer-1', quantity: 20, status: 'Reserved', createdAt: new Date(Date.now() - 1000 * 60 * 23).toISOString(), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 23).toISOString(), deliveryLocation: 'Bengaluru, Karnataka', remarks: 'Welcome kits for October onboarding' }],
    enquiries: [{ id: 'RFQ-2609-0092', buyerId: 'buyer-1', productId: 'p-3', dealerId: 'dealer-2', quantity: 250, status: 'Quote received', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), deliveryDate: '2026-10-15', deliveryLocation: 'Bengaluru, Karnataka', notes: 'Please include logo printing options', quote: { price: 875, gst: 18, delivery: 0, leadTime: '7–9 working days', validity: '7 days' } }],
    notifications: [{ id: randomUUID(), userId: 'buyer-1', text: 'Westbridge Distributors shared a quote for Milton Hydra Bottle.', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() }],
    createdAt: now
  };
}

mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, JSON.stringify(DEMO_MODE ? seedStore() : { users: [], dealers: [], products: [], categories: CATEGORY_DIRECTORY, authorizations: [], brandDirectory: BRAND_DIRECTORY, reservations: [], enquiries: [], notifications: [] }, null, 2));
let store = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
if (!DEMO_MODE && store.users.some(user => ['admin-1','buyer-1','dealer-user-1','pending-1','pending-2'].includes(user.id))) throw new Error('Production mode requires a separate marketplace data store without demonstration accounts. Keep the local preview data intact.');
store.authorizations ||= [];
const needsAuthorizationSeed = store.authorizations.length === 0 && store.dealers?.some(dealer => dealer.verified && dealer.brands?.length);
if (needsAuthorizationSeed) store.authorizations = store.dealers.flatMap(dealer => dealer.verified ? dealer.brands.map(brand => ({ id: randomUUID(), dealerId: dealer.id, brand, status: 'verified', validFrom: new Date().toISOString(), validUntil: new Date(Date.now() + 365 * 86400000).toISOString(), verifiedAt: new Date().toISOString() })) : []);
const needsBrandDirectorySeed = !Array.isArray(store.brandDirectory) || store.brandDirectory.length === 0;
if (needsBrandDirectorySeed) store.brandDirectory = BRAND_DIRECTORY;
const priorCategories = Array.isArray(store.categories) ? store.categories : [];
store.categories = [...new Set([...CATEGORY_DIRECTORY, ...priorCategories])];
const needsCategorySeed = store.categories.length !== priorCategories.length;
let writeQueue = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(store, null, 2);
  writeQueue = writeQueue.then(() => new Promise((resolve, reject) => {
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    try { writeFileSync(tmp, snapshot); renameSync(tmp, DATA_FILE); resolve(); } catch (error) { reject(error); }
  }));
  return writeQueue;
}
if (needsAuthorizationSeed || needsBrandDirectorySeed || needsCategorySeed) persist().catch(error => console.error('Could not seed marketplace catalog', error));
const cleanUser = ({ password, recovery, ...user }) => ({ ...user, documents: user.documents?.map(({ storageName, ...doc }) => doc) });
function saveProductPhoto(product, photo) {
  const decoded = decodeProductPhoto(photo); mkdirSync(PHOTO_DIR, { recursive: true });
  const file = `${randomUUID()}${decoded.extension}`; writeFileSync(join(PHOTO_DIR, file), decoded.bytes);
  product.photo = { file, type: decoded.type, uploadedAt: new Date().toISOString() };
  product.image = `/api/catalog/images/${product.id}`;
}
function checkedImageURL(value) {
  if (!value) return '';
  try { const url = new URL(value); if (url.protocol === 'https:') return url.href; } catch {}
  throw new Error('Product image links must use HTTPS.');
}
function userFrom(req) {
  const token = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('ofneeds_session='))?.split('=')[1];
  const id = token && sessions.get(token);
  return id ? store.users.find(user => user.id === id) : null;
}
function requireUser(req, res, roles = []) {
  const user = userFrom(req);
  if (!user) { send(res, 401, { error: 'Sign in to continue.' }); return null; }
  if (user.status !== 'approved' || (user.role === 'buyer' && user.gstStatus !== 'verified')) { send(res, 403, { error: 'Your business account is awaiting verification.' }); return null; }
  if (roles.length && !roles.includes(user.role)) { send(res, 403, { error: 'Your account does not have access to this action.' }); return null; }
  return user;
}
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}
async function body(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 18_000_000) throw new Error('Request is too large.'); }
  return raw ? JSON.parse(raw) : {};
}
const slugId = prefix => `${prefix}-${randomUUID().slice(0, 8)}`;
const hasApprovedBuyer = user => user?.role === 'buyer' && user.status === 'approved' && user.gstStatus === 'verified';
const activeStatuses = new Set(['Requested', 'Awaiting Dealer Approval', 'Reserved', 'Confirmed']);
function available(product) {
  const held = store.reservations.filter(res => res.productId === product.id && activeStatuses.has(res.status)).reduce((sum, res) => sum + res.quantity, 0);
  return Math.max(0, product.stock - product.sold - held);
}
function expireReservations() {
  const now = Date.now(); let changed = false;
  for (const reservation of store.reservations) {
    if (activeStatuses.has(reservation.status) && Date.parse(reservation.expiresAt) <= now) { reservation.status = 'Expired'; changed = true; }
  }
  if (changed) persist().catch(error => console.error('Could not persist expired reservations', error));
}
function expireAuthorizations() {
  let changed = false;
  for (const authorization of store.authorizations) {
    if (authorization.status === 'verified' && authorization.validUntil && Date.parse(authorization.validUntil) <= Date.now()) { authorization.status = 'expired'; changed = true; }
  }
  for (const dealer of store.dealers) syncDealerAuthorizations(dealer);
  if (changed) persist().catch(error => console.error('Could not persist expired authorizations', error));
}
setInterval(() => { expireReservations(); expireAuthorizations(); }, 60_000).unref();
function addNotification(userId, text) { store.notifications.unshift({ id: randomUUID(), userId, text, read: false, createdAt: new Date().toISOString() }); }
function dealerFor(user) { return user?.dealerId ? store.dealers.find(dealer => dealer.id === user.dealerId) : store.dealers.find(dealer => dealer.email === user?.email); }
function brandAuthorizationValid(dealerId, brand) {
  const normalized = String(brand || '').trim().toLowerCase();
  if (!dealerId || !normalized) return false;
  if (!store.authorizations.length) {
    const dealer = store.dealers.find(item => item.id === dealerId);
    return !!dealer?.verified && dealer.brands?.some(item => item.toLowerCase() === normalized);
  }
  return store.authorizations.some(item => item.dealerId === dealerId && item.brand.toLowerCase() === normalized && item.status === 'verified' && (!item.validUntil || Date.parse(item.validUntil) > Date.now()));
}
function syncDealerAuthorizations(dealer) {
  const brands = [...new Set(store.authorizations.filter(item => item.dealerId === dealer.id && item.status === 'verified' && (!item.validUntil || Date.parse(item.validUntil) > Date.now())).map(item => item.brand))];
  dealer.brands = brands;
  dealer.verified = brands.length > 0;
}
function safeProduct(product, user) {
  const dealer = store.dealers.find(item => item.id === product.dealerId);
  const approvedBuyer = hasApprovedBuyer(user);
  const dealerOwnListing = user?.role === 'dealer' && dealerFor(user)?.id === dealer?.id;
  const maySeePrice = approvedBuyer || user?.role === 'admin' || dealerOwnListing;
  const maySeeContact = approvedBuyer || user?.role === 'admin' || dealerOwnListing;
  const brandAuthorized = brandAuthorizationValid(dealer?.id, product.brand);
  const safe = { ...product, photo: product.photo ? { uploadedAt: product.photo.uploadedAt } : undefined, category: normalizeCategory(product.category), available: available(product), lowStock: available(product) > 0 && available(product) <= product.minStock, dealer: dealer ? { id: dealer.id, businessName: dealer.businessName, city: dealer.city, state: dealer.state, verified: brandAuthorized, brands: dealer.brands, ...(maySeeContact ? { phone: dealer.phone, email: dealer.email, contactName: dealer.contactName, address: dealer.address, pin: dealer.pin, website: dealer.website } : {}) } : null };
  if (!maySeePrice) { safe.price = null; safe.mrp = null; safe.tiers = []; }
  return safe;
}
function safeCatalogProduct(product, user) {
  const safe = safeProduct(product, user);
  if (user?.role === 'dealer') { safe.price = null; safe.mrp = null; safe.tiers = []; }
  return safe;
}
function canBrowseCatalog(user) {
  if (hasApprovedBuyer(user) || (user?.role === 'admin' && user.status === 'approved')) return true;
  if (user?.role !== 'dealer' || user.status !== 'approved') return false;
  const dealer = dealerFor(user);
  return !!dealer?.brands?.some(brand => brandAuthorizationValid(dealer.id, brand));
}
const validateGstin = value => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(value || '');

async function handleApi(req, res, url) {
  expireReservations();
  expireAuthorizations();
  const path = url.pathname;
  let payload;
  try { if (!['GET', 'HEAD'].includes(req.method)) payload = await body(req); } catch (error) { return send(res, 400, { error: error.message || 'Invalid request.' }); }
  if (req.method === 'GET' && path === '/api/health') return send(res, 200, { status: 'ok' });
  if (req.method === 'GET' && path === '/api/config') return send(res, 200, { demoMode: DEMO_MODE, emailReady: EMAIL_READY, recoveryReady: EMAIL_READY && Boolean(SITE_URL), siteUrl: SITE_URL, privacyPolicyUrl: policyURL(process.env.PRIVACY_POLICY_URL), termsUrl: policyURL(process.env.TERMS_URL) });
  if (req.method === 'POST' && path === '/api/auth/forgot-password') {
    const email = String(payload.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: 'Enter a valid email address.' });
    if (!EMAIL_READY || !SITE_URL) return send(res, 503, { error: 'Email recovery is not connected yet. Request account assistance.' });
    const key = `recovery:${req.socket.remoteAddress}`, now = Date.now(); const recent = (requestLimits.get(key) || []).filter(time => now - time < 600000);
    if (recent.length >= 5) return send(res, 429, { error: 'Please wait 10 minutes before requesting another recovery email.' });
    requestLimits.set(key, [...recent, now]);
    const user = store.users.find(item => item.email.toLowerCase() === email);
    if (user) {
      const recovery = makeRecoveryToken(); user.recovery = { hash: recovery.hash, expiresAt: recovery.expiresAt }; await persist();
      try { await deliverEmail({ to: user.email, subject: 'Reset your OfNeeds password', text: `Open ${SITE_URL.replace(/\/$/, '')}/#reset/${recovery.token} to reset your password. This link expires in 30 minutes. If you did not request it, ignore this email.` }); } catch { user.recovery = undefined; await persist(); console.error('Recovery email could not be delivered.'); }
    }
    return send(res, 200, { message: 'If an account matches this email, a recovery link will be sent.' });
  }
  if (req.method === 'POST' && path === '/api/auth/reset-password') {
    const hash = tokenHash(String(payload.token || '')); const user = store.users.find(item => item.recovery?.hash === hash && Date.parse(item.recovery.expiresAt) > Date.now());
    if (!user) return send(res, 400, { error: 'This recovery link is invalid or expired. Request a new link.' });
    if (String(payload.password || '').length < 10) return send(res, 400, { error: 'Use a password of at least 10 characters.' });
    user.password = hashPassword(String(payload.password)); delete user.recovery;
    for (const [token, id] of sessions) if (id === user.id) sessions.delete(token);
    await persist(); return send(res, 200, { message: 'Password updated. Sign in with your new password.' });
  }
  if (req.method === 'POST' && path === '/api/requests') {
    const name = String(payload.name || '').trim(), email = String(payload.email || '').trim().toLowerCase(), type = payload.type;
    if (!['support', 'demo'].includes(type) || !name || name.length > 120 || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (type === 'support' && !String(payload.message || '').trim())) return send(res, 400, { error: 'Enter your name, valid business email and request details.' });
    const key = req.socket.remoteAddress || 'local', now = Date.now();
    const recent = (requestLimits.get(key) || []).filter(time => now - time < 600000);
    if (recent.length >= 5) return send(res, 429, { error: 'Too many requests. Please try again in 10 minutes.' });
    requestLimits.set(key, [...recent, now]);
    const request = { id: slugId('HELP'), type, name, email, company: String(payload.company || '').slice(0, 160), phone: String(payload.phone || '').slice(0, 40), message: String(payload.message || '').slice(0, 2000), createdAt: new Date().toISOString() };
    store.requests ||= []; store.requests.unshift(request); await persist();
    if (EMAIL_READY && process.env.SUPPORT_EMAIL) {
      try { await deliverEmail({ to: process.env.SUPPORT_EMAIL, subject: `OfNeeds ${type === 'demo' ? 'walkthrough' : 'assistance'} request ${request.id}`, text: `${request.name}\n${request.email}\n${request.company}\n${request.phone}\n\n${request.message}` }); request.deliveryStatus = 'sent'; }
      catch { request.deliveryStatus = 'failed'; }
      await persist();
    }
    return send(res, 201, { id: request.id, status: 'saved' });
  }
  if (req.method === 'GET' && path === '/api/me') {
    const user = userFrom(req);
    return send(res, 200, { user: user ? cleanUser(user) : null, notifications: user ? store.notifications.filter(item => item.userId === user.id).slice(0, 8) : [] });
  }
  if (req.method === 'POST' && path === '/api/notifications/read') {
    const user = userFrom(req); if (!user) return send(res, 401, { error: 'Sign in to continue.' });
    for (const notification of store.notifications) if (notification.userId === user.id) notification.read = true;
    await persist(); return send(res, 200, { ok: true });
  }
  if (req.method === 'POST' && path === '/api/auth/login') {
    const email = String(payload.email || '').trim().toLowerCase(); const user = store.users.find(item => item.email.toLowerCase() === email);
    if (!user || !passwordMatches(String(payload.password || ''), user)) return send(res, 401, { error: 'Email or password doesn’t match.' });
    const token = randomBytes(32).toString('hex'); sessions.set(token, user.id);
    return send(res, 200, { user: cleanUser(user) }, { 'set-cookie': `ofneeds_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200` });
  }
  if (req.method === 'POST' && path === '/api/auth/logout') {
    const token = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('ofneeds_session='))?.split('=')[1];
    if (token) sessions.delete(token);
    return send(res, 200, { ok: true }, { 'set-cookie': 'ofneeds_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  }
  if (req.method === 'POST' && path === '/api/auth/register') {
    const role = payload.role;
    if (!['buyer', 'dealer'].includes(role)) return send(res, 400, { error: 'Choose a business account type.' });
    const panValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(payload.pan || '');
    if (!payload.name || !payload.companyName || !payload.email || !payload.mobile || !payload.gstin || !validateGstin(payload.gstin) || !panValid || !payload.city || !payload.state || !payload.pin || !String(payload.pin).match(/^\d{6}$/) || String(payload.password || '').length < 10) return send(res, 400, { error: 'Complete all required fields with a valid GSTIN, PAN, 6-digit PIN code, and password of at least 10 characters.' });
    if (role === 'dealer' && (!payload.dealerType || !payload.brand || !payload.billingAddress)) return send(res, 400, { error: 'Add your dealer type, represented brands, and business address.' });
    if (role === 'buyer' && (!payload.companyType || !payload.billingAddress || !payload.shippingAddress)) return send(res, 400, { error: 'Add your company type, billing address, and shipping address.' });
    if (store.users.some(user => user.email.toLowerCase() === String(payload.email).toLowerCase())) return send(res, 409, { error: 'An account already uses this business email.' });
    const documents = Array.isArray(payload.documents) ? payload.documents : [];
    if (documents.length < (role === 'buyer' ? 1 : 2)) return send(res, 400, { error: role === 'buyer' ? 'Please attach your GST certificate.' : 'Please attach your dealer authorization and GST certificates.' });
    if (role === 'buyer' && !documents.some(doc => doc.type === 'gst_certificate')) return send(res, 400, { error: 'Please attach your GST certificate.' });
    if (role === 'dealer' && (!documents.some(doc => doc.type === 'dealer_authorization') || !documents.some(doc => doc.type === 'gst_certificate'))) return send(res, 400, { error: 'Please attach both the dealer authorization and GST certificates.' });
    mkdirSync(UPLOAD_DIR, { recursive: true }); const savedDocs = [];
    for (const doc of documents.slice(0, 4)) {
      const match = String(doc.dataUrl || '').match(/^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match || !doc.name || Buffer.byteLength(match[2], 'base64') > 4_000_000) return send(res, 400, { error: 'Documents must be PDF, JPG, PNG, or WEBP files under 4 MB each.' });
      const storageName = `${randomUUID()}.${match[1] === 'application/pdf' ? 'pdf' : match[1].split('/')[1].replace('jpeg', 'jpg')}`;
      writeFileSync(join(UPLOAD_DIR, storageName), Buffer.from(match[2], 'base64'));
      savedDocs.push({ id: randomUUID(), name: String(doc.name).replace(/[\\/\\\\]/g, '').slice(0, 140), type: String(doc.type || 'business_document').slice(0, 50), storageName, contentType: match[1], size: Buffer.byteLength(match[2], 'base64'), submittedAt: new Date().toISOString() });
    }
    const id = slugId(role); const user = { id, role, name: String(payload.name).slice(0, 100), email: String(payload.email).slice(0, 160), mobile: String(payload.mobile).slice(0, 30), companyName: String(payload.companyName).slice(0, 140), gstin: String(payload.gstin).toUpperCase(), pan: String(payload.pan).toUpperCase(), city: String(payload.city || ''), state: String(payload.state || ''), pin: String(payload.pin), billingAddress: String(payload.billingAddress || '').slice(0, 600), shippingAddress: String(payload.shippingAddress || '').slice(0, 600), companyType: String(payload.companyType || ''), status: 'pending', gstStatus: role === 'buyer' ? 'pending' : undefined, website: String(payload.website || ''), dealerType: role === 'dealer' ? payload.dealerType : undefined, brand: role === 'dealer' ? String(payload.brand || '') : undefined, documents: savedDocs, password: hashPassword(String(payload.password)), createdAt: new Date().toISOString() };
    store.users.push(user);
    for (const admin of store.users.filter(item => item.role === 'admin')) addNotification(admin.id, `New ${role} registration: ${user.companyName}.`);
    await persist();
    return send(res, 201, { message: 'Application received. Our team will verify your business details and documents.', status: user.status });
  }
  if (req.method === 'GET' && path === '/api/catalog') {
    const user = userFrom(req); const catalogAccess = canBrowseCatalog(user); const q = String(url.searchParams.get('q') || '').toLowerCase(); const category = url.searchParams.get('category'); const brand = url.searchParams.get('brand'); const city = url.searchParams.get('city'); const maxPrice = Number(url.searchParams.get('maxPrice') || 0); const inStock = url.searchParams.get('inStock') === 'true';
    let products = catalogAccess ? store.products.map(product => safeCatalogProduct(product, user)).filter(product => product.active !== false && product.dealer?.verified) : [];
    products = products.filter(product => (!q || [product.name, product.brand, product.model, product.category, product.dealer?.businessName, product.dealer?.city].some(value => value?.toLowerCase().includes(q))) && (!category || product.category === category) && (!brand || product.brand === brand) && (!city || product.dealer?.city === city) && (!maxPrice || !product.price || product.price <= maxPrice) && (!inStock || product.available > 0));
    const authorizedProducts = catalogAccess ? store.products.filter(product => product.active !== false && brandAuthorizationValid(product.dealerId, product.brand)) : [];
    const dealers = catalogAccess ? store.dealers.map(dealer => ({ ...dealer, brands: [...new Set((dealer.brands || []).filter(item => brandAuthorizationValid(dealer.id, item)))] })).filter(dealer => dealer.brands.length).map(({ id, businessName, city, state, brands, about, deliveryCoverage, capabilities, type }) => ({ id, businessName, city, state, verified: true, brands, about, deliveryCoverage, capabilities, type, authorizations: store.authorizations.filter(item => item.dealerId === id && brandAuthorizationValid(id, item.brand) && item.status === 'verified').map(({ brand, verifiedAt, validUntil, documentId }) => ({ brand, verifiedAt, validUntil, evidenceRecorded: Boolean(documentId) })) })) : [];
    return send(res, 200, { catalogAccess, products, categories: [...new Set(store.categories.map(normalizeCategory))], brands: [...new Set(authorizedProducts.map(p => p.brand))].sort((a, b) => a.localeCompare(b)), brandDirectory: store.brandDirectory.map(brand => ({ ...brand, categories: [...new Set(brand.categories.map(normalizeCategory))] })), dealers, total: products.length });
  }
  if (req.method === 'POST' && path === '/api/reservations') {
    const user = requireUser(req, res, ['buyer']); if (!user) return;
    const product = store.products.find(item => item.id === payload.productId);
    const quantity = Number(payload.quantity);
    if (!product || product.active === false || !brandAuthorizationValid(product.dealerId, product.brand)) return send(res, 404, { error: 'This product is not currently published by an authorized dealer.' });
    if (!Number.isInteger(quantity) || quantity < product.moq) return send(res, 400, { error: `Enter a whole quantity of at least ${product.moq || 1} units.` });
    const remaining = available(product); if (quantity > remaining) return send(res, 409, { error: `Only ${remaining} units are available. Inventory has been refreshed.` });
    const reservation = { id: `RES-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${randomBytes(2).toString('hex').toUpperCase()}`, productId: product.id, dealerId: product.dealerId, buyerId: user.id, quantity, status: 'Awaiting Dealer Approval', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), deliveryLocation: String(payload.deliveryLocation || '').slice(0, 240), remarks: String(payload.remarks || '').slice(0, 1000), expectedDate: String(payload.expectedDate || '') };
    store.reservations.unshift(reservation);
    const dealerUser = store.users.find(item => item.dealerId === product.dealerId || item.email === store.dealers.find(d => d.id === product.dealerId)?.email);
    addNotification(user.id, `Reservation request sent for ${product.name} (${quantity} units).`);
    if (dealerUser) addNotification(dealerUser.id, `New reservation request for ${product.name} (${quantity} units).`);
    await persist(); return send(res, 201, { reservation });
  }
  if (req.method === 'POST' && path === '/api/rfqs') {
    const user = requireUser(req, res, ['buyer']); if (!user) return;
    const product = store.products.find(item => item.id === payload.productId);
    if (!product || product.active === false || !brandAuthorizationValid(product.dealerId, product.brand)) return send(res, 404, { error: 'This product is not currently published by an authorized dealer.' });
    if (!Number.isInteger(Number(payload.quantity)) || Number(payload.quantity) < product.moq) return send(res, 400, { error: 'Choose a quantity that meets this product\'s MOQ.' });
    const dealerIds = payload.broadcast === 'true' || payload.broadcast === true
      ? [...new Set(store.products.filter(item => item.brand === product.brand && store.authorizations.some(auth => auth.dealerId === item.dealerId && auth.brand.toLowerCase() === item.brand.toLowerCase() && auth.status === 'verified' && (!auth.validUntil || Date.parse(auth.validUntil) > Date.now()))).map(item => item.dealerId))]
      : [payload.dealerId || product.dealerId];
    if (!dealerIds.length) dealerIds.push(product.dealerId);
    const enquiries = dealerIds.map(dealerId => ({ id: `RFQ-${Date.now().toString().slice(-8)}-${randomBytes(2).toString('hex').toUpperCase()}`, buyerId: user.id, productId: product.id, dealerId, quantity: Number(payload.quantity), status: 'Awaiting response', createdAt: new Date().toISOString(), deliveryDate: String(payload.deliveryDate || ''), deliveryLocation: String(payload.deliveryLocation || ''), notes: String(payload.notes || '') }));
    store.enquiries.unshift(...enquiries);
    for (const enquiry of enquiries) {
      const dealerUser = store.users.find(item => item.dealerId === enquiry.dealerId || item.email === store.dealers.find(d => d.id === enquiry.dealerId)?.email);
      const dealerName = store.dealers.find(item => item.id === enquiry.dealerId)?.businessName || 'the dealer';
      addNotification(user.id, `Your RFQ ${enquiry.id} was sent to ${dealerName}.`);
      if (dealerUser) addNotification(dealerUser.id, `New quotation request for ${product.name}, ${enquiry.quantity} units.`);
    }
    await persist(); return send(res, 201, { enquiries, enquiry: enquiries[0] });
  }
  const quoteMatch = path.match(/^\/api\/rfqs\/([^/]+)\/quote$/);
  if (req.method === 'POST' && quoteMatch) {
    const user = requireUser(req, res, ['dealer']); if (!user) return;
    const dealer = dealerFor(user); const enquiry = store.enquiries.find(item => item.id === quoteMatch[1]);
    if (!enquiry || enquiry.dealerId !== dealer?.id) return send(res, 404, { error: 'RFQ not found for this dealer.' });
    const price = Number(payload.price); if (!Number.isFinite(price) || price <= 0) return send(res, 400, { error: 'Enter a valid unit price.' });
    enquiry.quote = { price, gst: Number(payload.gst || 18), delivery: Number(payload.delivery || 0), leadTime: String(payload.leadTime || '5–7 working days'), validity: String(payload.validity || '7 days'), terms: String(payload.terms || '') };
    enquiry.status = 'Quote received'; enquiry.quotedAt = new Date().toISOString();
    addNotification(enquiry.buyerId, `A dealer sent a quotation for ${store.products.find(item => item.id === enquiry.productId)?.name || 'your RFQ'}.`);
    await persist(); return send(res, 200, { enquiry });
  }
  if (req.method === 'GET' && path === '/api/dashboard') {
    const user = userFrom(req); if (!user) return send(res, 401, { error: 'Sign in to continue.' });
    if (user.status !== 'approved' || (user.role === 'buyer' && user.gstStatus !== 'verified')) return send(res, 200, { pending: true, role: user.role, status: user.status, gstStatus: user.gstStatus || 'pending', companyName: user.companyName, createdAt: user.createdAt, reviewReason: user.reviewReason, documents: (user.documents || []).map(doc => ({ type: doc.type, name: doc.name })) });
    if (!['buyer', 'dealer', 'admin'].includes(user.role)) return send(res, 403, { error: 'Your account does not have access to this dashboard.' });
    if (user.role === 'admin') return send(res, 200, { metrics: { dealers: store.users.filter(item => item.role === 'dealer').length, approvedDealers: store.users.filter(item => item.role === 'dealer' && item.status === 'approved').length, pending: store.users.filter(item => item.status === 'pending').length, buyers: store.users.filter(item => item.role === 'buyer' && item.status === 'approved').length, brands: new Set(store.products.map(item => item.brand)).size, products: store.products.length, reservations: store.reservations.length, activeReservations: store.reservations.filter(item => activeStatuses.has(item.status)).length, enquiries: store.enquiries.length }, requests: store.requests || [], pendingUsers: store.users.filter(item => item.status === 'pending').map(cleanUser), authorizations: store.authorizations.filter(item => item.status === 'pending'), products: store.products.map(product => safeProduct(product, user)), reservations: store.reservations, enquiries: store.enquiries });
    if (user.role === 'dealer') {
      const dealer = dealerFor(user); const products = store.products.filter(item => item.dealerId === dealer?.id).map(product => safeProduct(product, user)); const reservations = store.reservations.filter(item => item.dealerId === dealer?.id); const enquiries = store.enquiries.filter(item => item.dealerId === dealer?.id);
      return send(res, 200, { dealer, products, reservations, enquiries, metrics: { products: products.length, inventory: products.reduce((sum, p) => sum + p.available, 0), reservations: reservations.filter(item => activeStatuses.has(item.status)).length, enquiries: enquiries.length, lowStock: products.filter(item => item.lowStock).length } });
    }
    return send(res, 200, { reservations: store.reservations.filter(item => item.buyerId === user.id), enquiries: store.enquiries.filter(item => item.buyerId === user.id), savedProducts: user.savedProducts || [], recentlyViewed: user.recentlyViewed || [], notifications: store.notifications.filter(item => item.userId === user.id).slice(0, 8), metrics: { reservations: store.reservations.filter(item => item.buyerId === user.id && activeStatuses.has(item.status)).length, enquiries: store.enquiries.filter(item => item.buyerId === user.id).length, saved: (user.savedProducts || []).length } });
  }
  if (req.method === 'POST' && path === '/api/admin/review') {
    const admin = requireUser(req, res, ['admin']); if (!admin) return;
    const target = store.users.find(item => item.id === payload.userId);
    if (!target || !['approved', 'rejected', 'suspended'].includes(payload.status)) return send(res, 400, { error: 'Review action is not valid.' });
    const reason = String(payload.reason || '').trim().slice(0, 1000);
    if (!reason) return send(res, 400, { error: 'Record the evidence reviewed or the corrections required.' });
    const requiredTypes = target.role === 'dealer' ? ['gst_certificate', 'dealer_authorization'] : ['gst_certificate'];
    if (payload.status === 'approved' && !requiredTypes.every(type => target.documents?.some(doc => doc.type === type))) return send(res, 400, { error: 'Required business evidence must be supplied before approval.' });
    target.status = payload.status; target.reviewedAt = new Date().toISOString(); target.reviewedBy = admin.id;
    target.reviewReason = reason; target.reviewHistory ||= []; target.reviewHistory.push({ status: payload.status, reason, reviewedAt: target.reviewedAt, reviewedBy: admin.id });
    if (target.role === 'buyer' && payload.status === 'approved') target.gstStatus = 'verified';
    if (target.role === 'dealer' && payload.status === 'approved' && !target.dealerId) {
      const dealerId = slugId('dealer'); target.dealerId = dealerId;
      const brands = String(target.brand || '').split(',').map(value => value.trim()).filter(Boolean);
      store.dealers.push({ id: dealerId, businessName: target.companyName, contactName: target.name, email: target.email, phone: target.mobile, city: target.city || 'Bengaluru', state: target.state || 'Karnataka', pin: target.pin || '', address: target.billingAddress || '', website: target.website || '', verified: false, brands: [], type: target.dealerType || 'Dealer' });
      for (const brand of brands) store.authorizations.push({ id: randomUUID(), dealerId, brand, status: 'pending', documentId: target.documents?.find(doc => doc.type === 'dealer_authorization')?.id || null, requestedAt: new Date().toISOString() });
    }
    addNotification(target.id, payload.status === 'approved' ? target.role === 'dealer' ? 'Your business is approved and your OfNeeds store is ready. Product publishing starts after brand authorization is approved.' : 'Your corporate buyer account and GST are approved. You can now view live product listings, stock and B2B prices.' : `Your business account status was updated to ${payload.status}. ${reason}`);
    await persist(); return send(res, 200, { user: cleanUser(target) });
  }
  if (req.method === 'POST' && path === '/api/admin/authorization') {
    const admin = requireUser(req, res, ['admin']); if (!admin) return;
    const authorization = store.authorizations.find(item => item.id === payload.authorizationId);
    if (!authorization || !['verified', 'rejected'].includes(payload.status)) return send(res, 400, { error: 'Authorization review is not valid.' });
    if (payload.status === 'verified' && !authorization.documentId) return send(res, 400, { error: 'Authorization evidence is required before verification.' });
    authorization.status = payload.status; authorization.verifiedAt = payload.status === 'verified' ? new Date().toISOString() : null; authorization.validFrom = payload.status === 'verified' ? new Date().toISOString() : null; authorization.validUntil = payload.status === 'verified' ? new Date(Date.now() + 365 * 86400000).toISOString() : null; authorization.reviewedBy = admin.id;
    const dealer = store.dealers.find(item => item.id === authorization.dealerId);
    if (dealer) {
      syncDealerAuthorizations(dealer);
      const dealerUser = store.users.find(item => item.dealerId === dealer.id || item.email === dealer.email);
      if (dealerUser) addNotification(dealerUser.id, payload.status === 'verified' ? `OfNeeds approved your ${authorization.brand} authorization. You can now add products and inventory for this brand.` : `OfNeeds did not approve your ${authorization.brand} authorization. Contact support if you need to provide updated evidence.`);
    }
    await persist(); return send(res, 200, { authorization });
  }
  const photoMatch = path.match(/^\/api\/catalog\/images\/([A-Za-z0-9-]+)$/);
  if (req.method === 'GET' && photoMatch) {
    const user = userFrom(req); if (!canBrowseCatalog(user)) return send(res, 403, { error: 'Verified business access required.' });
    const product = store.products.find(item => item.id === photoMatch[1] && item.active !== false && brandAuthorizationValid(item.dealerId, item.brand));
    if (!product?.photo || !existsSync(join(PHOTO_DIR, product.photo.file))) return send(res, 404, { error: 'Photo unavailable.' });
    res.writeHead(200, { 'content-type': product.photo.type, 'cache-control': 'private, no-cache', 'x-content-type-options': 'nosniff' }); createReadStream(join(PHOTO_DIR, product.photo.file)).pipe(res); return;
  }
  if (req.method === 'POST' && path === '/api/dealer/photo') {
    const user = requireUser(req, res, ['dealer']); if (!user) return;
    const product = store.products.find(item => item.id === payload.productId && item.dealerId === dealerFor(user)?.id);
    if (!product) return send(res, 404, { error: 'Product not found in your catalog.' });
    try { saveProductPhoto(product, payload.photo); } catch (error) { return send(res, 400, { error: error.message }); }
    await persist(); return send(res, 200, { product: safeProduct(product, user) });
  }
  if (req.method === 'POST' && path === '/api/dealer/profile') {
    const user = requireUser(req, res, ['dealer']); if (!user) return; const dealer = dealerFor(user);
    if (!dealer) return send(res, 404, { error: 'Supplier profile unavailable.' });
    dealer.about = String(payload.about || '').trim().slice(0, 1200); dealer.deliveryCoverage = String(payload.deliveryCoverage || '').trim().slice(0, 300); dealer.capabilities = String(payload.capabilities || '').trim().slice(0, 500); dealer.profileUpdatedAt = new Date().toISOString();
    await persist(); return send(res, 200, { ok: true });
  }
  if (req.method === 'POST' && path === '/api/dealer/products') {
    const user = requireUser(req, res, ['dealer']); if (!user) return;
    const dealer = dealerFor(user); if (!dealer) return send(res, 403, { error: 'Dealer profile is unavailable.' });
    if (!brandAuthorizationValid(dealer.id, payload.brand)) return send(res, 403, { error: 'OfNeeds must approve your authorization for this brand before you can publish its products.' });
    const stock = Number(payload.stock); const price = Number(payload.price); const moq = Number(payload.moq); const gst = Number(payload.gst || 18); const bulkMinimum = Number(payload.bulkMinimum || 0); const bulkPrice = Number(payload.bulkPrice || 0);
    if (!payload.name || !payload.brand || !Number.isFinite(price) || price < 0 || !Number.isFinite(gst) || gst < 0 || gst > 100 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(moq) || moq < 1 || ((bulkMinimum || bulkPrice) && (!Number.isInteger(bulkMinimum) || bulkMinimum <= moq || bulkPrice <= 0 || bulkPrice >= price))) return send(res, 400, { error: 'Check product name, brand, price, tax rate, MOQ, stock, and bulk price break.' });
    const tiers = bulkMinimum && bulkPrice ? [{ min: moq, max: bulkMinimum - 1, price }, { min: bulkMinimum, max: 9999, price: bulkPrice }] : [{ min: moq, max: 9999, price }];
    let image; try { image = checkedImageURL(payload.image); if (payload.photo) decodeProductPhoto(payload.photo); } catch (error) { return send(res, 400, { error: error.message }); }
    const product = { id: slugId('p'), name: String(payload.name).slice(0, 160), brand: String(payload.brand).slice(0, 80), model: String(payload.model || '').slice(0, 80), category: store.categories.includes(payload.category) ? payload.category : 'Premium Gifting', dealerId: dealer.id, mrp: Number(payload.mrp || price), price, gst, hsn: String(payload.hsn || ''), moq, stock, sold: 0, minStock: Number(payload.minStock || 10), leadTime: String(payload.leadTime || '3–5 days'), warranty: String(payload.warranty || ''), image, color: '#f1f5f9', updatedAt: new Date().toISOString(), description: String(payload.description || ''), tiers };
    if (payload.photo) saveProductPhoto(product, payload.photo);
    store.products.unshift(product); await persist(); return send(res, 201, { product: safeProduct(product, user) });
  }
  if (req.method === 'POST' && path === '/api/dealer/stock') {
    const user = requireUser(req, res, ['dealer']); if (!user) return;
    const dealer = dealerFor(user); const product = store.products.find(item => item.id === payload.productId && item.dealerId === dealer?.id);
    const stock = Number(payload.stock); if (!product || !Number.isInteger(stock) || stock < product.sold + store.reservations.filter(item => item.productId === product.id && activeStatuses.has(item.status)).reduce((sum, item) => sum + item.quantity, 0)) return send(res, 400, { error: 'Stock must be a whole number and cannot be less than sold plus reserved units.' });
    product.stock = stock; if (payload.price !== undefined) { const price = Number(payload.price); if (!Number.isFinite(price) || price < 0) return send(res, 400, { error: 'Enter a valid B2B price.' }); product.price = price; if (product.tiers?.length) product.tiers[0].price = price; else product.tiers = [{ min: product.moq, max: 9999, price }]; } product.updatedAt = new Date().toISOString(); await persist(); return send(res, 200, { product: safeProduct(product, user) });
  }
  const reservationMatch = path.match(/^\/api\/reservations\/([^/]+)\/status$/);
  if (req.method === 'POST' && reservationMatch) {
    const user = requireUser(req, res, ['dealer', 'admin']); if (!user) return;
    const reservation = store.reservations.find(item => item.id === reservationMatch[1]);
    if (!reservation) return send(res, 404, { error: 'Reservation not found.' });
    const dealer = dealerFor(user); if (user.role === 'dealer' && reservation.dealerId !== dealer?.id) return send(res, 403, { error: 'This reservation belongs to another dealer.' });
    const allowed = { Reserved: ['Awaiting Dealer Approval', 'Requested'], Rejected: ['Awaiting Dealer Approval', 'Requested'], Released: ['Reserved', 'Confirmed'] };
    if (!allowed[payload.status]?.includes(reservation.status)) return send(res, 409, { error: 'Reservation status has changed. Refresh and try again.' });
    if (payload.status === 'Reserved' && reservation.quantity > available(store.products.find(item => item.id === reservation.productId)) + reservation.quantity) return send(res, 409, { error: 'Inventory has changed. Check available stock.' });
    reservation.status = payload.status; reservation.updatedAt = new Date().toISOString();
    const buyer = store.users.find(item => item.id === reservation.buyerId); if (buyer) addNotification(buyer.id, `Reservation ${reservation.id} was ${payload.status.toLowerCase()}.`);
    await persist(); return send(res, 200, { reservation });
  }
  if (req.method === 'GET' && path === '/api/contact') {
    const user = requireUser(req, res, ['buyer']); if (!user) return;
    const dealer = store.dealers.find(item => item.id === url.searchParams.get('dealerId')); if (!dealer) return send(res, 404, { error: 'Dealer not found.' });
    return send(res, 200, { dealer });
  }
  const documentMatch = path.match(/^\/api\/admin\/documents\/([^/]+)$/);
  if (req.method === 'GET' && documentMatch) {
    const admin = requireUser(req, res, ['admin']); if (!admin) return;
    const doc = store.users.flatMap(item => item.documents || []).find(item => item.id === documentMatch[1]);
    if (!doc) return send(res, 404, { error: 'Document not found.' });
    const file = join(UPLOAD_DIR, doc.storageName);
    if (!existsSync(file)) return send(res, 404, { error: 'Document file is unavailable.' });
    res.writeHead(200, { 'content-type': doc.contentType, 'content-disposition': `inline; filename="${doc.name.replace(/["\r\n]/g, '')}"`, 'x-content-type-options': 'nosniff', 'cache-control': 'private, no-store' });
    createReadStream(file).pipe(res); return;
  }
  if (req.method === 'POST' && path === '/api/saved') {
    const user = requireUser(req, res, ['buyer']); if (!user) return;
    if (!user.savedProducts) user.savedProducts = [];
    if (user.savedProducts.includes(payload.productId)) user.savedProducts = user.savedProducts.filter(id => id !== payload.productId); else user.savedProducts.push(payload.productId);
    await persist(); return send(res, 200, { savedProducts: user.savedProducts });
  }
  return send(res, 404, { error: 'That marketplace route was not found.' });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    try { await handleApi(req, res, url); } catch (error) { console.error(error); if (!res.headersSent) send(res, 500, { error: 'Something went wrong. Please try again.' }); }
    return;
  }
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = resolve(PUBLIC, `.${requested}`);
  if (file !== PUBLIC && !file.startsWith(`${PUBLIC}${sep}`)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (!existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
  if (file === join(PUBLIC, 'index.html') && SITE_URL) {
    let html = readFileSync(file, 'utf8'); const origin = policyURL(SITE_URL); const escape = value => value.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
    if (origin) { const home = origin.replace(/\/$/, '') + '/'; html = html.replace('content="/assets/gifting-editorial.webp"', `content="${escape(home)}assets/gifting-editorial.webp"`).replace('</head>', `<link rel="canonical" href="${escape(home)}"><meta property="og:url" content="${escape(home)}"></head>`); }
    res.writeHead(200, { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-cache' }); res.end(html); return;
  }
  res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' }); createReadStream(file).pipe(res);
});
server.listen(PORT, () => console.log(`OfNeeds B2B is running at http://localhost:${PORT}`));
