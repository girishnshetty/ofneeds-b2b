import { BRANDS_DATA, LOCATIONS_DATA } from './data/seoData';
export const offerings = [
  { slug: 'corporate-gifts', title: 'Corporate gifts for employees and clients', intro: 'Find a thoughtful gift for your team, customers or business partners. Explore the brand catalog and tell us your occasion, quantity and budget.', categories: [] },
  { slug: 'corporate-merchandise', title: 'Branded corporate merchandise', intro: 'Bring your company identity to useful everyday products. Compare bags, apparel and accessories, then ask about logo placement and packaging.', categories: ['Backpack','Electronics','Accessories'] },
  { slug: 'employee-welcome-kits', title: 'Employee welcome kits', intro: 'Build a welcome kit around your team’s needs. Combine practical bags, apparel and accessories with your company branding. Contents and packaging are confirmed in your quotation.', categories: ['Backpack','Apparel','Lunch Box'] },
  { slug: 'corporate-apparel', title: 'Corporate apparel and uniforms', intro: 'Explore apparel for team events, uniforms and employee gifting. Share your size breakdown and branding requirements to discuss suitable options.', categories: ['Apparel'] },
  { slug: 'bulk-corporate-gifts', title: 'Bulk corporate gifting', intro: 'Plan an order across one office or multiple destinations. Share your quantities and delivery locations for an availability and fulfilment proposal.', categories: [] },
  { slug: 'customized-corporate-gifts', title: 'Customized corporate gifts', intro: 'Discuss logo customization, personalized messages and gift packaging. Methods depend on the product, material and brand permissions.', categories: [] },
  { slug: 'festive-hampers', title: 'Festive gifts and hampers', intro: 'Plan gifts for celebrations and annual milestones. Explore home, lifestyle and travel options, and discuss combinations that suit your recipients.', categories: ['Home & Living','Lunch Box','Trolley'] },
];
export function pageFor(path: string) {
  const normalized = '/' + path.split('/').filter(Boolean).join('/') + '/';
  const brand = BRANDS_DATA.find(b => normalized === `/brands/${b.slug}/`);
  if (brand) return { path: normalized, title: brand.metaTitle, description: `Explore ${brand.name} corporate gifting options, customization and indicative minimum quantities. Request availability and pricing from Creations Overseas.`, brand };
  const offering = offerings.find(o => normalized === `/${o.slug}/`);
  if (offering) return { path: normalized, title: `${offering.title} | Creations Overseas`, description: offering.intro, offering };
  const location = LOCATIONS_DATA.find(l => normalized === `/locations/corporate-gifting-${l.city.toLowerCase()}/`);
  if (location) return { path: normalized, title: `Corporate gifting in ${location.city} | Creations Overseas`, description: `Explore corporate gifting options for teams and clients in ${location.city}. Discuss branding, quantities and delivery requirements.`, location };
  if (normalized === '/about/') return { path: normalized, title: 'About Us | Creations Overseas', description: 'Discover the Creations Group’s heritage, leadership and corporate gifting business, with offices and showroom contact details.' };
  if (normalized === '/about/heritage/') return { path: normalized, title: 'Our Heritage | Creations Overseas', description: 'From a timepiece business to more than four decades of retail and corporate gifting.' };
  if (normalized === '/about/leadership/') return { path: normalized, title: 'Leadership | Creations Overseas', description: 'Meet the leadership behind brand building, operations, sales and customer support.' };
  if (normalized === '/contact/') return { path: normalized, title: 'Contact Us | Creations Overseas', description: 'Find the Hyderabad head office, Cyberabad showroom, Bengaluru and Ahmedabad branches, and contact our central sales team.' };
  if (normalized === '/updates/') return { path: normalized, title: 'Updates | Creations Overseas', description: 'Published company news, exhibitions, brand introductions and product updates from the official Creations Overseas website.' };
  if (normalized === '/links/') return { path: normalized, title: 'Useful Links | Creations Overseas', description: 'Group websites, official business policies and team email access.' };
  if (normalized === '/privacy/') return { path: normalized, title: 'Privacy notice | Creations Overseas', description: 'How enquiry information is collected, stored and used.' };
  if (normalized === '/image-credits/') return { path: normalized, title: 'Image credits | Creations Overseas', description: 'Sources for our gifting inspiration photography and original brand logos.' };
  return undefined;
}
export const pagePaths = [...BRANDS_DATA.map(b=>`/brands/${b.slug}/`), ...offerings.map(o=>`/${o.slug}/`), ...LOCATIONS_DATA.map(l=>`/locations/corporate-gifting-${l.city.toLowerCase()}/`), '/about/', '/about/heritage/', '/about/leadership/', '/contact/', '/updates/', '/links/', '/privacy/', '/image-credits/'];
