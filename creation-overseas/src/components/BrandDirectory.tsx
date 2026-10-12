import {useEffect, useState} from 'react';
import {ArrowUpRight, Bookmark, Check, Search, X} from 'lucide-react';
import {BRANDS_DATA, CATEGORIES_DATA} from '../data/seoData';
import {BrandLogo} from './BrandLogo';
import {EnquiryPrefill} from './QuoteForm';
import {track} from '../siteConfig';

const brands = [...BRANDS_DATA].sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'}));
const labels: Record<string,string> = {all:'All brands',Apparel:'Apparel',Backpack:'Bags & backpacks',Trolley:'Travel',Electronics:'Tech & audio','Lunch Box':'Drinkware & lunch','Home & Living':'Home & living',Gadgets:'Tech & audio',Accessories:'Accessories'};
const categoryLabel = (categories:string[]) => [...new Set(categories.map(c=>labels[c] || c))].join(' · ');
const shortlistKey = 'creations-brand-shortlist';
function savedShortlist():string[] {
  if (typeof window==='undefined') return [];
  try {
    const saved:unknown = JSON.parse(window.sessionStorage.getItem(shortlistKey) || '[]');
    return Array.isArray(saved) ? brands.filter(b=>saved.includes(b.slug)).map(b=>b.slug) : [];
  } catch { return []; }
}

export function BrandDirectory({onQuote}:{onQuote:(details:EnquiryPrefill)=>void}) {
  const [category,setCategory] = useState('all');
  const [search,setSearch] = useState(()=>typeof window==='undefined'?'':new URLSearchParams(window.location.search).get('brand-search') || '');
  const [shortlist,setShortlist] = useState<string[]>(savedShortlist);
  useEffect(()=>{try { window.sessionStorage.setItem(shortlistKey,JSON.stringify(shortlist)); } catch { /* Browsing remains available when storage is disabled. */ }},[shortlist]);
  const visible = brands.filter(b=>(category==='all' || b.categories.includes(category) || (category==='Electronics' && b.categories.includes('Gadgets'))) && `${b.name} ${b.categories.join(' ')} ${categoryLabel(b.categories)}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = brands.filter(b=>shortlist.includes(b.slug));
  const toggle = (slug:string) => setShortlist(current=>current.includes(slug)?current.filter(s=>s!==slug):[...current,slug]);
  const clear = () => {setCategory('all');setSearch('');};
  return <section id="portfolio" className="premium-section premium-container">
    <div className="premium-section-heading"><div><p className="premium-eyebrow">THE BRAND DIRECTORY · A–Z</p><h2>Find your brands.<br/><em>Build your gifting brief.</em></h2></div><p>Explore the options. Shortlist your favourites.<br/>We’ll help bring the selection together.</p></div>
    <div id="categories" className="premium-catalog-tools"><div className="premium-search"><Search size={18} aria-hidden="true"/><input type="search" aria-label="Search brands or categories" placeholder="Find a brand or category" value={search} onChange={e=>setSearch(e.target.value)}/></div><span role="status" aria-live="polite">{visible.length} of {brands.length} brands</span>{(search || category!=='all') && <button className="catalog-reset" onClick={clear}>Reset filters <X size={14} aria-hidden="true"/></button>}</div>
    <div className="premium-category-pills" aria-label="Filter brands by category">{CATEGORIES_DATA.map(c=><button key={c.id} aria-pressed={category===c.id} onClick={()=>{setCategory(c.id);track('category_view',{category:c.name});}}>{labels[c.id] || c.name}</button>)}</div>
    <div className="premium-brand-grid">{visible.map(b=><article key={b.slug} className="premium-brand-card">
      <a href={`/brands/${b.slug}/`} className="brand-catalog-link"><div className="premium-brand-logo"><BrandLogo slug={b.slug} name={b.name}/></div><div className="premium-brand-content"><h3>{b.name}</h3><p>{categoryLabel(b.categories)}</p><span>Explore options <ArrowUpRight size={16} aria-hidden="true"/></span></div></a>
      <button className="brand-shortlist-toggle" aria-label={`${shortlist.includes(b.slug)?'Remove':'Add'} ${b.name} ${shortlist.includes(b.slug)?'from':'to'} shortlist`} aria-pressed={shortlist.includes(b.slug)} onClick={()=>toggle(b.slug)}>{shortlist.includes(b.slug)?<Check size={15} aria-hidden="true"/>:<Bookmark size={15} aria-hidden="true"/>}{shortlist.includes(b.slug)?'Shortlisted':'Shortlist brand'}</button>
    </article>)}</div>
    {visible.length===0 && <div className="premium-empty"><h3>No matches this time.</h3><p>Try a different brand name or browse all categories.</p><button onClick={clear}>Show all brands</button></div>}
    {selected.length>0 && <aside className="catalog-shortlist" aria-label="Your brand shortlist"><div><p className="premium-eyebrow">YOUR GIFTING SHORTLIST</p><p role="status" aria-live="polite">{selected.length} {selected.length===1?'brand':'brands'} selected</p><div className="shortlist-chips">{selected.map(b=><button key={b.slug} aria-label={`Remove ${b.name} from shortlist`} onClick={()=>toggle(b.slug)}>{b.name}<X size={13} aria-hidden="true"/></button>)}</div></div><div className="shortlist-actions"><button className="premium-button premium-button-dark" onClick={()=>onQuote({notes:`Brand shortlist: ${selected.map(b=>b.name).join(', ')}.\nPlease help me choose suitable products and customization.`})}>Request shortlist quote <ArrowUpRight size={17} aria-hidden="true"/></button><button className="catalog-reset" onClick={()=>setShortlist([])}>Clear shortlist</button></div></aside>}
    <p className="catalog-guidance">Product availability, minimum quantities and customization are confirmed in your quotation.</p>
  </section>;
}
