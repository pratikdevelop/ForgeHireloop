import React, { useState, useEffect } from 'react';
import { ChevronDown, HelpCircle, Users, Building2, Sparkles, CheckCircle2 } from 'lucide-react';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'candidates' | 'employers';
}

export const FAQ_DATA: FAQItem[] = [
  // Candidate FAQs
  {
    id: 'cand-1',
    category: 'candidates',
    question: 'How does 1-click apply and resume parsing work on ForgeHireloop?',
    answer:
      'When you upload your resume (PDF or DOCX), ForgeHireloop parses your technical skills, work history, and job titles. You can submit complete job applications in one click directly to verified employer applicant tracking pipelines without retyping your experience.',
  },
  {
    id: 'cand-2',
    category: 'candidates',
    question: 'How do custom job alerts notify me of new openings?',
    answer:
      'You can create targeted job alert filters by role, keyword, remote or hybrid workplace arrangement, and minimum target compensation. Whenever a hiring team posts a matching role, you receive real-time notifications so you can be among the first applicants.',
  },
  {
    id: 'cand-3',
    category: 'candidates',
    question: 'Is my candidate profile and contact information private?',
    answer:
      'Yes. Your contact information and resume are only shared with the employers and recruiting teams of jobs you explicitly apply to. You can also bookmark jobs to review later and follow specific companies to stay updated on their hiring cycles.',
  },
  {
    id: 'cand-4',
    category: 'candidates',
    question: 'Are jobs on ForgeHireloop verified and active?',
    answer:
      'All employer accounts undergo verification before postings go live. Our moderation team and automated status checks regularly audit active listings to ensure salary transparency, legitimate employer identities, and responsive recruiting loops.',
  },

  // Employer FAQs
  {
    id: 'emp-1',
    category: 'employers',
    question: 'How fast can our team post jobs and start receiving candidates?',
    answer:
      'Employer accounts can publish job openings in under two minutes. Specify compensation ranges, required qualifications, workplace types (Remote, Hybrid, On-site), and custom application screening questions to attract high-intent applicants immediately.',
  },
  {
    id: 'emp-2',
    category: 'employers',
    question: 'How does the ForgeHireloop ATS pipeline organize applicants?',
    answer:
      'The built-in employer applicant tracking system (ATS) organizes candidates through structured stages: Submitted, In Review, Shortlisted, Interviewing, Offered, and Archived. You can record internal review notes, filter by skills, and message candidates directly within the platform.',
  },
  {
    id: 'emp-3',
    category: 'employers',
    question: 'What is the Verified Employer Badge and how do we earn it?',
    answer:
      'The Verified Employer badge confirms organizational legitimacy to candidates. It is automatically granted upon company domain email authentication or administrative review, increasing candidate application rates by over 40%.',
  },
  {
    id: 'emp-4',
    category: 'employers',
    question: 'Can we search the candidate resume database directly?',
    answer:
      'Yes. Employers have access to search opted-in candidate profiles by specific programming languages, frameworks, years of experience, and location preferences to proactively source talent before postings close.',
  },
];

export const FAQSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'candidates' | 'employers'>('candidates');
  const [openIds, setOpenIds] = useState<string[]>(['cand-1', 'emp-1']);

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = FAQ_DATA.filter((f) => f.category === selectedCategory);

  // Inject Google FAQPage Schema.org structured data (JSON-LD)
  useEffect(() => {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_DATA.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };

    let script = document.getElementById('seo-schema-faqpage') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'seo-schema-faqpage';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(faqSchema);

    return () => {
      const el = document.getElementById('seo-schema-faqpage');
      if (el) el.remove();
    };
  }, []);

  return (
    <section id="faq-section" className="mt-16 bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-600">
            Everything you need to know about job hunting, 1-click applications, and recruiting on ForgeHireloop.
          </p>
        </div>

        {/* Category Toggle Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            id="faq-tab-candidates"
            onClick={() => setSelectedCategory('candidates')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              selectedCategory === 'candidates'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            For Candidates
          </button>
          <button
            id="faq-tab-employers"
            onClick={() => setSelectedCategory('employers')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              selectedCategory === 'employers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            For Employers
          </button>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen ? 'border-blue-200 bg-blue-50/20' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <button
                  id={`faq-btn-${faq.id}`}
                  onClick={() => toggleItem(faq.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-sm sm:text-base text-slate-900">
                    {faq.question}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-sm text-slate-600 leading-relaxed border-t border-blue-100/50">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust Footnote */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Verified tech jobs with salary transparency</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Indexed with Schema.org JSON-LD for search engine snippets</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export const FAQAccordion = FAQSection;
