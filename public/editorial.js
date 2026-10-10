const articles = [
  {
    slug: 'finding-the-right-brand-dealer',
    category: 'Sourcing guide',
    title: 'The right gift starts with the right dealer.',
    summary: 'A practical way to move from a brand on your brief to a supplier you can speak with.',
    theme: 'sage',
    image: '/assets/journal-sourcing.jpg',
    imageAlt: 'Business colleagues shaking hands during a supplier meeting',
    imageWidth: 1200,
    imageHeight: 800,
    sections: [
      { heading: 'Start with the brief, not a long contact list.', paragraphs: ['You have a gifting brief, a brand in mind and a delivery date to meet. The next question is often the hardest: who supplies it? OfNeeds exists to make that connection easier, bringing brand discovery and dealer information into one place.', 'Before you start searching, write down the product category, approximate quantity and delivery location. A welcome kit for a new team and a premium client gift may need very different suppliers, even when the brand is the same.'] },
      { heading: 'Find the brand. Then look at the supply.', paragraphs: ['Use the brand directory to explore familiar names and discover alternatives. With an approved business account, you can browse available product listings and find participating dealers carrying the brands you need.', 'A name in the directory is a starting point. It does not mean that every product from that brand is currently available. Look at the actual dealer listings, their location and available stock before building your shortlist.'] },
      { heading: 'Make authorization part of the conversation.', paragraphs: ['On OfNeeds, business approval and brand authorization are reviewed separately. An Authorized Dealer badge relates to the reviewed dealer–brand relationship. It helps you distinguish that relationship from a business simply appearing in the network.', 'When you contact a supplier, confirm the model, warranty, delivery timeline and any customization needs. The right match depends on the details of your order as well as the brand name.'] },
      { heading: 'Turn discovery into a useful next step.', paragraphs: ['Save suitable products to your shortlist, compare dealer listings and send a quote request with your requirements. Verified corporate buyers can view B2B prices and supplier contact details, making the next conversation more focused.', 'OfNeeds helps you discover supply and connect with the dealer. Confirm the final product, commercial terms and order arrangements together before committing to your business order.'] }
    ],
    takeaway: 'Start with your brief, check the dealer’s actual listing and make the supplier conversation specific.'
  },
  {
    slug: 'writing-a-better-gifting-quote-request',
    category: 'Buyer guide',
    title: 'A clearer brief. A more useful quote.',
    summary: 'Give suppliers the details they need, so your next gifting quote is easier to compare.',
    theme: 'peach',
    image: '/assets/journal-buyer.jpg',
    imageAlt: 'A buyer writing a project brief in a notebook beside a laptop',
    imageWidth: 1200,
    imageHeight: 800,
    sections: [
      { heading: 'Make the request easy to understand.', paragraphs: ['A product name and “please share your best price” can start a conversation. A clear brief takes it further. It gives the dealer enough context to respond with a quote that fits the order you actually need.', 'Tell the supplier what the gifts are for, which product or model you are considering and how many units you need. If an alternative product could work, say so. That gives the dealer room to offer a suitable option when your first choice is unavailable.'] },
      { heading: 'Include the details that change the quote.', paragraphs: ['Quantity, delivery location and the required date affect what a supplier can offer. Add any logo printing, packaging or customization requirements in your notes and ask the dealer to confirm whether they can support them.'], checklist: ['Product, brand or model', 'Required quantity', 'Delivery city and address requirements', 'Required delivery date', 'Customization or packaging needs', 'Budget expectations, if you have them'] },
      { heading: 'Compare the whole offer.', paragraphs: ['A lower unit price is only one part of the picture. Review minimum order quantities, GST, delivery charges, lead time and quote validity alongside the price. Ask whether customization and packaging are included or quoted separately.', 'OfNeeds lets verified buyers send requests to a supplier or ask other verified dealers carrying the same brand. Review the responses in your workspace and follow up when two quotes use different assumptions. A useful comparison starts with the same requirements.'] },
      { heading: 'Keep the stock conversation current.', paragraphs: ['A quote request is a conversation about an order; it does not itself reserve inventory. Check current availability before agreeing the next step. If you use an OfNeeds stock hold, follow its status and expiry time in your workspace.', 'Use the hold window to confirm the dealer’s requirements, purchase order and payment arrangements. Agree the delivery schedule directly with the supplier, especially when the gifts are needed for a fixed event date.'] }
    ],
    takeaway: 'A specific brief helps dealers respond clearly and makes their offers easier to compare.'
  },
  {
    slug: 'getting-started-as-an-ofneeds-dealer',
    category: 'Dealer guide',
    title: 'Put your products in the right conversations.',
    summary: 'How brand dealers can build a useful presence for corporate gifting buyers on OfNeeds.',
    theme: 'lilac',
    image: '/assets/journal-dealer.jpg',
    imageAlt: 'A retail showroom with neatly arranged clothing and product displays',
    imageWidth: 1200,
    imageHeight: 2133,
    sections: [
      { heading: 'Be discoverable where buyers are sourcing.', paragraphs: ['Corporate gifting teams need to know who supplies a brand, which products are available and how to take the next step. OfNeeds brings that discovery into a shared business marketplace, giving dealers a place to present their catalog and respond to interested buyers.', 'A useful dealer presence starts with clear information. Your business location, represented brands and product details should help a buyer understand whether you are a good fit for their brief.'] },
      { heading: 'Start with business and brand review.', paragraphs: ['Apply as a brand dealer with your business information, GST certificate and brand authorization documents. The OfNeeds team reviews your application before approving business access.', 'Brand authorization is a separate review. Product publishing for a brand unlocks after that authorization is approved. Keep your information and authorization evidence current so the relationship shown to buyers reflects your business.'] },
      { heading: 'Build a catalog that answers the first questions.', paragraphs: ['Give each listing a clear product name, model, category and image. Add the B2B price, minimum order quantity, stock and lead time. Warranty information and bulk price breaks can help a buyer decide what to ask next.', 'Your stock is tracked at the dealer-listing level. Update it as availability changes, and take existing reservations into account. Clear, current listings help buyers avoid building a brief around quantities you cannot supply.'] },
      { heading: 'Make the next conversation count.', paragraphs: ['Use your workspace to review stock block requests and incoming quote requests. Approve a hold only when you can commit to the quantity, and respond to RFQs with clear pricing, delivery expectations and quote validity.', 'Ask for missing details early, especially when branding, packaging or an event deadline affects the order. OfNeeds creates the connection; you and the buyer agree the final supply and commercial arrangements directly.'] }
    ],
    takeaway: 'A clear catalog, current inventory and specific responses make your dealer presence more useful to buyers.'
  }
];

