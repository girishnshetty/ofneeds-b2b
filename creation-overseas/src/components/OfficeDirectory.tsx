import { MapPin, Phone, ArrowUpRight } from 'lucide-react';
import { offices } from '../businessContent';
import { siteConfig } from '../siteConfig';
export function OfficeDirectory({compact=false,officeId}:{compact?:boolean;officeId?:string}) {
  return <section className={`office-directory ${compact?'office-directory-compact':''}`} aria-labelledby="office-directory-title">
    <p className="premium-eyebrow">VISIT OR GET IN TOUCH</p><h2 id="office-directory-title">{officeId?'Office details':'Our offices & showroom'}</h2>
    <p className="office-directory-intro">For enquiries to any location, call our central sales team at <a href={`tel:${siteConfig.phone.replace(/[^+\d]/g,'')}`}>{siteConfig.phone}</a>.</p>
    <div className="office-directory-grid">{offices.filter(office=>!officeId || office.id===officeId).map(office=>{
      const address=office.id==='hyderabad'?siteConfig.address:office.address;
      const map=office.id==='hyderabad'?siteConfig.mapsUrl:office.map || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      return <article key={office.id} className="office-card"><div className="office-kind"><MapPin size={17}/><span>{office.kind}</span></div><h3>{office.city}</h3><address>{address}</address><a className="office-phone" href={`tel:${siteConfig.phone.replace(/[^+\d]/g,'')}`}><Phone size={15}/> {siteConfig.phone}</a><p className="office-phone-label">Central sales enquiries</p><a className="premium-text-link" href={map} target="_blank" rel="noopener noreferrer">View address on map <ArrowUpRight size={15}/></a></article>;
    })}</div>
  </section>;
}
