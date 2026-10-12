import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { BRANDS_DATA } from '../data/seoData';
import { AccessibleDialog } from './AccessibleDialog';
import { ContactDetails } from './ContactDetails';
import { track } from '../siteConfig';

export type EnquiryPrefill = { fullName?: string; companyName?: string; email?: string; notes?: string; deliveryCity?: string };
const empty = { fullName: '', companyName: '', email: '', phone: '', brand: 'Any / Multiple Brands', quantity: '100 - 250 units', budget: '', deliveryCity: '', targetDate: '', notes: '', website: '' };
export function QuoteRequestModal({ isOpen, prefilledBrand = '', prefill, onClose }: { isOpen: boolean; prefilledBrand?: string; prefill?: EnquiryPrefill; onClose: () => void }) {
  const [form, setForm] = useState(empty);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    if (isOpen) {
      setForm({ ...empty, ...prefill, brand: prefilledBrand || empty.brand });
      setReference(''); setError(''); setBusy(false);
    }
  }, [isOpen, prefilledBrand, prefill]);
  const update = (key: keyof typeof empty, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const currentGeneration = generation.current;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok || !result.saved || !result.reference) throw new Error(result.error || 'Your enquiry could not be saved. Please try again.');
      if (currentGeneration !== generation.current) return;
      setReference(result.reference);
      track('quote_request', { brand: form.brand, quantity: form.quantity });
    } catch (problem) {
      if (currentGeneration === generation.current) setError(problem instanceof Error ? problem.message : 'Connection interrupted. Please try again.');
    } finally { if (currentGeneration === generation.current) setBusy(false); }
  };
  const inputClass = 'w-full border border-slate-300 bg-slate-50 rounded-xl px-3 py-3 text-base text-slate-900';
  return <AccessibleDialog open={isOpen} onClose={onClose} title="quote-title">
    <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-slate-200 shrink-0">
      <div><p className="text-xs font-semibold text-blue-600 mb-1">CREATIONS OVERSEAS</p><h2 id="quote-title" className="text-xl sm:text-2xl font-bold">Request a corporate quote</h2></div>
      <button type="button" aria-label="Close quotation form" onClick={onClose} className="rounded-full p-3 bg-slate-100 shrink-0"><X aria-hidden="true" size={20}/></button>
    </div>
    <div className="overflow-y-auto min-h-0 p-5 sm:p-6">
      {reference ? <div role="status" className="space-y-5 text-center py-6">
        <CheckCircle2 className="mx-auto text-emerald-600" size={48}/><h3 className="text-2xl font-bold">Your enquiry has been saved</h3>
        <p>Thank you, {form.fullName}. Keep this reference for your request.</p><p className="font-mono text-xs break-all bg-slate-100 p-3 rounded-xl">{reference}</p>
        <p className="text-sm text-slate-600">Availability, pricing and delivery dates are confirmed separately.</p><ContactDetails/>
        <button onClick={onClose} className="rounded-full bg-blue-600 text-white px-6 py-3">Done</button>
      </div> : <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-slate-600">Share a few details to get started. Fields marked * are required.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="quote-name">Your name *</label><input autoComplete="name" id="quote-name" required maxLength={200} value={form.fullName} onChange={e=>update('fullName',e.target.value)} className={inputClass}/></div>
          <div><label htmlFor="quote-company">Company *</label><input autoComplete="organization" id="quote-company" required maxLength={200} value={form.companyName} onChange={e=>update('companyName',e.target.value)} className={inputClass}/></div>
          <div><label htmlFor="quote-email">Email *</label><input autoComplete="email" id="quote-email" type="email" required maxLength={200} value={form.email} onChange={e=>update('email',e.target.value)} className={inputClass}/></div>
          <div><label htmlFor="quote-phone">Phone / WhatsApp (optional)</label><input autoComplete="tel" id="quote-phone" type="tel" maxLength={25} value={form.phone} onChange={e=>update('phone',e.target.value)} className={inputClass}/></div>
          <div><label htmlFor="quote-quantity">Quantity *</label><select id="quote-quantity" value={form.quantity} onChange={e=>update('quantity',e.target.value)} className={inputClass}>{['Under 50 units','50 - 100 units','100 - 250 units','250 - 500 units','500 - 1,000 units','1,000+ units'].map(v=><option key={v}>{v}</option>)}</select></div>
          <div><label htmlFor="quote-brand">Brand (optional)</label><select id="quote-brand" value={form.brand} onChange={e=>update('brand',e.target.value)} className={inputClass}><option>Any / Multiple Brands</option>{[...BRANDS_DATA].sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'})).map(b=><option key={b.slug}>{b.name}</option>)}</select></div>
        </div>
        <div><label htmlFor="quote-notes">What are you looking for?</label><textarea id="quote-notes" rows={3} maxLength={4000} value={form.notes} onChange={e=>update('notes',e.target.value)} className={inputClass} placeholder="Occasion, products or logo requirements"/></div>
        <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-medium">Budget and delivery details (optional)</summary><div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div><label htmlFor="quote-budget">Budget per gift</label><select id="quote-budget" value={form.budget} onChange={e=>update('budget',e.target.value)} className={inputClass}>{['','Under ₹500','₹500 - ₹1,500','₹1,500 - ₹3,500','₹3,500 - ₹7,000','₹7,000+ Luxury'].map(v=><option key={v} value={v}>{v || 'Not decided yet'}</option>)}</select></div>
          <div><label htmlFor="quote-city">Delivery city</label><input id="quote-city" maxLength={200} value={form.deliveryCity} onChange={e=>update('deliveryCity',e.target.value)} className={inputClass}/></div>
          <div><label htmlFor="quote-date">Preferred delivery date</label><input id="quote-date" type="date" value={form.targetDate} onChange={e=>update('targetDate',e.target.value)} className={inputClass}/></div>
        </div></details>
        <div className="hidden" aria-hidden="true"><label htmlFor="quote-website">Leave this empty</label><input id="quote-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>update('website',e.target.value)}/></div>
        <p className="text-xs text-slate-600">We use your details to handle this enquiry. Read our <a className="underline" href="/privacy/">privacy notice</a>.</p>
        {error && <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-3">{error}</p>}
        <button disabled={busy} className="w-full rounded-full py-3 bg-blue-600 text-white font-bold disabled:opacity-60">{busy ? 'Saving your enquiry…' : 'Submit quote request'}</button>
      </form>}
    </div>
  </AccessibleDialog>;
}