const visionParagraphs = [
  'Every corporate gifting order begins with a simple question: <strong>“Can you supply the products we need, on time?”</strong>',
  'Imagine a corporate gifting company receiving a request for 500 branded bottles. Before confirming the order, the team must find the right authorised dealer, check stock availability, and make sure those products will still be available when the client approves.',
  'Today, this can mean multiple calls, WhatsApp messages, and waiting for replies. While the team searches, stock may sell out—and the opportunity may be lost.',
  '<strong>Our vision is to make this process simple and reliable.</strong>',
  'We aim to bring corporate gifting companies and authorised brand dealers together on one marketplace. Buyers can discover products, find who supplies them, check available quantities, and reserve stock for an agreed period while finalising their client’s order.',
  'Suppliers can showcase their products, keep stock information updated, and connect with businesses looking for what they sell.',
  '<strong>We want every corporate gifting company to commit to clients with confidence—and every supplier to reach the right buyers.</strong>',
  'Find the product. Reserve the stock. Close the deal with confidence.'
];

function visionStatement() {
  return visionParagraphs.map((paragraph, index) => `<p${index === visionParagraphs.length - 1 ? ' class="vision-closing"' : ''}>${paragraph}</p>`).join('');
}

function articleCard(article, index) {
  return `<a class="journal-card" href="#blog/${article.slug}" data-page="article" data-slug="${article.slug}"><div class="journal-cover ${article.theme}"><img src="${article.image}" alt="${article.imageAlt}" width="${article.imageWidth}" height="${article.imageHeight}" loading="lazy" decoding="async"><span class="journal-cover-number">0${index + 1}</span><span class="journal-cover-word">${['Find your connection.', 'Make your brief count.', 'Bring your brand.'][index]}</span></div><div class="journal-card-copy"><span class="editorial-kicker">${article.category}</span><h2>${article.title}</h2><p>${article.summary}</p><span class="journal-read">${Math.max(1, Math.ceil(JSON.stringify(article.sections).split(/\s+/).length / 200))} min read · Read the story <span aria-hidden="true">↗</span></span></div></a>`;
}

function editorialCTA(isMember) {
  return `<section class="editorial-cta"><div><span class="editorial-kicker">Your next great connection</span><h2>Let’s make sourcing simpler.</h2><p>Discover products and meet the dealers who supply them.</p></div><button class="landing-primary" ${isMember ? 'data-page="products"' : 'data-action="register" data-role="buyer"'}>${isMember ? 'Explore products' : 'Get started'} <span aria-hidden="true">↗</span></button></section>`;
}

