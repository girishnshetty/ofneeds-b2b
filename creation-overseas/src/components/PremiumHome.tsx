import {BrandDirectory} from './BrandDirectory';
import {publishedUpdates, offices} from '../businessContent';
import {SiteNavigation} from "./SiteNavigation";
import {OfficeDirectory} from "./OfficeDirectory";
import { BrandLogo } from "./BrandLogo";
import { useState } from 'react';
import { ArrowUpRight, ArrowRight, Package, Sparkles, Truck } from 'lucide-react';
import { BRANDS_DATA } from '../data/seoData';
import { QuoteRequestModal, EnquiryPrefill } from './QuoteForm';
import { ContactDetails } from './ContactDetails';
import { photography } from '../photography';
import { siteConfig } from '../siteConfig';

const brands = [...BRANDS_DATA].sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'}));
const occasions = [
  { title:'A warm welcome.', label:'EMPLOYEE WELCOME KITS', copy:'Useful essentials for a thoughtful first day.', path:'/employee-welcome-kits/', image:photography.welcome },
  { title:'A meaningful thank you.', label:'CLIENT & EXECUTIVE GIFTS', copy:'Considered choices for the relationships that matter.', path:'/corporate-gifts/', image:photography.travel },
  { title:'A reason to celebrate.', label:'FESTIVE GIFTS & HAMPERS', copy:'Beautiful presentation for shared milestones.', path:'/festive-hampers/', image:photography.packaging },
];
const faqs = [
  ['What is the minimum order quantity?', 'Minimum quantities vary by product, brand and customization. Share your requirement to confirm availability and volume pricing.'],
  ['Can I add my company logo?', 'Discuss printing, embroidery, engraving or branded packaging. The suitable method depends on the material and brand permissions.'],
  ['Can you deliver to multiple locations?', 'Share your delivery cities or postcodes to confirm coverage, individual dispatch options and charges.'],
  ['How do I choose gifts within my budget?', 'Tell us the occasion, quantity and budget per gift. Your quotation will confirm product choices, customization, taxes and delivery costs.'],
];
export default function PremiumHome() {
  const [quote, setQuote] = useState(false);
  const [prefill, setPrefill] = useState<EnquiryPrefill>({});
  const openQuote = (details: EnquiryPrefill = {}) => {setPrefill(details);setQuote(true);};
  return <div className="premium-home">
    <SiteNavigation onQuote={()=>openQuote()}/>

    <section id="home" className="premium-hero premium-container">
      <div className="premium-hero-copy">
        <p className="premium-eyebrow"><span/> THE ART OF CORPORATE GIFTING</p>
        <h1>A thoughtful gift.<br/><em>A lasting impression.</em></h1>
        <p className="premium-hero-description">For the people who move your business forward. Curated corporate gifts, welcome kits and branded merchandise for your team and clients.</p>
        <div className="premium-hero-actions"><button className="premium-button premium-button-dark" onClick={()=>openQuote()}>Let’s curate your gifts <ArrowUpRight size={18}/></button><a className="premium-text-link" href="#collections">Explore collections <ArrowRight size={17}/></a></div>
        <div className="premium-hero-benefits"><span><Package size={17}/> Branded merchandise</span><span><Sparkles size={17}/> Logo customization</span><span><Truck size={17}/> Delivery planning</span></div>
      </div>
    </section>

    <section className="premium-brand-ribbon" aria-labelledby="brand-ribbon-title"><div className="premium-container"><div className="premium-ribbon-heading"><p id="brand-ribbon-title" className="premium-eyebrow">A WORLD OF BRANDS TO EXPLORE</p><a href="#portfolio" className="premium-text-link">View all {brands.length} brands <ArrowUpRight size={16}/></a></div><div className="premium-ribbon-logos">{['Raymond','Swiss Military','Monte Carlo','Jack & Jones','Pepe Jeans London','Nasher Miles'].map(name=>{const b=brands.find(b=>b.name===name)!;return <a key={name} href={`/brands/${b.slug}/`} aria-label={`Explore ${name}`}><BrandLogo slug={b.slug} name={b.name}/></a>;})}</div></div></section>

    <section id="collections" className="premium-section premium-container">
      <div className="premium-section-heading"><div><p className="premium-eyebrow">THE OCCASION EDIT</p><h2>Every occasion deserves<br/><em>something considered.</em></h2></div><p>A first day. A shared success. A festive celebration.<br/>Start with the moment, and make it memorable.</p></div>
      <div className="premium-occasion-grid">{occasions.map((o,i)=><a key={o.path} href={o.path} className="premium-occasion-card"><div className="premium-occasion-photo"><img src={o.image.src} alt={o.image.alt} width="800" height="600" loading="lazy"/><span>0{i+1}</span><div className="premium-occasion-arrow"><ArrowUpRight size={22}/></div></div><p className="premium-eyebrow">{o.label}</p><h3>{o.title}</h3><p className="premium-card-copy">{o.copy}</p></a>)}</div>
      <p className="premium-photo-note">Stock photography for gifting inspiration. Exact products and packaging are confirmed in your quotation.</p>
    </section>

    <section className="premium-materials"><div className="premium-container premium-material-grid"><figure><img src={photography.apparel.src} alt={photography.apparel.alt} width="1000" height="667" loading="lazy"/><figcaption>Apparel & everyday essentials</figcaption></figure><div className="premium-material-copy"><p className="premium-eyebrow">USEFUL. PERSONAL. WELL CHOSEN.</p><h2>Gifts they’ll reach for.<br/><em>Again and again.</em></h2><p>From a bag for the everyday commute to apparel for the whole team, the best gifts become part of someone’s day.</p><a href="/corporate-merchandise/" className="premium-text-link">Discover branded merchandise <ArrowUpRight size={18}/></a><div className="premium-material-detail"><img src={photography.drinkware.src} alt={photography.drinkware.alt} width="240" height="300" loading="lazy"/><div><p className="premium-eyebrow">THE EVERYDAY EDIT</p><h3>A little more thought.<br/>A little more useful.</h3><a href="/customized-corporate-gifts/">Explore customization →</a></div></div></div></div></section>

    <BrandDirectory onQuote={openQuote}/>

    <section id="trust" className="premium-process"><div className="premium-container"><div className="premium-section-heading"><div><p className="premium-eyebrow">FROM THE FIRST IDEA TO THE FINAL DETAIL</p><h2>Your gifting brief.<br/><em>Thoughtfully brought together.</em></h2></div><a href="#contact" className="premium-text-link">Tell us what you have in mind <ArrowUpRight size={18}/></a></div><div className="premium-process-grid">{[['01','Choose with purpose.','Share your occasion, recipients and budget. Explore brands and products that suit the moment.'],['02','Make it personal.','Discuss your logo, packaging and finishing touches. Confirm artwork and product details before ordering.'],['03','Plan the delivery.','Agree quantities, destination locations and timelines. Your quotation confirms availability and charges.']].map(([number,title,copy])=><article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div><div className="premium-budget"><p>Start with your budget per gift.</p><div>{['Under ₹500','₹500–₹1,500','₹1,500–₹3,500','₹3,500+'].map(b=><button key={b} onClick={()=>openQuote({notes:`Budget preference: ${b} per gift`})}>{b} <ArrowUpRight size={14}/></button>)}</div></div></div></section>

    <section className="premium-company premium-container" aria-labelledby="company-heading">
      <div className="company-story"><p className="premium-eyebrow">THE PEOPLE BEHIND THE GIFTS</p><h2 id="company-heading">A personal approach.<br/><em>A connected business.</em></h2><p>Meet the team behind Creations Overseas and discover our offices, showroom and published company updates.</p><div className="company-facts"><div><strong>{brands.length}</strong><span>Brands to explore</span></div><div><strong>{offices.length}</strong><span>Offices & showroom</span></div></div><a href="/about/" className="premium-text-link">Discover our story <ArrowUpRight size={17}/></a></div>
      <div className="company-journal"><div className="journal-heading"><p className="premium-eyebrow">FROM THE COMPANY JOURNAL</p><a href="/updates/">All updates ↗</a></div>{publishedUpdates.slice(0,2).map(update=><a className="journal-card" key={update.url} href={update.url} target="_blank" rel="noopener noreferrer"><p className="premium-eyebrow">{update.category} · <time dateTime={update.date}>{new Date(update.date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}</time></p><h3>{update.title}</h3><p>{update.description}</p><span>Read on the official website <ArrowUpRight size={16}/></span></a>)}</div>
    </section>

    <section id="locations" className="premium-section premium-container"><OfficeDirectory/></section>

    <section id="faqs" className="premium-faq premium-container"><div><p className="premium-eyebrow">A FEW THINGS, ANSWERED</p><h2>A little clarity.<br/><em>Before you begin.</em></h2></div><div>{faqs.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>

    <section id="contact" className="premium-contact"><div className="premium-container premium-contact-grid"><div><p className="premium-eyebrow">LET’S MAKE IT MEANINGFUL</p><h2>Your next gift<br/><em>starts with a conversation.</em></h2><p>Tell us the occasion and what you have in mind.<br/>We’ll help you explore the possibilities.</p><div className="premium-contact-details"><ContactDetails/></div></div><form onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);openQuote({fullName:String(data.get('fullName')||''),companyName:String(data.get('companyName')||''),email:String(data.get('email')||''),notes:String(data.get('notes')||'')});}}><div className="premium-contact-fields"><div><label htmlFor="contact-fullName">Your name *</label><input id="contact-fullName" name="fullName" required maxLength={200} autoComplete="name" placeholder="Full name"/></div><div><label htmlFor="contact-companyName">Company *</label><input id="contact-companyName" name="companyName" required maxLength={200} autoComplete="organization" placeholder="Company name"/></div></div><label htmlFor="contact-email">Work email *</label><input id="contact-email" name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@company.com"/><label htmlFor="contact-notes">What are you planning?</label><textarea id="contact-notes" name="notes" rows={3} maxLength={4000} placeholder="Occasion, quantities or a gifting idea…"/><button type="submit" className="premium-button premium-button-gold">Continue to quote details <ArrowUpRight size={18}/></button><p className="premium-form-note">Confirm your quantity and preferences in the next step.</p></form></div></section>
    <footer className="premium-footer premium-container"><a href="#home"><img src={siteConfig.logo} alt="Creations Overseas" width="155" height="40"/></a><p>Thoughtful gifting. Lasting impressions.</p><div><a href="/about/">About Us</a><a href="/contact/">Contact Us</a><a href="/updates/">Updates</a><a href="/links/">Links</a><a href="/privacy/">Privacy</a><a href="/image-credits/">Image credits</a></div><span>© {new Date().getFullYear()} Creations Overseas</span></footer>
    <QuoteRequestModal isOpen={quote} prefill={prefill} onClose={()=>setQuote(false)}/>
  </div>;
}
