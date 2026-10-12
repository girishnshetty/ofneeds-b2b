export const offices = [
  { id:'hyderabad', kind:'Head office', city:'Hyderabad / Secunderabad', address:'2nd Floor, Satguru, No. 142, Prenderghast Road, Sindhi Colony, Secunderabad, Telangana, India — 500003', map:'https://maps.app.goo.gl/dkz7AYMxuqLe9Jxh7' },
  { id:'cyberabad', kind:'Showroom', city:'Cyberabad', address:'2nd Floor, J K Prime, Plot No. / Sy No. 83/1, Raidurg, Rangareddy, Telangana, India — 500032', map:'https://maps.app.goo.gl/9NzctkpEZUtAzjRJ7' },
  { id:'bengaluru', kind:'Branch office', city:'Bengaluru', address:'No. 21, 2nd Cross, S G Narayana Layout, Old Dodda Baila Khane, Corporate Ward No. 48, Lalbagh Cross Road, Bengaluru, Karnataka, India — 560027', map:'' },
  { id:'ahmedabad', kind:'Branch office', city:'Ahmedabad', address:'ISCON Emporio, 552, Pandurang Shashtri Marg, Beside Star Bazaar, Satellite, Ahmedabad, Gujarat, India — 380015', map:'' },
];
export const external = (path:string) => `https://creationsgroup.co.in${path}`;
export const navigationGroups = [
  {label:'About Us',items:[
    ['Our story','/about/'],['Heritage','/about/heritage/'],['Leadership','/about/leadership/'],
    ['The Logo',external('/about/the-logo/')],['Business Verticals',external('/about/business-verticals/')],['Values & Purpose',external('/about/values-purpose/')],['Team',external('/about/team/')],['Testimonials',external('/category/testimonials/')],['Awards and Recognition',external('/category/awards-and-recognition/')],['Photo Gallery',external('/category/photo-gallery/')],['Brand Catalog','/#portfolio'],
  ]},
  {label:'Contact Us',items:[['Offices & contact details','/contact/'],['Business enquiry','/contact/#business-enquiry'],['Employment Opportunity',external('/contact/employment-opportunity/')],['Vendor Empanelment',external('/contact/vendor-empanelment/')],['Vigilance & Harassment',external('/contact/vigilance-harassment/')]]},
  {label:'Updates',items:[['Latest updates','/updates/'],['Events',external('/category/events/')],['Brands',external('/category/brands/')],['Products',external('/category/products/')],['Workplace',external('/category/workplace/')],['Jobs',external('/category/jobs/')],['CSR',external('/category/csr/')]]},
  {label:'Links',items:[['Useful links','/links/'],['GiftsHub – Corporate Gifting','https://giftshub.in/'],['UniformHub – Apparel','https://uniformhub.net/'],['Koral – B2B Distributor','https://koralgroup.in/'],['Zoho Email','https://mail.zoho.in/zm'],['Privacy Policy',external('/privacy-policy/')],['Refund, Replacement, Return Policy',external('/refund-replacement-return-policy/')],['Shipping Policy',external('/shipping-policy/')],['Terms of Use',external('/terms-of-use/')]]},
];
export const publishedUpdates = [
  { title:'Letter of Appreciation from PWC', date:'2026-04-06', category:'Testimonials', description:'The official website shares customer appreciation for a quick response to a gifting enquiry.', url:external('/testimonials/letter-of-appreciation-from-pwc/') },
  { title:'Gifts World Expo 2026 — Mumbai', date:'2026-02-26', category:'Events', description:'Creations Overseas announces its presence at Gifts World Expo in Mumbai with TT Bagatt and Bugatti.', url:external('/events/we-are-at-gifts-world-expo-2026-mumbai/') },
  { title:'Gifts World Expo 2025 — Bengaluru', date:'2025-09-11', category:'Events', description:'An exhibition update featuring Monte Carlo and Bugatti in Bengaluru.', url:external('/events/we-are-at-gifts-world-expo-2025-bengaluru/') },
  { title:'Milton — Style Mate Tiffin Pack', date:'2025-07-23', category:'Products', description:'A featured product update for a four-container office lunch set.', url:external('/products/milton-style-mate-4-container-tiffin-pack/') },
];
