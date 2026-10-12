const env = import.meta.env || (typeof process !== 'undefined' ? process.env : {});
export const siteConfig = {
  email: env.VITE_SALES_EMAIL || 'info@creationsgroup.co.in',
  phone: env.VITE_SALES_PHONE || '+91 91333 66259',
  whatsapp: env.VITE_WHATSAPP_PHONE || '',
  address: env.VITE_OFFICE_ADDRESS || '2nd Floor, Satguru, No. 142, Prenderghast Road, Sindhi Colony, Secunderabad, Telangana, India — 500003',
  mapsUrl: env.VITE_OFFICE_MAP_URL || 'https://maps.app.goo.gl/dkz7AYMxuqLe9Jxh7',
  logo: '/assets/creations-overseas-official.png',
  url: (env.VITE_SITE_URL || 'https://creationsgroup.co.in').replace(/\/$/, ''),
  gaId: env.VITE_GA4_ID || '',
};
export const demoContacts = siteConfig.email.endsWith('.example') || !siteConfig.phone.replace(/\D/g, '').replace(/^91/, '').replace(/0/g, '');
export function track(event: string, fields: Record<string, string> = {}) {
  const w = window as typeof window & { gtag?: (...args: unknown[]) => void };
  w.gtag?.('event', event, fields);
}
