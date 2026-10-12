export const photography = {
  packaging: { src: '/assets/photography/gift-packaging.jpg', alt: 'Gift boxes in sage and navy paper with satin ribbons', source: 'https://www.pexels.com/photo/decorative-gift-boxes-with-elegant-wrapping-29873585/', credit: 'Laura Chouette / Pexels' },
  welcome: { src: '/assets/photography/welcome-kit.jpg', alt: 'A black mug and notebook nestled in a presentation gift box', source: 'https://www.pexels.com/photo/mug-in-box-10757836/', credit: 'Wendy Wei / Pexels' },
  travel: { src: '/assets/photography/travel-bag.jpg', alt: 'Close-up of a textured grey travel backpack', source: 'https://www.pexels.com/photo/closeup-of-a-gray-textile-bag-9712994/', credit: 'Josh Sorenson / Pexels' },
  apparel: { src: '/assets/photography/apparel.jpg', alt: 'Neatly folded apparel in warm neutral and burgundy tones', source: 'https://www.pexels.com/photo/a-person-holding-folded-textile-8346226/', credit: 'Pexels' },
  drinkware: { src: '/assets/photography/drinkware.jpg', alt: 'Reusable stainless steel bottle on a wooden table', source: 'https://www.pexels.com/photo/stainless-bottle-on-the-table-7879851/', credit: 'Pexels' },
};
export const inspirationFor = (path: string) => path.includes('apparel') ? photography.apparel : path.includes('welcome') || path.includes('merchandise') ? photography.welcome : photography.packaging;
