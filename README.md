# OfNeeds B2B

A responsive B2B corporate gifting marketplace with role-based dashboards for corporate buyers, brand dealers, and OfNeeds administrators.

## Run locally

Requires Node.js 20 or newer. The local demo uses Node’s built-in modules and does not need a dependency install.

```powershell
npm start
```

Open [http://localhost:4173](http://localhost:4173). Data and privately stored registration documents are created under `data/` on first run and are excluded from Git.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Corporate buyer (GST verified) | `buyer@ofneeds.in` | `Buyer@1234` |
| Authorized dealer | `dealer@ofneeds.in` | `Dealer@1234` |
| Platform administrator | `admin@ofneeds.in` | `Admin@1234` |

The seeded buyer can browse B2B prices, reserve products, save a shortlist, request quotes, and view supplier contact information. The dealer can edit its catalog and respond to reservations and RFQs. The administrator can review pending businesses, open submitted documents, and separately verify brand authorization evidence.

The home screen introduces **Buyers — Corporate Gifting Companies** and **Suppliers — Authorised Brand Dealers**. Its “I’m a Buyer” and “I’m a Supplier” buttons open registration with the matching account type selected. Supplier applications use the existing dealer role internally.

The homepage brand strip uses locally served logos for Raymond, Jack & Jones, Puma, Reebok, Wildcraft, Mokobara, Rare Rabbit, Bugatti and Monte Carlo. It scrolls in a continuous loop with hover and focus pauses, native horizontal scrolling, and reduced motion support. Asset sources are recorded in `public/assets/brand-logo-sources.md`.

The homepage hero is text-only. Its four category cards use locally served, AI-generated product inspiration photos from `public/assets/categories/`, with responsive WebP variants. These illustrations do not represent live supplier inventory.

## Working flows

- Buyer and dealer applications validate business fields and attach private PDF/JPG/PNG/WEBP documents. Applications start in `pending` status.
- Admin business review opens an evidence panel and requires a decision reason. Approval needs the required uploaded documents. It unlocks buyer procurement access or creates a supplier workspace; brand authorization is approved separately.
- Public visitors can read the homepage, mission, vision, journal, help and brand directory. Products, stock, wholesale prices and supplier contacts remain subject to business approval and role permissions.
- Product holds check the latest available quantity, reserve inventory, notify both parties in-app, and expire after 24 hours. A server timer releases expired holds back into available stock.
- Buyers can send an RFQ to one supplier or broadcast it to verified dealers carrying that brand. Dealers submit quotes that buyers can compare in their RFQ history.
- Each dealer listing has independent stock, sold units, MOQ, price, and location. Stock edits cannot reduce total inventory below sold and reserved units.

- Registration uses three steps and keeps values when moving back. Shipping can match billing; required private documents remain part of the application.
- Demo and assistance requests are saved locally and appear in the administrator’s Support & demos section. Email delivery, password recovery and calendar scheduling are not connected.
- Catalog listings with generic demonstration photography show “Product photo pending” until accurate supplier photos are supplied. Holds below MOQ are disabled; quotation requests remain available.

## Premium design update and validation

The interface uses `public/theme.css`, `public/home.css` and `public/editorial.css`. Historical base and landing styles were retired; local copies are archived under `.tmp/legacy-css/`. Shared form, registration and dialog behaviour is in `public/premium.js`.

Run isolated API integration tests with `npm.cmd test`. Each run starts a separate server on port 4179 with a fresh data directory under `.tmp/premium-test-*`; it does not mutate the running marketplace’s records.

The update report, 36-item change tracker, validation measurements and screenshots are in `output/premium-update/`. Production photos, business proof, policies and service connections remain explicitly listed in the report.

## Mission and blogs

The public [Our Mission](http://localhost:4173/#mission) page explains OfNeeds’ purpose, values and the businesses it connects. [Our Vision](http://localhost:4173/#vision) presents the vision for a trusted, connected corporate gifting marketplace while the mission page links to it through a short excerpt. [Blogs](http://localhost:4173/#blogs) includes three complete guides about finding brand dealers, preparing quote requests and joining as a dealer. Articles have individual links, reading times and related reading. Edit the mission, vision and article content in `public/editorial.js`, and their visual styling in `public/editorial.css`.

## Brand and category directory

The Brands page includes a curated 140+ brand directory with A–Z navigation, name search, and product-category filters. It covers apparel, T-shirts and polos, backpacks, watches, electronics, trolleys and luggage, drinkware, office products, and more. The directory is not a claim that each brand has current inventory or an authorized dealer; verified supplier counts appear only for dealer-brand relationships that have passed review. The list is maintained in [`catalog/brands.json`](catalog/brands.json).

## Architecture notes

The local demonstration runs a small Node HTTP API and a responsive browser client. Passwords are scrypt-hashed, sessions use HTTP-only same-site cookies, and registration documents are stored outside the static web directory behind an admin-only route. The JSON store persists changes locally and serializes inventory mutations within the single Node process.

[`database/schema.sql`](database/schema.sql) describes the PostgreSQL relational model and the transaction contract for production reservation writes. Before a public deployment, connect the API to PostgreSQL and a shared session store, use multi-process-safe serializable transactions, add request rate limits and audit retention, configure HTTPS and secure cookies, and connect approved GST, email, and WhatsApp providers. This local demo uses manual GST review and does not process payments. Email can be enabled with the gateway described below; it remains disabled in the default local preview.

## Premium refinements and service setup

The application name stays **OfNeeds** until the revised name is supplied. Header, footer and loading states now use `public/assets/ofneeds-wordmark.svg`; the original logo files are preserved. `public/assets/gifting-editorial.png` is an AI-generated editorial collection, clearly labelled as inspiration rather than named product inventory. Its prompt and provenance are in `output/premium-refinement/UPDATE.md`.

Suppliers can add exact model photos through **My products → Add photo**, or attach one while publishing a product. JPG, PNG and WebP uploads are limited to 4 MB; the server checks consent, image signatures and listing ownership. Photos stay outside the static directory and require approved catalog access. Replaced files are retained locally; apply a business-approved retention policy before launch. **Supplier profile** lets suppliers enter an introduction, delivery coverage and services. Profile dialogs expose authorization dates and whether documentary evidence is recorded; private certificate files remain administrator-only.

Copy `.env.example` to `.env` and fill values locally. With Node 22+, start a configured preview using `node --env-file=.env server.mjs`. Do not commit secrets. The default `npm start` uses inherited environment values; it does not automatically load `.env`.

`MAIL_GATEWAY_URL`, `MAIL_GATEWAY_TOKEN` and `MAIL_FROM` enable a server-side HTTPS email gateway. The gateway must accept a POST with Bearer authentication and JSON `{ from, to, subject, text }`, returning a successful HTTP status after accepting delivery. Connect your chosen mail service behind this interface. `SUPPORT_EMAIL` sets the administrator recipient; saved assistance/walkthrough requests record sent/failed delivery status. Failed messages stay in the administrator queue for follow-up; no automatic retry is claimed.

`SITE_URL` must be your actual HTTPS origin (localhost HTTP is allowed for development). Along with mail configuration, it enables password recovery. Recovery tokens are hashed in storage, expire in 30 minutes, work once and invalidate all existing sessions after reset. Recovery responses use the same message for matching and unknown email addresses. Links open `#reset/<token>`; the UI checks confirmation and password length. Never place the mail token in public configuration.

`PRIVACY_POLICY_URL` and `TERMS_URL` add HTTPS links to business-approved policies in the footer. Do not use placeholders as published policies. `DEMO_MODE=false` disables demonstration seeding and rejects existing stores containing known demo account IDs. It does not erase or convert the current preview. Use a separate deployment, production account provisioning and the database/session architecture above.

Twelve isolated tests include a local mock mail gateway. No real email, business approvals, stock updates or passwords in the running preview are changed by these tests. Genuine supplier photos, business proof, customer testimonials, approved policies, the final name and provider credentials still require business input.
