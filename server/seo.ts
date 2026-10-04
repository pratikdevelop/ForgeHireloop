import fs from 'fs';
import { db } from './db';

const BASE_URL = 'https://forgehireloop.com';

export function generateRobotsTxt(): string {
  return fs.readFileSync('robots.txt', 'utf-8');
}

export function generateSitemapXml(reqOrigin?: string): string {
  const origin = reqOrigin || BASE_URL;
  const today = new Date().toISOString().split('T')[0];

  const jobs = db.getJobs().filter(j => j.status === 'active');
  const companies = db.getCompanies();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core Static Pages -->
  <url>
    <loc>${origin}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${origin}/companies</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;

  // Dynamic Job URLs
  for (const job of jobs) {
    const jobMod = job.updatedAt ? job.updatedAt.split('T')[0] : today;
    xml += `  <url>
    <loc>${origin}/jobs/${encodeURIComponent(job.id)}</loc>
    <lastmod>${jobMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;
  }

  // Dynamic Company URLs
  for (const company of companies) {
    const compMod = company.updatedAt ? company.updatedAt.split('T')[0] : today;
    xml += `  <url>
    <loc>${origin}/companies/${encodeURIComponent(company.id)}</loc>
    <lastmod>${compMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  xml += `</urlset>`;
  return xml;
}

export function renderPageWithSEO(rawHtml: string, pathUrl: string, reqOrigin?: string): string {
  const origin = reqOrigin || BASE_URL;
  let html = rawHtml;

  // 1. Single Job Page (e.g. /jobs/:id)
  const jobMatch = pathUrl.match(/^\/jobs\/([a-zA-Z0-9_\-]+)/);
  if (jobMatch) {
    const jobId = jobMatch[1];
    const job = db.getJobById(jobId);
    if (job) {
      const truncatedTitle = job.title.length > 28 ? job.title.substring(0, 25) + '...' : job.title;
      const title = `${truncatedTitle} at ${job.company?.name || 'Top Tech Company'} | ForgeHireloop`;
      const salaryText = job.salaryMax ? ` with salary up to $${Math.round(job.salaryMax / 1000)}k` : '';
      const description = `${job.company?.name || 'Leading tech company'} is hiring a ${job.title} in ${job.location}${salaryText}. Apply now with 1-click on ForgeHireloop.`.substring(0, 154);
      const canonical = `${origin}/jobs/${job.id}`;
      const logoUrl = job.company?.logoUrl || `${origin}/favicon.svg`;

      const validThrough = new Date();
      validThrough.setDate(validThrough.getDate() + 60);

      const jobPostingSchema = {
        '@context': 'https://schema.org/',
        '@type': 'JobPosting',
        title: job.title,
        description: job.description,
        identifier: {
          '@type': 'PropertyValue',
          name: job.company?.name || 'ForgeHireloop',
          value: job.id,
        },
        datePosted: job.postedAt || new Date().toISOString(),
        validThrough: validThrough.toISOString(),
        employmentType: job.jobType === 'part-time' ? 'PART_TIME' : job.jobType === 'contract' ? 'CONTRACTOR' : 'FULL_TIME',
        hiringOrganization: {
          '@type': 'Organization',
          name: job.company?.name || 'Tech Company',
          sameAs: job.company?.website || `${origin}/companies/${job.companyId}`,
          logo: logoUrl,
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: job.location,
            addressCountry: 'US',
          },
        },
        jobLocationType: job.workplaceType === 'remote' ? 'TELECOMMUTE' : undefined,
        applicantLocationRequirements: job.workplaceType === 'remote' ? { '@type': 'Country', name: 'Worldwide' } : undefined,
        baseSalary: job.salaryMin
          ? {
              '@type': 'MonetaryAmount',
              currency: 'USD',
              value: {
                '@type': 'QuantitativeValue',
                minValue: job.salaryMin,
                maxValue: job.salaryMax || job.salaryMin,
                unitText: 'YEAR',
              },
            }
          : undefined,
        directApply: true,
      };

      // Replace metadata
      html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
      html = html.replace(/<meta[^>]*?name="description"[^>]*?>/i, `<meta name="description" content="${description}" />`);
      html = html.replace(/<meta[^>]*?property="og:title"[^>]*?>/i, `<meta property="og:title" content="${title}" />`);
      html = html.replace(/<meta[^>]*?property="og:description"[^>]*?>/i, `<meta property="og:description" content="${description}" />`);
      html = html.replace(/<meta[^>]*?property="og:url"[^>]*?>/i, `<meta property="og:url" content="${canonical}" />`);
      html = html.replace(/<meta[^>]*?name="twitter:title"[^>]*?>/i, `<meta name="twitter:title" content="${title}" />`);
      html = html.replace(/<meta[^>]*?name="twitter:description"[^>]*?>/i, `<meta name="twitter:description" content="${description}" />`);
      html = html.replace(/<link[^>]*?rel="canonical"[^>]*?>/i, `<link rel="canonical" href="${canonical}" />`);

      // Inject Schema
      const schemaTag = `<script type="application/ld+json" id="server-jobposting-schema">${JSON.stringify(jobPostingSchema, null, 2)}</script>`;
      html = html.replace('</head>', `${schemaTag}\n</head>`);

      // Pre-rendered Semantic HTML
      const prerenderContent = `
        <div id="prerendered-content" class="max-w-4xl mx-auto p-6 font-sans">
          <header class="mb-6">
            <h1 class="text-3xl font-extrabold text-slate-900">${job.title}</h1>
            <p class="text-lg text-blue-600 font-semibold mt-1">${job.company?.name || 'Leading Tech Company'} • ${job.location} • <span class="capitalize">${job.workplaceType}</span></p>
          </header>
          <div class="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h2 class="text-base font-bold text-slate-800 mb-2">Job Overview</h2>
            <p class="text-slate-700 leading-relaxed">${job.description}</p>
          </div>
          ${
            job.requirements && job.requirements.length > 0
              ? `<div class="mb-6">
                  <h2 class="text-base font-bold text-slate-800 mb-2">Requirements & Qualifications</h2>
                  <ul class="list-disc pl-5 space-y-1 text-slate-700">
                    ${job.requirements.map(r => `<li>${r}</li>`).join('')}
                  </ul>
                </div>`
              : ''
          }
          <div class="mt-6 pt-4 border-t border-slate-200">
            <p class="text-sm text-slate-500">Listed on ForgeHireloop. Apply with your verified developer profile.</p>
          </div>
        </div>
      `;
      html = html.replace('<div id="root"></div>', `<div id="root">${prerenderContent}</div>`);
      return html;
    }
  }

  // 2. Companies Directory Page (/companies)
  if (pathUrl === '/companies' || pathUrl.startsWith('/companies?')) {
    const title = 'Top Tech Companies & Cultures | ForgeHireloop';
    const description = 'Explore leading technology companies, remote engineering cultures, team sizes, and open job listings on ForgeHireloop.';
    const canonical = `${origin}/companies`;

    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
    html = html.replace(/<meta[^>]*?name="description"[^>]*?>/i, `<meta name="description" content="${description}" />`);
    html = html.replace(/<meta[^>]*?property="og:title"[^>]*?>/i, `<meta property="og:title" content="${title}" />`);
    html = html.replace(/<meta[^>]*?property="og:description"[^>]*?>/i, `<meta property="og:description" content="${description}" />`);
    html = html.replace(/<meta[^>]*?property="og:url"[^>]*?>/i, `<meta property="og:url" content="${canonical}" />`);
    html = html.replace(/<link[^>]*?rel="canonical"[^>]*?>/i, `<link rel="canonical" href="${canonical}" />`);

    const companies = db.getCompanies();
    const prerenderContent = `
      <div id="prerendered-content" class="max-w-6xl mx-auto p-6 font-sans">
        <h1 class="text-3xl font-extrabold text-slate-900 mb-2">Explore Hiring Companies</h1>
        <p class="text-slate-600 mb-6">${description}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${companies
            .map(
              c => `
            <div class="p-4 rounded-xl border border-slate-200 bg-white">
              <h2 class="text-lg font-bold text-slate-900">${c.name}</h2>
              <p class="text-xs text-blue-600 font-medium">${c.industry} • ${c.location}</p>
              <p class="text-sm text-slate-600 mt-2">${c.description}</p>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
    html = html.replace('<div id="root"></div>', `<div id="root">${prerenderContent}</div>`);
    return html;
  }

  // 3. Homepage / Default (/ or other public paths)
  const defaultJobs = db.getJobs().slice(0, 6);
  const homePrerender = `
    <div id="prerendered-content" class="max-w-6xl mx-auto p-6 font-sans">
      <header class="py-8 text-center max-w-2xl mx-auto">
        <h1 class="text-4xl font-extrabold tracking-tight text-slate-900 mb-3">Find Tech Jobs &amp; Hire Exceptional Engineers</h1>
        <p class="text-base text-slate-600">Search 1,000+ top software engineering, AI, product &amp; leadership roles. Connect directly with hiring teams on ForgeHireloop.</p>
      </header>
      <section class="mt-6">
        <h2 class="text-xl font-bold text-slate-900 mb-4">Featured Opportunities</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${defaultJobs
            .map(
              j => `
            <article class="p-4 rounded-xl border border-slate-200 bg-white">
              <h3 class="text-base font-bold text-slate-900">${j.title}</h3>
              <p class="text-xs text-blue-600 font-medium">${j.company?.name || 'Tech Company'} • ${j.location}</p>
              <p class="text-xs text-slate-500 mt-1 line-clamp-2">${j.description}</p>
            </article>
          `
            )
            .join('')}
        </div>
      </section>
    </div>
  `;
  html = html.replace('<div id="root"></div>', `<div id="root">${homePrerender}</div>`);
  return html;
}
