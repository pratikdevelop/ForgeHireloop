import { Job, Company } from '../types';
import { BRAND } from '../config/brand';

export interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  job?: Job | null;
  company?: Company | null;
}

export interface MetaTagsResult {
  title: string;
  description: string;
  canonicalUrl: string;
  og: {
    title: string;
    description: string;
    image: string;
    url: string;
    type: string;
    site_name: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    image: string;
    site: string;
  };
}

/**
 * Reusable utility to generate structured meta tags for jobs, companies, or static marketing pages.
 */
export function generateMetaTags(
  type: 'job' | 'company' | 'static',
  data?: {
    job?: Job | null;
    company?: Company | null;
    title?: string;
    description?: string;
    url?: string;
    image?: string;
  }
): MetaTagsResult {
  let title = data?.title || `${BRAND.name} — Tech Jobs, Remote Careers & Verified Employers`;
  let description =
    data?.description ||
    'Discover curated software engineering, design, product, and leadership jobs with verified compensation and 1-click apply.';
  let url = data?.url || (typeof window !== 'undefined' ? window.location.href : 'https://forgehireloop.com/');
  let image = data?.image || BRAND.socialShareImage;
  let ogType = 'website';

  if (type === 'job' && data?.job) {
    const j = data.job;
    const compName = j.company?.name || 'Verified Tech Employer';
    const salaryText = j.salaryMax ? ` ($${Math.round(j.salaryMax / 1000)}k)` : '';
    title = `${j.title} at ${compName}${salaryText} | ForgeHireloop`;
    description = `${compName} is actively hiring a ${j.title} in ${j.location}. Apply directly via ForgeHireloop.`;
    url = `https://forgehireloop.com/jobs/${j.id}`;
    if (j.company?.logoUrl) image = j.company.logoUrl;
    ogType = 'article';
  } else if (type === 'company' && data?.company) {
    const c = data.company;
    title = `${c.name} Careers & Open Tech Roles | ForgeHireloop`;
    description = `Explore open engineering and tech jobs at ${c.name}. ${c.description?.slice(0, 100) || ''}`;
    url = `https://forgehireloop.com/companies/${c.id}`;
    if (c.logoUrl) image = c.logoUrl;
  }

  const result: MetaTagsResult = {
    title,
    description,
    canonicalUrl: url,
    og: {
      title,
      description,
      image,
      url,
      type: ogType,
      site_name: BRAND.name,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      image,
      site: BRAND.twitterHandle,
    },
  };

  // Sync with document head if in browser
  if (typeof document !== 'undefined') {
    updateSEO({
      title,
      description,
      canonicalUrl: url,
      ogImage: image,
      ogType: ogType as any,
      job: data?.job,
      company: data?.company,
    });
  }

  return result;
}

/**
 * Updates DOM head tags dynamically for client-side single page navigation.
 * Also cleans up or updates Google JobPosting JSON-LD structured data.
 */
export function updateSEO({
  title,
  description,
  canonicalUrl = typeof window !== 'undefined' ? window.location.href : 'https://forgehireloop.com/',
  ogImage = BRAND.socialShareImage,
  ogType = 'website',
  job,
  company,
}: SEOProps) {
  if (typeof document === 'undefined') return;

  // 1. Update Title (< 60 chars recommended)
  document.title = title;

  // 2. Helper to set or update meta tag
  const setMeta = (attributeName: string, attributeValue: string, content: string) => {
    let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attributeName, attributeValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // 3. Helper for link tags
  const setLink = (rel: string, href: string) => {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  };

  // 4. Update Meta Description (< 155 chars recommended)
  setMeta('name', 'description', description);
  setLink('canonical', canonicalUrl);

  // 5. OpenGraph Tags
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', canonicalUrl);
  setMeta('property', 'og:image', ogImage);
  setMeta('property', 'og:type', ogType);
  setMeta('property', 'og:site_name', BRAND.name);

  // 6. Twitter Card Tags
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', ogImage);
  setMeta('name', 'twitter:site', BRAND.twitterHandle);

  // 7. Google JobPosting Structured Data (JSON-LD)
  const existingJobScript = document.getElementById('seo-schema-jobposting');
  if (job) {
    const validThroughDate = new Date();
    validThroughDate.setDate(validThroughDate.getDate() + 60);

    const employmentTypeMap: Record<string, string> = {
      'full-time': 'FULL_TIME',
      'part-time': 'PART_TIME',
      'contract': 'CONTRACTOR',
      'internship': 'INTERN',
    };

    const companyName = job.company?.name || 'Tech Company';
    const companyLogo = job.company?.logoUrl || 'https://forgehireloop.com/favicon.svg';

    const schemaData = {
      '@context': 'https://schema.org/',
      '@type': 'JobPosting',
      title: job.title,
      description: job.description,
      identifier: {
        '@type': 'PropertyValue',
        name: companyName,
        value: job.id,
      },
      datePosted: job.postedAt || new Date().toISOString(),
      validThrough: validThroughDate.toISOString(),
      employmentType: employmentTypeMap[job.jobType] || 'FULL_TIME',
      hiringOrganization: {
        '@type': 'Organization',
        name: companyName,
        sameAs: `https://forgehireloop.com/companies/${job.companyId}`,
        logo: companyLogo,
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
      applicantLocationRequirements: job.workplaceType === 'remote'
        ? {
            '@type': 'Country',
            name: 'Worldwide',
          }
        : undefined,
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
      skills: job.requirements?.join(', '),
      directApply: true,
    };

    let scriptTag = existingJobScript as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'seo-schema-jobposting';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(schemaData, null, 2);
  } else if (existingJobScript) {
    existingJobScript.remove();
  }

  // 8. Company Profile Structured Data
  const existingCompanyScript = document.getElementById('seo-schema-company');
  if (company) {
    const companySchema = {
      '@context': 'https://schema.org/',
      '@type': 'Organization',
      name: company.name,
      description: company.description,
      url: company.website || `https://forgehireloop.com/companies/${company.id}`,
      logo: company.logoUrl,
      address: {
        '@type': 'PostalAddress',
        addressLocality: company.location,
      },
      numberOfEmployees: {
        '@type': 'QuantitativeValue',
        name: company.size,
      },
    };

    let scriptTag = existingCompanyScript as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'seo-schema-company';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(companySchema, null, 2);
  } else if (existingCompanyScript) {
    existingCompanyScript.remove();
  }
}
