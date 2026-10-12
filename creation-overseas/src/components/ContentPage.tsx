import {BusinessPages} from "./BusinessPages";
import {offices} from '../businessContent';
import {OfficeDirectory} from './OfficeDirectory';
import { BrandLogo } from "./BrandLogo";
import { brandLogoAssets } from "../brandAssets";
import { useMemo, useState } from 'react';
import { BRANDS_DATA } from '../data/seoData';
import { pageFor } from '../pages';
import { QuoteRequestModal } from './QuoteForm';
import { ContactDetails } from './ContactDetails';
import { siteConfig } from '../siteConfig';
import { photography, inspirationFor } from '../photography';
import { PageHeader } from './PageHeader';

export function ContentPage({ path }: { path: string }) {
  const page = pageFor(path);
  const [quote, setQuote] = useState(false);
  const [product, setProduct] = useState('');
  const prefill = useMemo(()=>({notes: product ? `Interested in: ${product}` : ''}),[product]);
  const openQuote = (selectedProduct = '') => { setProduct(selectedProduct); setQuote(true); };
  const brand = page?.brand;
  const office = page?.location ? offices.find(o=>o.id===(page.location.city==='Bangalore'?'bengaluru':page.location.city.toLowerCase())) : undefined;
  const inspiration = brand?.categories.includes('Apparel') ? photography.apparel : brand?.categories.some(c=>['Backpack','Trolley','Accessories'].includes(c)) ? photography.travel : inspirationFor(path);
  const relevant = [...BRANDS_DATA].filter(b=>!page?.offering || !page.offering.categories.length || b.categories.some(c=>page.offering.categories.includes(c))).sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'}));
  return <div className="premium-content min-h-screen">
    <PageHeader onQuote={()=>openQuote()}/>
    <main id="main-content" className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6"><a href="/">Home</a> / {brand ? brand.name : page?.location?.city || page?.offering?.title || (page?.title.split(' | ')[0] || 'Page')}</nav>
      <h1 className="text-3xl sm:text-5xl font-bold max-w-4xl leading-tight">{brand?.h1 || page?.offering?.title || (page?.location ? `Corporate gifts in ${page.location.city}` : page?.title.split(' | ')[0] || 'Page not found')}</h1>
      <p className="text-lg text-slate-600 leading-relaxed mt-6 max-w-3xl">{brand ? `Explore ${brand.name} gifting options for employees and clients. Share your quantity and branding requirements to confirm available products.` : page?.description || 'This page is unavailable. Browse our gifting options from the homepage.'}</p>
      {(page?.offering || page?.location) && <figure className="premium-page-figure"><img className="premium-page-photo" src={inspiration.src} alt={inspiration.alt} width="1200" height="800"/><figcaption>Collection inspiration · Stock photography. Exact brand products and specifications are confirmed separately.</figcaption></figure>}
      {page?.path === '/image-credits/' && <div className="mt-10 max-w-3xl space-y-6"><p>Our gifting inspiration photographs are sourced from Pexels. These images illustrate styling and gifting occasions; they are not photographs of our completed projects or exact partner products.</p><p><a className="underline" href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer">Pexels photo license</a></p><ul className="space-y-5">{Object.values(photography).map(image=><li key={image.src} className="border-b border-slate-200 pb-4"><a className="underline" href={image.source} target="_blank" rel="noopener noreferrer">{image.alt}</a><p className="text-sm text-slate-500 mt-2">{image.credit}</p></li>)}</ul><h2 className="text-2xl font-bold pt-8">Brand logo sources</h2><p>Original logos are sourced from the official websites below. Brand names and trademarks belong to their respective owners.</p><ul className="grid sm:grid-cols-2 gap-4">{BRANDS_DATA.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(b=><li key={b.slug}><a className="underline" href={brandLogoAssets[b.slug].officialSite} target="_blank" rel="noopener noreferrer">{b.name} — official website ↗</a></li>)}</ul></div>}
      {brand && <>
        <div className="brand-page-intro"><div className="brand-page-identity"><BrandLogo slug={brand.slug} name={brand.name}/><a href={brandLogoAssets[brand.slug].officialSite} target="_blank" rel="noopener noreferrer">Official brand website ↗</a></div><div><p className="premium-eyebrow">START WITH YOUR REQUIREMENTS</p><p>Share your quantity, budget and preferred delivery date. We’ll confirm the available selection and branding options.</p><button className="premium-button premium-button-dark" onClick={()=>openQuote()}>Discuss {brand.name} gifting ↗</button></div></div>
        <h2 className="text-2xl font-bold mt-12 mb-6">Product options</h2>
        <p className="text-sm text-slate-600 mb-5">Illustrative catalog descriptions. Confirm specifications, minimum quantities, warranty and availability with your quotation.</p>
        <div className="procurement-product-grid">{brand.products.map((p,i)=><article key={p.sku} className="procurement-product-card">
          {p.image && <img src={p.image} alt={p.name} loading="lazy" className="w-full aspect-square object-contain mb-4"/>}
          <div className="product-option-label"><p className="premium-eyebrow">{p.category}</p><span>0{i+1}</span></div><h3>{p.name}</h3><p className="product-description">{p.description}</p><dl className="product-order-details"><div><dt>Indicative minimum</dt><dd>{p.moq} units · confirm with quote</dd></div><div><dt>Branding to discuss</dt><dd>{p.customization}</dd></div></dl><button className="premium-text-link" onClick={()=>openQuote(p.name)}>Enquire about this option ↗</button>
        </article>)}</div>
        <h2 className="text-2xl font-bold mt-12 mb-5">Gifting occasions</h2><ul className="list-disc pl-6 space-y-2">{brand.useCases.map(v=><li key={v}>{v}</li>)}</ul>
        <h2 className="text-2xl font-bold mt-12 mb-5">Logo and packaging options</h2><p>{brand.customizationOptions.join(' · ')}</p>
        <section className="procurement-checklist" aria-labelledby="confirm-heading"><div><p className="premium-eyebrow">BEFORE YOU PLACE AN ORDER</p><h2 id="confirm-heading">Every detail, agreed.</h2><p>Your quotation should confirm the exact product and commercial terms.</p></div><ul><li>Model, material, colour and dimensions</li><li>Quantity, unit price and applicable taxes</li><li>Logo artwork, placement and sample approval</li><li>Packaging, delivery dates and freight charges</li><li>Applicable product warranty and return terms</li></ul></section>
      </>}
      {(page?.offering || page?.location) && <>
        {page.location && <p className="mt-6 p-5 bg-blue-50 rounded-xl">Service area: {page.location.city}. Delivery feasibility and timelines depend on products, quantities and destination. {office ? `Published ${office.kind.toLowerCase()}: ${office.city}.` : "This listing does not indicate a physical branch office."}</p>}
        {office && <div className="mt-8"><OfficeDirectory officeId={office.id}/></div>}<h2 className="text-2xl font-bold mt-12 mb-6">Explore relevant brands</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{relevant.map(b=><a href={`/brands/${b.slug}/`} key={b.slug} className="bg-white p-6 border border-slate-200 rounded-2xl hover:border-blue-500"><div className="brand-page-mark"><BrandLogo slug={b.slug} name={b.name}/></div><h3 className="font-bold">{b.name}</h3><p className="text-sm text-slate-600 mt-2">{b.categories.join(' · ')}</p><p className="mt-4 text-blue-700">View product options →</p></a>)}</div>
        <h2 className="text-2xl font-bold mt-12 mb-4">Plan your order</h2><p className="text-slate-600">Tell us your budget per gift, quantity, occasion and delivery date. We’ll confirm product choices, logo options, applicable taxes and delivery charges in a quotation.</p>
      </>}
      {page && ["/about/","/about/heritage/","/about/leadership/","/contact/","/updates/","/links/"].includes(page.path) && <BusinessPages path={page.path} onQuote={()=>openQuote()}/>}
      {page?.path === '/privacy/' && <div className="space-y-6 mt-10 max-w-3xl leading-relaxed"><section><h2 className="font-bold text-xl">Information you provide</h2><p>Our enquiry form collects your name, company, email and requested quantity, plus any optional phone number, budget, location, date and notes you choose to provide. Please do not include sensitive personal information.</p></section><section><h2 className="font-bold text-xl">How it is used</h2><p>Details are used to handle your gifting enquiry and prepare a quotation. Enquiries are stored on the website server. If sales notifications are configured, the details are also sent to the business’s configured sales service. We do not publish enquiries on this website.</p></section><section><h2 className="font-bold text-xl">Your brand shortlist</h2><p>Selected brand names are kept in your browser’s session storage so you can browse product pages without losing your shortlist. They are not sent to us until you submit an enquiry. Clear the shortlist using its Clear shortlist button.</p></section><section><h2 className="font-bold text-xl">Analytics</h2><p>Optional analytics are loaded only if configured and you choose to allow them. Enquiry analytics contain brand and quantity selections, not your contact details. You can change your choice using the Analytics preferences button.</p></section><section><h2 className="font-bold text-xl">Access and deletion</h2><p>Contact the business to request access, correction or deletion of your enquiry. Records should be deleted when no longer needed to handle enquiries and applicable recordkeeping requirements.</p><ContactDetails/></section></div>}
      {page && !['/privacy/','/image-credits/','/contact/','/updates/','/links/'].includes(page.path) && <button onClick={()=>openQuote()} className="mt-10 rounded-full bg-blue-600 text-white px-7 py-3 font-bold">{brand ? `Request quote for ${brand.name}` : 'Discuss your requirements'}</button>}
      {!page && <a href="/" className="inline-block mt-8 text-blue-700 underline">Return to homepage</a>}
    </main>
    <footer className="bg-slate-800 text-white px-6 py-8"><div className="max-w-6xl mx-auto flex flex-wrap gap-5"><a href="/">Creations Overseas</a><a href="/about/">About Us</a><a href="/contact/">Contact Us</a><a href="/updates/">Updates</a><a href="/links/">Links</a><a href="/privacy/">Privacy</a><a href="/image-credits/">Image credits</a><a className="ml-auto" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a></div></footer>
    <QuoteRequestModal isOpen={quote} prefilledBrand={brand?.name || ''} prefill={prefill} onClose={()=>setQuote(false)}/>
  </div>;
}
