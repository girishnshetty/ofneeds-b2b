import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import 'dotenv/config';
import App from '../src/App';
import { ContentPage } from '../src/components/ContentPage';
import { pageFor, pagePaths } from '../src/pages';

const template = await readFile('dist/index.html', 'utf8');
const origin = (process.env.VITE_SITE_URL || 'https://creationsgroup.co.in').replace(/\/$/, '');
const escape = (value: string) => value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for (const path of ['/', ...pagePaths, '/404/']) {
  const page = pageFor(path);
  const title = path === '/' ? 'Corporate gifts and branded merchandise | Creations Overseas' : page?.title || 'Page not found | Creations Overseas';
  const description = path === '/' ? 'Explore corporate gifts, employee welcome kits and branded merchandise. Discuss product selection, logo customization and delivery across India.' : page?.description || 'Browse corporate gifting options from Creations Overseas.';
  const content = renderToString(path === '/' ? <main id="main-content"><App /></main> : <ContentPage path={path}/>);
  let html = template.replace(/<title>.*?<\/title>/s, `<title>${escape(title)}</title>`).replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escape(description)}" />`).replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${escape(origin+path)}" />`).replace('<div id="root"></div>', `<div id="root">${content}</div>`);
  html = html.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escape(title)}" />`).replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escape(description)}" />`).replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${escape(origin+path)}" />`);
  html = html.replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escape(origin+'/assets/photography/gift-packaging.jpg')}" />`);
  if (path === '/404/') html = html.replace('</head>', '<meta name="robots" content="noindex" /></head>');
  const output = path === '/404/' ? resolve('dist/404.html') : resolve('dist', '.' + path, 'index.html');
  await mkdir(dirname(output), {recursive:true}); await writeFile(output, html);
}
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', ...pagePaths.filter(p=>p !== '/privacy/')].map(p=>`<url><loc>${escape(origin+p)}</loc></url>`).join('')}</urlset>`);
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile('public/sitemap.xml', await readFile('dist/sitemap.xml'));
await writeFile('public/robots.txt', await readFile('dist/robots.txt'));
console.log(`Prerendered ${pagePaths.length+1} pages and generated matching sitemap.`);
