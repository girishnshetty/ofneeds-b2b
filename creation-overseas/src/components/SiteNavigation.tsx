import {useEffect,useRef,useState} from 'react';
import {Menu,X,ArrowUpRight,ChevronDown,Search} from 'lucide-react';
import {siteConfig} from '../siteConfig';
import {navigationGroups} from '../businessContent';
export function SiteNavigation({onQuote}:{onQuote:()=>void}) {
  const [mobile,setMobile]=useState(false);
  const [open,setOpen]=useState<string|null>(null);
  const [search,setSearch]=useState(false);
  const header=useRef<HTMLElement>(null);
  const dropdownTrigger=useRef<HTMLButtonElement|null>(null);
  const mobileTrigger=useRef<HTMLButtonElement|null>(null);
  const searchTrigger=useRef<HTMLButtonElement|null>(null);
  const searchInput=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(search)searchInput.current?.focus();},[search]);
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{if(!header.current?.contains(event.target as Node)){setOpen(null);setSearch(false);setMobile(false);}};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){if(open){setOpen(null);dropdownTrigger.current?.focus();return;}if(search){setSearch(false);searchTrigger.current?.focus();return;}if(mobile){setMobile(false);mobileTrigger.current?.focus();}}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[open,search,mobile]);
  const close=()=>{setOpen(null);setMobile(false);setSearch(false);};
  const quote=()=>{close();onQuote();};
  const groups=(prefix:string)=>navigationGroups.map(group=><div key={group.label} className="site-nav-group"><button onClick={event=>{dropdownTrigger.current=event.currentTarget;setOpen(open===group.label?null:group.label);}} aria-expanded={open===group.label} aria-controls={`${prefix}-${group.label.replaceAll(' ','-')}`}>{group.label}<ChevronDown aria-hidden="true" size={14}/></button>{open===group.label&&<div id={`${prefix}-${group.label.replaceAll(' ','-')}`} className="site-nav-dropdown">{group.items.map(([label,url])=><a key={url} href={url} onClick={close}>{label}</a>)}</div>}</div>);
  return <header ref={header} className="premium-header"><div className="premium-announcement"><span>Thoughtfully curated. Beautifully presented.</span><a href={`tel:${siteConfig.phone.replace(/[^+\d]/g,'')}`} className="hidden sm:inline" aria-label={`Call sales ${siteConfig.phone}`}>SALES · {siteConfig.phone}</a></div><nav aria-label="Main navigation" className="premium-nav premium-container"><a href="/" aria-label="Creations Overseas home"><img src={siteConfig.logo} alt="Creations Overseas" width="162" height="43" className="premium-logo"/></a><div className="premium-nav-links"><a href="/">Home</a>{groups('desktop-nav')}</div><div className="site-nav-actions"><button ref={searchTrigger} className="site-search-toggle" aria-label={search?'Close site search':'Open site search'} aria-expanded={search} aria-controls="site-search" onClick={()=>{setSearch(!search);setOpen(null);}}>{search?<X size={19}/>:<Search size={19}/>}</button><button onClick={quote} className="premium-button premium-button-dark site-desktop-quote">Request a quote<ArrowUpRight size={16}/></button><button ref={mobileTrigger} className="premium-menu-toggle" onClick={()=>{setMobile(!mobile);setOpen(null);}} aria-label={mobile?'Close navigation menu':'Open navigation menu'} aria-expanded={mobile} aria-controls="site-mobile-nav">{mobile?<X/>:<Menu/>}</button></div></nav>{mobile&&<nav id="site-mobile-nav" aria-label="Mobile navigation" className="premium-mobile-nav"><a href="/" onClick={close}>Home</a>{groups('mobile-nav')}<button onClick={quote} className="premium-button premium-button-dark">Request a quote<ArrowUpRight size={16}/></button></nav>}{search&&<form id="site-search" role="search" className="site-search-panel premium-container" onSubmit={event=>{event.preventDefault();const query=new FormData(event.currentTarget).get('query');window.location.href=`/?brand-search=${encodeURIComponent(String(query||''))}#portfolio`;}}><label htmlFor="site-search-input">Find a brand or gifting category</label><div><input ref={searchInput} id="site-search-input" name="query" type="search" required maxLength={100} placeholder="Try Raymond, apparel or backpack"/><button type="submit" className="premium-button premium-button-dark">Search<ArrowUpRight size={16}/></button></div></form>}</header>;
}

