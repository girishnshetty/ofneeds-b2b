import { demoContacts, siteConfig } from '../siteConfig';
export function ContactDetails({showAddress=true}:{showAddress?:boolean} = {}) {
  return <div className="space-y-2 text-sm break-words">
    <p>{demoContacts ? <span>{siteConfig.email}</span> : <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>}</p>
    <p>{demoContacts ? <span>{siteConfig.phone}</span> : <><a href={`tel:${siteConfig.phone.replace(/[^+\d]/g, '')}`}>{siteConfig.phone}</a>{siteConfig.whatsapp && <> · <a href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}</>}</p>
    {showAddress && siteConfig.address && <div className="pt-2"><p className="text-xs font-semibold mb-1">Head office · Hyderabad</p><p>{siteConfig.address}</p><a href={siteConfig.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 underline text-xs">Get directions ↗</a></div>}
    {demoContacts && <p className="text-xs opacity-75">Demo contact details — use the enquiry form to save your request.</p>}
  </div>;
}