export function missionPage(isMember = false) {
  return `<main class="editorial-page mission-page"><header class="editorial-intro"><span class="editorial-kicker">Our mission</span><h1>Great gifting.<br><em>Easier to source.</em></h1><p>We’re here to make it easier for corporate gifting companies to find the right products and connect with authorized brand dealers.</p></header>
    <section class="mission-story"><div><span class="editorial-kicker">Why OfNeeds exists</span><h2>A good idea deserves<br>a better connection.</h2></div><div><p>You know the brand. You have the brief. Finding who supplies it shouldn’t be the part that slows you down.</p><p>OfNeeds brings brand discovery, dealer listings and sourcing conversations together. We help gifting companies move from an idea to a useful supplier conversation, while helping brand dealers make their products easier to discover.</p></div></section>
    <section class="mission-values" aria-label="What we stand for"><article><span class="mission-value-number">01 / Clarity</span><h2>Know where to start.</h2><p>Find brands and products in one place, with the information you need to take the next step.</p></article><article><span class="mission-value-number">02 / Trust</span><h2>Make informed connections.</h2><p>Business review and separate brand authorization review help buyers understand who they’re speaking with.</p></article><article><span class="mission-value-number">03 / Connection</span><h2>Keep it direct.</h2><p>Bring buyers and dealers together to discuss requirements, compare quotes and agree their order.</p></article></section>
    <section class="mission-vision" aria-labelledby="mission-vision-title"><span class="editorial-kicker">Our vision</span><h2 id="mission-vision-title">Less time searching.<br>More room for great gifting.</h2><p>We aim to bring corporate gifting companies and authorised brand dealers together, so every brief has a clearer route from discovery to a supplier conversation.</p><a href="#vision" data-page="vision">Explore our vision <span aria-hidden="true">↗</span></a></section>
    <section class="mission-audiences"><article><span class="editorial-kicker">For gifting companies</span><h2>From brief to supplier.</h2><p>Discover products, find authorized dealers and build a shortlist for your next business order.</p><a href="#blogs" data-page="blogs">Explore our buyer guides <span aria-hidden="true">↗</span></a></article><article><span class="editorial-kicker">For brand dealers</span><h2>Be part of the discovery.</h2><p>Share your catalog and connect with gifting businesses looking for the brands you represent.</p><a href="#blog/getting-started-as-an-ofneeds-dealer" data-page="article" data-slug="getting-started-as-an-ofneeds-dealer">Read the dealer guide <span aria-hidden="true">↗</span></a></article></section>
    ${editorialCTA(isMember)}</main>`;
}

export function visionPage(isMember = false) {
  return `<main class="editorial-page vision-page"><header class="editorial-intro vision-intro"><span class="editorial-kicker">The future we’re building</span><h1>Our <em>Vision.</em></h1></header><section class="vision-statement" aria-label="Our vision statement">${visionStatement()}</section>${editorialCTA(isMember)}</main>`;
}

export function blogsPage(isMember = false) {
  return `<main class="editorial-page blogs-page"><header class="editorial-intro"><span class="editorial-kicker">The OfNeeds journal</span><h1>Good ideas.<br><em>Better sourcing.</em></h1><p>Practical reads for gifting companies and brand dealers. A little clarity for your next big brief.</p></header><section class="journal-grid" aria-label="Latest blog articles">${articles.map(articleCard).join('')}</section>${editorialCTA(isMember)}</main>`;
}

export function articlePage(slug, isMember = false) {
  const article = articles.find(item => item.slug === slug);
  if (!article) return `<main class="editorial-page"><header class="editorial-intro"><span class="editorial-kicker">OfNeeds journal</span><h1>Article not found.</h1><p>Choose a guide from our journal to continue reading.</p><a class="editorial-back" href="#blogs" data-page="blogs">← Back to blogs</a></header></main>`;
  const words = [article.title, article.summary, ...article.sections.flatMap(section => [section.heading, ...section.paragraphs, ...(section.checklist || [])]), article.takeaway].join(' ').split(/\s+/).length;
  return `<main class="editorial-page article-page"><article><header class="article-intro"><a class="editorial-back" href="#blogs" data-page="blogs">← All blogs</a><span class="editorial-kicker">${article.category}</span><h1>${article.title}</h1><p>${article.summary}</p><div class="article-byline"><span>By the OfNeeds team</span><span>·</span><span>${Math.ceil(words / 200)} min read</span></div></header><img class="article-lead-image" src="${article.image}" alt="${article.imageAlt}" width="${article.imageWidth}" height="${article.imageHeight}"><div class="article-body">${article.sections.map(section => `<section><h2>${section.heading}</h2>${section.paragraphs.map(paragraph => `<p>${paragraph}</p>`).join('')}${section.checklist ? `<ul class="article-checklist">${section.checklist.map(item => `<li>${item}</li>`).join('')}</ul>` : ''}</section>`).join('')}<aside class="article-takeaway"><span class="editorial-kicker">Take it with you</span><p>${article.takeaway}</p></aside></div></article><section class="related-articles"><h2>Keep exploring.</h2><div>${articles.filter(item => item.slug !== slug).map(item => `<a href="#blog/${item.slug}" data-page="article" data-slug="${item.slug}"><span class="editorial-kicker">${item.category}</span><h3>${item.title}</h3><span aria-hidden="true">↗</span></a>`).join('')}</div></section>${editorialCTA(isMember)}</main>`;
}

export function articleTitle(slug) {
  return articles.find(article => article.slug === slug)?.title || 'Article not found';
}
