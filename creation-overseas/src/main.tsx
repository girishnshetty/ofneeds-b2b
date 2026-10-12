import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './premium.css';
import { ContentPage } from './components/ContentPage';
import { AnalyticsConsent } from './components/AnalyticsConsent';
import { pageFor } from './pages';
import { siteConfig } from './siteConfig';

const path = window.location.pathname;
const page = pageFor(path);
if (page) {
  document.title = page.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', page.description);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${siteConfig.url}${page.path}`);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <a href="#main-content" className="skip-link">Skip to content</a>
    {path === '/' ? <main id="main-content"><App /></main> : <ContentPage path={path} />}
    <AnalyticsConsent />
  </StrictMode>,
);
