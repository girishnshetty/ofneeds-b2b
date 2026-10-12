import express from 'express';
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function createApi({ leadsDirectory = resolve('private-data/enquiries'), webhook = process.env.LEAD_NOTIFICATION_WEBHOOK, webhookToken = process.env.LEAD_WEBHOOK_TOKEN } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/private-data', (_req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use(express.json({ limit: '20kb' }));
  const attempts = new Map();
  const allowed = ['fullName', 'companyName', 'email', 'phone', 'brand', 'quantity', 'budget', 'deliveryCity', 'targetDate', 'notes'];
  app.post('/api/enquiries', async (req, res) => {
    const origin = req.headers.origin;
    if (origin && origin !== `${req.protocol}://${req.get('host')}` && origin !== process.env.APP_URL) return res.status(403).json({ error: 'Please submit using this website.' });
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'Invalid enquiry.' });
    if (req.body.website) return res.status(400).json({ error: 'Unable to submit this enquiry.' });
    const now = Date.now();
    for (const [ip, entry] of attempts) if (entry.until < now) attempts.delete(ip);
    const limit = attempts.get(req.ip) || { count: 0, until: now + 600000 };
    limit.count++; attempts.set(req.ip, limit);
    if (limit.count > 10) return res.status(429).json({ error: 'Too many enquiries. Please try again in ten minutes.' });
    const data = {};
    for (const field of allowed) {
      const value = req.body[field] ?? '';
      if (typeof value !== 'string' || value.length > (field === 'notes' ? 4000 : 200)) return res.status(400).json({ error: 'Please check the form fields.' });
      data[field] = value.trim();
    }
    if (!data.fullName || !data.companyName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !data.quantity) return res.status(400).json({ error: 'Enter your name, company, valid email, and quantity.' });
    if (data.phone && !/^[+\d\s()-]{7,25}$/.test(data.phone)) return res.status(400).json({ error: 'Enter a valid phone number or leave it blank.' });
    if (data.targetDate && (!/^\d{4}-\d{2}-\d{2}$/.test(data.targetDate) || !Number.isFinite(Date.parse(data.targetDate)))) return res.status(400).json({ error: 'Enter a valid delivery date.' });
    const reference = randomUUID();
    const record = { reference, createdAt: new Date().toISOString(), ...data, notification: webhook ? 'pending' : 'not-configured' };
    const recordPath = resolve(leadsDirectory, `${reference}.json`);
    try {
      await mkdir(leadsDirectory, { recursive: true });
      await writeFile(recordPath, JSON.stringify(record, null, 2), { flag: 'wx', mode: 0o600 });
    } catch {
      return res.status(503).json({ error: 'We could not save your enquiry. Your details are still in the form; please try again.' });
    }
    if (webhook) {
      try {
        const response = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}) }, body: JSON.stringify(record), signal: AbortSignal.timeout(5000) });
        record.notification = response.ok ? 'delivered' : 'failed';
      } catch { record.notification = 'failed'; }
      try { await writeFile(recordPath, JSON.stringify(record, null, 2)); } catch { /* Original saved enquiry remains available. */ }
    }
    return res.status(201).json({ reference, saved: true });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((error, _req, res, next) => {
    if (error) return res.status(error.status || 500).json({ error: 'Unable to process this request.' });
    next();
  });
  return app;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApi();
  if (process.argv.includes('--production')) {
    app.use(express.static(resolve('dist')));
    app.use((_req, res) => res.status(404).sendFile(resolve('dist/404.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  const port = Number(process.env.PORT || 3000);
  app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Creations Overseas running at http://${process.env.HOST || '127.0.0.1'}:${port}/`)).on('error', error => { console.error(`Cannot start website: ${error.code}. Check whether port ${port} is already in use.`); process.exit(1); });
}
