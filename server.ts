import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes';
import { authenticateToken } from './server/auth';
import { generateRobotsTxt, generateSitemapXml, renderPageWithSEO } from './server/seo';

// Force new ForgeHireloop Firebase configuration and discard any legacy gen-lang-client project
process.env.VITE_FIREBASE_API_KEY = "AIzaSyA_LdK4DgIIQdWC1efYAPj1ltkbxwBEB0o";
process.env.VITE_FIREBASE_AUTH_DOMAIN = "forgehireloop.firebaseapp.com";
process.env.VITE_FIREBASE_PROJECT_ID = "forgehireloop";
process.env.VITE_FIREBASE_STORAGE_BUCKET = "forgehireloop.firebasestorage.app";
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = "633018706293";
process.env.VITE_FIREBASE_APP_ID = "1:633018706293:web:444f08918b605385914b3c";
process.env.VITE_FIREBASE_MEASUREMENT_ID = "G-2HG1W1QK71";
process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID = "(default)";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global parsing middlewares
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  
  // Custom JWT user authentication middleware
  app.use(authenticateToken);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'ForgeHireloop API', timestamp: new Date().toISOString() });
  });

  // Robots.txt for search engines
  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(generateRobotsTxt());
  });

  // Dynamic Sitemap.xml with all jobs and companies
  app.get('/sitemap.xml', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'forgehireloop.com';
    const origin = `${protocol}://${host}`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(generateSitemapXml(origin));
  });

  // API routes mounted BEFORE static or SPA routes
  app.use('/api', apiRouter);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    // Custom SSR / SEO prerender handler in dev
    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      const accept = req.headers.accept || '';

      // Skip API, assets, vite internal requests
      if (
        url.startsWith('/api') ||
        url.startsWith('/@') ||
        url.startsWith('/src') ||
        url.startsWith('/node_modules') ||
        url.includes('.')
      ) {
        return vite.middlewares(req, res, next);
      }

      if (accept.includes('text/html') || !accept.includes('*/*')) {
        try {
          const templatePath = path.resolve(process.cwd(), 'index.html');
          let template = fs.readFileSync(templatePath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
          const host = req.get('host') || `localhost:${PORT}`;
          const origin = `${protocol}://${host}`;
          const rendered = renderPageWithSEO(template, url, origin);
          return res.status(200).set({ 'Content-Type': 'text/html' }).end(rendered);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          return next(e);
        }
      }

      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        const rawHtml = fs.readFileSync(indexPath, 'utf-8');
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.get('host') || 'forgehireloop.com';
        const origin = `${protocol}://${host}`;
        const rendered = renderPageWithSEO(rawHtml, req.url, origin);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(rendered);
      } else {
        res.sendFile(indexPath);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ForgeHireloop server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
