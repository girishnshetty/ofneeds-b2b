import { useState } from 'react';
import { brandLogoAssets } from '../brandAssets';
const widths: Record<string,number> = { 'raymond':150,'swiss-military':165,'monte-carlo':165,'bugatti':180,'jack-and-jones':180,'pepe-jeans':140,'turtle':170,'glasafe':145,'toreto':170,'nasher-miles':175,'power-plus':165 };
export function BrandLogo({ slug, name, className = '' }: {slug:string;name:string;className?:string}) {
  const [failed,setFailed]=useState(false);
  if(failed || !brandLogoAssets[slug]) return <span className="brand-logo-fallback">{name}</span>;
  return <img className={`official-brand-mark ${className}`} src={brandLogoAssets[slug].image} alt={`${name} logo`} style={{maxWidth:widths[slug]||170}} width="180" height="80" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>;
}
