# Creations Overseas

## Local development

Run npm install, then npm run dev. Open http://127.0.0.1:3000/.
The Node server hosts both Vite and the enquiry API. Gemini credentials are not required.

## Production

Run npm run build, then npm start. The build produces pre-rendered brand, gifting, location, About and Privacy pages, with matching canonical metadata and sitemap. Unknown pages return HTTP 404.
Deploy the Node server with its dist directory and persistent private-data storage. Static-only hosting cannot save enquiries: deploy the API too, at the same origin. npm run preview previews assets only.

## Enquiries and notifications

Successful enquiries are written to private-data/enquiries as individual JSON records. This directory is ignored by Git and is never publicly served. Success is shown only after storage succeeds. Enquiries without a notification destination remain marked not-configured; webhook failures remain marked failed for operator follow-up.

To enable sales alerts, set LEAD_NOTIFICATION_WEBHOOK to your CRM or automation endpoint and optionally LEAD_WEBHOOK_TOKEN. The endpoint receives the full enquiry via POST JSON. No external notification is sent while the destination is blank. Failed alerts do not discard the enquiry. Monitor these records and configure your operational retry process before public launch.

Use persistent storage and backups on deployment; ephemeral server filesystems lose records. Configure HTTPS, your actual APP_URL when behind a reverse proxy, and trusted proxy settings appropriate to your host. Rate limiting is per process and should be backed by edge/shared rate limiting for multiple server instances.

## Business settings

Copy .env.example to .env. VITE_ settings are public and embedded at build time. Rebuild when changing them. The default logo, sales phone, contact email and head-office address now come from creationsgroup.co.in; see BUSINESS-IDENTITY-SOURCES.md. Phone and email links are enabled. WhatsApp is optional and appears only when VITE_WHATSAPP_PHONE contains a confirmed number. Set your production origin and optional real GA4 ID. Analytics loads only after consent and sends no contact details in conversion events. Displaying an email address does not enable automatic email delivery; configure the server notification destination separately.

## Catalog content

Review src/data/seoData.ts against your real catalog. Product descriptions and minimum quantities are marked indicative until confirmed. Add actual authorized product images to public/assets/products and set each product's image field to its asset path. The premium homepage uses locally served Pexels stock photography as collection inspiration; see PHOTO-SOURCES.md and /image-credits/ for sources. Real photos, testimonials, case studies, authorization evidence, warranties and address details must come from the business; no customer claims have been fabricated.

## Checks

npm run lint — TypeScript check.
npm test — enquiry storage, validation, origin, privacy and failure-path tests.
npm run build — production assets and pre-rendered pages.

