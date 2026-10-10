// Shared interface behaviour: form semantics, registration steps and dialog focus.
let returnFocus = null;
let previousDialog = null;
let registrationStep = 0;
let registrationRole = '';
export function rememberFocus() {
  const el = document.activeElement;
  if (el?.dataset.action && el.dataset.action !== 'close-modal') returnFocus = { action: el.dataset.action, id: el.dataset.id, dealer: el.dataset.dealer };
}
export function enhanceInterface(root) {
  root.querySelectorAll('.field').forEach((field, index) => {
    const input = field.querySelector('input,select,textarea'); const label = field.querySelector('label');
    if (!input || !label) return;
    input.id ||= `field-${input.name || 'control'}-${index}`; label.htmlFor = input.id;
    const hint = field.querySelector('small');
    if (hint) { hint.id = `${input.id}-hint`; input.setAttribute('aria-describedby', hint.id); }
    const auto = { name: 'name', companyName: 'organization', email: 'email', mobile: 'tel', pin: 'postal-code', city: 'address-level2', state: 'address-level1', billingAddress: 'street-address', website: 'url' };
    if (auto[input.name]) input.autocomplete ||= auto[input.name];
    if (input.name === 'password' && !field.querySelector('.password-toggle')) {
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'password-toggle'; toggle.textContent = 'Show password'; toggle.setAttribute('aria-controls', input.id); toggle.setAttribute('aria-pressed', 'false');
      toggle.onclick = () => { const show = input.type === 'password'; input.type = show ? 'text' : 'password'; toggle.textContent = show ? 'Hide password' : 'Show password'; toggle.setAttribute('aria-pressed', String(show)); };
      field.append(toggle); input.autocomplete ||= root.querySelector('#register-form') ? 'new-password' : 'current-password';
    }
  });
  for (const control of root.querySelectorAll('[data-action]')) {
    if (['DIV','ARTICLE','H3'].includes(control.tagName) && !control.querySelector('button,a,input')) {
      control.tabIndex = 0; control.setAttribute('role', 'button');
      control.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); control.click(); } };
    }
  }
  const form = root.querySelector('#register-form');
  if (form) prepareRegistration(form); else { registrationRole = ''; registrationStep = 0; }
  root.querySelectorAll('.data-table').forEach(table => {
    const headings = [...table.querySelectorAll('thead th')].map(th => th.textContent);
    table.querySelectorAll('tbody tr').forEach(row => [...row.children].forEach((cell, i) => cell.dataset.label = headings[i] || 'Details'));
  });
  const authError = root.querySelector('#auth-message'); if (authError) { authError.setAttribute('role','alert'); authError.id = 'auth-message'; }
  const modalError = root.querySelector('#modal-message'); if (modalError) modalError.setAttribute('role','alert');
  const dialog = root.querySelector('[role="dialog"]');
  root.querySelector('.topbar').inert = Boolean(dialog);
  root.querySelector('.skip-link').inert = Boolean(dialog);
  root.querySelector('main').inert = Boolean(dialog);
  const footer = root.querySelector('footer'); if (footer) footer.inert = Boolean(dialog);
  document.body.classList.toggle('dialog-open', Boolean(dialog));
  if (dialog) {
    const title = dialog.querySelector('h2'); if (title) { title.id ||= 'dialog-title'; dialog.setAttribute('aria-labelledby', title.id); }
    dialog.querySelector('.modal-close')?.setAttribute('aria-label', 'Close dialog');
    const key = title?.textContent;
    if (key !== previousDialog || !dialog.contains(document.activeElement)) { dialog.querySelector('.modal-close')?.focus({preventScroll:true}); dialog.scrollTop = 0; }
    dialog.onkeydown = event => {
      if (event.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    previousDialog = key;
  } else if (previousDialog) {
    previousDialog = null;
    const trigger = [...root.querySelectorAll('[data-action]')].find(el => el.dataset.action === returnFocus?.action && el.dataset.id === returnFocus?.id && el.dataset.dealer === returnFocus?.dealer);
    (trigger || root.querySelector('main button,main a,.brand-lockup'))?.focus();
    returnFocus = null;
  }
  root.querySelectorAll('img').forEach(img => { img.addEventListener('error', () => { img.hidden = true; const note = document.createElement('span'); note.className = 'image-fallback'; note.textContent = `${img.alt || 'Product'} · image unavailable`; img.after(note); }, { once: true }); });
}
function prepareRegistration(form) {
  const role = form.elements.role.value;
  form.elements.gstin.pattern = '[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z][zZ][0-9A-Za-z]';
  form.elements.gstin.title = 'Enter a valid 15-character GSTIN';
  if (role !== registrationRole) { registrationStep = 0; registrationRole = role; }
  const fields = [...form.querySelectorAll('.field-grid > .field')];
  const groups = [['companyName','name','email','mobile','companyType','password'], ['gstin','pan','pin','city','state','website','dealerType','brand','billingAddress','shippingAddress'], ['gstDocument','authorizationDocument','businessDocument']];
  const steps = document.createElement('div'); steps.className = 'registration-progress'; steps.setAttribute('aria-label','Registration progress');
  const titles = ['Account','Business','Documents'];
  steps.innerHTML = titles.map((title, i) => `<span ${i === registrationStep ? 'aria-current="step"' : ''}>${i + 1}. ${title}</span>`).join(''); form.prepend(steps);
  const heading = document.createElement('h3'); heading.className = 'registration-step-title'; form.insertBefore(heading, form.querySelector('.field-grid'));
  const shipping = form.elements.shippingAddress;
  if (shipping) {
    const label = document.createElement('label'); label.className = 'same-address';
    label.innerHTML = '<input type="checkbox"> Shipping address matches billing address';
    shipping.closest('.field').prepend(label);
    label.firstChild.onchange = () => { if (label.firstChild.checked) shipping.value = form.elements.billingAddress.value; shipping.readOnly = label.firstChild.checked; };
    form.elements.billingAddress.addEventListener('input', () => { if (label.firstChild.checked) shipping.value = form.elements.billingAddress.value; });
  }
  const actions = form.querySelector('.form-actions'); const submit = actions.querySelector('button');
  const back = document.createElement('button'); back.type = 'button'; back.className = 'btn btn-outline'; back.textContent = 'Back';
  const next = document.createElement('button'); next.type = 'button'; next.className = 'btn btn-primary'; next.textContent = 'Continue →';
  actions.prepend(back, next);
  const sync = () => {
    fields.forEach(field => field.hidden = !groups[registrationStep].includes(field.querySelector('input[name],select[name],textarea[name]')?.name));
    [...steps.children].forEach((step, i) => i === registrationStep ? step.setAttribute('aria-current','step') : step.removeAttribute('aria-current'));
    heading.textContent = ['Your account details','Your registered business','Upload verification documents'][registrationStep];
    back.hidden = registrationStep === 0; next.hidden = registrationStep === 2; submit.hidden = registrationStep !== 2;
  };
  next.onclick = () => { const invalid = fields.filter(field => !field.hidden).flatMap(field => [...field.querySelectorAll('input,select,textarea')]).find(input => !input.checkValidity()); if (invalid) return invalid.reportValidity(); registrationStep++; sync(); heading.scrollIntoView({block:'center',behavior:'smooth'}); fields.find(field => !field.hidden)?.querySelector('input[name],select[name]')?.focus(); };
  back.onclick = () => { registrationStep = Math.max(0,registrationStep - 1); sync(); };
  form.addEventListener('invalid', event => { const i = groups.findIndex(group => group.includes(event.target.name)); if (i >= 0) { registrationStep = i; sync(); } }, true);
  sync();
}

export function helpPage(config = {}) {
  return `<main class="page-wrap help-page"><header class="page-header"><span class="section-kicker">Help & marketplace information</span><h1>A clearer way to source.</h1><p>Understand business verification, stock holds and the information shared on OfNeeds.</p></header><div class="help-grid"><section><h2>Business verification</h2><p>Business accounts are reviewed by an administrator. Buyer pricing and procurement tools require an approved account and verified GSTIN. Supplier brand relationships are reviewed separately from business approval.</p><p>In this local demonstration, GST review is manual and seeded accounts illustrate the workflow. A badge is an access status, not an independent guarantee of a supplier or product.</p><h2>Stock holds & quotations</h2><p>A stock hold request lasts up to 24 hours and requires supplier approval. Confirm the purchase order, any minimum stock charge, taxes, delivery and payment terms directly with the supplier before the hold expires. OfNeeds does not collect payments here.</p><p>A quotation request can be sent even when stock is unavailable. Availability and price may change; the server checks stock when a hold is submitted.</p><h2>Documents & account data</h2><p>Uploaded business documents are stored privately and can be opened by signed-in administrators for review. Suppliers do not receive your uploaded registration documents. Prices and supplier contact details remain restricted by account permissions.</p><p>This demonstration uses a session cookie to keep you signed in. A production privacy policy, retention schedule and commercial terms must be supplied by the business before launch.</p></section><aside class="help-card"><span class="section-kicker">Need a hand?</span><h2>Request assistance</h2><p>Ask about verification, accessing your account or a marketplace walkthrough.</p><form id="support-form"><div class="field"><label>Your name</label><input name="name" autocomplete="name" required maxlength="120"></div><div class="field"><label>Business email</label><input name="email" type="email" autocomplete="email" required maxlength="200"></div><div class="field"><label>What do you need help with?</label><textarea name="message" required maxlength="2000" rows="4"></textarea></div><div id="auth-message"></div><button class="btn btn-primary">Save assistance request</button><p class="form-note">${config.emailReady ? 'Requests are saved for administrator review.' : 'Requests are saved for administrator review. Email delivery is awaiting service configuration.'} Do not include passwords or confidential documents.</p></form></aside></div></main>`;
}

export function homePreview() {
  const categories = [['Audio & Electronics','Sound, technology and everyday essentials','headphones'],['Bags & Travel','Practical companions for every journey','bag'],['Drinkware','Useful gifts that stay on the desk','cup'],['Apparel & Lifestyle','Ideas for teams, events and celebrations','shirt']];
  const photos = { headphones: ['audio','Graphite headphones and ivory wireless earbuds'], bag: ['bags','Taupe laptop backpack and charcoal cabin suitcase'], cup: ['drinkware','Ivory steel bottle and ceramic coffee mug'], shirt: ['apparel','Folded ivory polo shirt, taupe cap and leather cardholder'] };
  return `<section class="trust-strip" aria-label="How marketplace access works"><div>${iconShield()}<span><strong>Business accounts reviewed</strong><small>GST and business details checked</small></span></div><div>${iconShield()}<span><strong>Brand authorization reviewed</strong><small>A separate check for supplier listings</small></span></div><div>${iconShield()}<span><strong>Direct supplier conversations</strong><small>Agree your commercial terms together</small></span></div></section><section class="category-preview"><div class="landing-section-heading"><span class="landing-eyebrow">Ideas for your next brief</span><h2>Discover the gifting range.</h2><p>Explore the brand directory. Verified business accounts unlock product listings, stock and supplier connections.</p></div><div class="category-grid">${categories.map(([name,copy,icon]) => `<a href="#brands" data-action="discover-range" data-category="${icon === 'headphones' ? 'Electronics' : icon === 'bag' ? 'Bags & Backpacks' : icon === 'cup' ? 'Drinkware' : 'Corporate Apparel'}" class="category-card"><div class="category-art"><img src="/assets/categories/${photos[icon][0]}.webp" srcset="/assets/categories/${photos[icon][0]}-768.webp 768w, /assets/categories/${photos[icon][0]}.webp 1536w" sizes="(max-width:350px) calc(100vw - 36px), (max-width:760px) calc((100vw - 50px) / 2), (max-width:1120px) calc((100vw - 112px) / 4), 282px" alt="${photos[icon][1]}" width="1536" height="1024" loading="lazy" decoding="async"></div><h3>${name}</h3><p>${copy}</p><span>Explore brands →</span></a>`).join('')}</div></section>`;
}
function iconShield() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 3 8 3v5c0 5-4 8-8 10-4-2-8-5-8-10V6z"/><path d="m8 12 3 3 5-6"/></svg>'; }
export function homepageFAQ() {
  return `<section class="homepage-faq" id="faq"><div><span class="landing-eyebrow">Before you get started</span><h2>Good questions.<br>Clear answers.</h2><a class="text-link" href="#help" data-page="help">Visit the help centre →</a></div><div>${[['Who can join OfNeeds?','Corporate gifting businesses can apply as buyers. Brand dealers and distributors can apply as suppliers with their business and authorization documents.'],['When can I see prices and stock?','Product listings and stock require validated business access. B2B prices, supplier contacts, holds and quote requests are available to approved GST-verified buyers.'],['Does a directory entry mean stock is available?','No. The directory helps you discover brands. Live supply depends on approved suppliers and their current product listings.'],['How do stock holds work?','Request a hold for up to 24 hours. The supplier must approve it; confirm the purchase order and any minimum stock charge directly with them before expiry.']].map(([q,a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>`;
}

export function giftingBriefs() {
  const briefs = [ ['01 / ONBOARDING','A welcome worth keeping.','Useful essentials for a team’s first day.',['Backpacks & laptop accessories','Drinkware for the everyday','Notebooks & desk essentials'],'Bags & Backpacks'], ['02 / CLIENT RELATIONSHIPS','Make the gesture count.','Considered gifts for the people who help your business grow.',['Audio & technology','Writing instruments','Thoughtful gift packaging'],'Premium Gifting'], ['03 / TEAM MILESTONES','Celebrate the people behind it.','Ideas for shared achievements, events and recognition.',['Apparel & lifestyle','Travel accessories','Personal everyday essentials'],'Corporate Apparel'] ];
  return '<section class="gifting-briefs"><div class="brief-heading"><div><span class="landing-eyebrow">Start with the occasion</span><h2>A thoughtful brief.<br>A better starting point.</h2></div><a class="text-link" href="#brands" data-page="brands">Explore the brand directory →</a></div><div class="brief-grid">' + briefs.map(([eyebrow,title,copy,ideas,category]) => '<article class="brief-card"><span>'+eyebrow+'</span><h3>'+title+'</h3><p>'+copy+'</p><ul>'+ideas.map(idea=>'<li>'+idea+'</li>').join('')+'</ul><button class="text-link" data-action="discover-range" data-category="'+category+'">Discover suitable brands →</button></article>').join('') + '</div></section>';
}
