import { useEffect, useState } from 'react';
import { siteConfig } from '../siteConfig';
export function AnalyticsConsent() {
  const [choice, setChoice] = useState<string | null>(null);
  const configured = /^G-[A-Z0-9]+$/.test(siteConfig.gaId);
  useEffect(()=> { try { setChoice(localStorage.getItem('analytics-choice')); } catch {} }, []);
  useEffect(()=> {
    if (!configured || choice !== 'allowed' || document.getElementById('ga-loader')) return;
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.gtag = function() { w.dataLayer.push(arguments); };
    w.gtag('js', new Date()); w.gtag('config', siteConfig.gaId);
    const script = document.createElement('script'); script.id = 'ga-loader'; script.async = true; script.src = `https://www.googletagmanager.com/gtag/js?id=${siteConfig.gaId}`; document.head.append(script);
  }, [choice, configured]);
  if (!configured) return null;
  const choose = (value: string) => { try { localStorage.setItem('analytics-choice', value); } catch {} setChoice(value); if (value === 'declined') { (window as any)[`ga-disable-${siteConfig.gaId}`] = true; } else { (window as any)[`ga-disable-${siteConfig.gaId}`] = false; } };
  return choice === null ? <aside aria-label="Analytics choice" className="fixed bottom-4 left-4 right-4 z-40 max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-5 text-slate-900"><p className="text-sm">Allow optional analytics to help improve this website? <a href="/privacy/" className="underline">Privacy notice</a></p><div className="flex gap-3 mt-3"><button onClick={()=>choose('declined')} className="border rounded-full px-4 py-2">Decline</button><button onClick={()=>choose('allowed')} className="bg-blue-600 text-white rounded-full px-4 py-2">Allow analytics</button></div></aside> : <button onClick={()=>setChoice(null)} className="fixed bottom-2 right-2 z-30 rounded-full bg-white text-slate-800 border px-3 py-2 text-xs">Analytics preferences</button>;
}
