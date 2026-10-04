import React, { useState, useEffect } from 'react';
import { Company, Job } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { generateMetaTags } from '../utils/seo';
import {
  Building2,
  Search,
  Globe,
  MapPin,
  Users,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface CompaniesViewProps {
  onSelectJob: (job: Job) => void;
  onApplyJob: (job: Job) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({ onSelectJob, onApplyJob }) => {
  const { user, toggleFollowCompany } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyJobs, setCompanyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      generateMetaTags('company', { company: selectedCompany });
    } else {
      generateMetaTags('static', {
        title: 'Top Tech Companies Hiring Now | ForgeHireloop',
        description: 'Browse verified company profiles, tech stacks, open engineering roles, and company benefits on ForgeHireloop.',
      });
    }
  }, [selectedCompany?.id]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await api.getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Failed to load companies', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCompanyDetail = async (company: Company) => {
    setSelectedCompany(company);
    try {
      const res = await api.getCompanyById(company.id);
      setCompanyJobs(res.jobs || []);
    } catch (err) {
      console.error('Failed to load company details', err);
    }
  };

  const filteredCompanies = companies.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" /> Explore Hiring Companies
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Discover verified companies, their engineering cultures, and open job roles
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="search-companies-input"
            type="text"
            placeholder="Search company or industry..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading companies...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.map(comp => {
            const isFollowing = user?.followedCompanyIds?.includes(comp.id);
            return (
              <div
                key={comp.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <img
                      src={comp.logoUrl}
                      alt={`${comp.name} company logo`}
                      loading="lazy"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                    />

                    {user?.role === 'candidate' && (
                      <button
                        id={`follow-company-btn-${comp.id}`}
                        onClick={() => toggleFollowCompany(comp.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          isFollowing
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        {isFollowing ? 'Following' : '+ Follow'}
                      </button>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base font-bold text-slate-900">{comp.name}</h2>
                      {comp.verified && (
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" title="Verified" />
                      )}
                    </div>
                    <span className="text-xs text-blue-600 font-medium block">{comp.industry}</span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {comp.description}
                  </p>

                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {comp.size}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {comp.location}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    {comp.activeJobsCount || 0} open positions
                  </span>
                  <button
                    id={`view-company-jobs-btn-${comp.id}`}
                    onClick={() => handleOpenCompanyDetail(comp)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    View Company & Jobs →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Company Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={selectedCompany.logoUrl}
                  alt={selectedCompany.name}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-lg font-bold text-slate-900">{selectedCompany.name}</h2>
                    {selectedCompany.verified && (
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{selectedCompany.industry} • {selectedCompany.location}</p>
                  {selectedCompany.website && (
                    <a
                      href={selectedCompany.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      <Globe className="w-3 h-3" /> {selectedCompany.website}
                    </a>
                  )}
                </div>
              </div>
              <button
                id="close-company-detail-btn"
                onClick={() => setSelectedCompany(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">About Us</h3>
                <p className="text-xs text-slate-700 leading-relaxed">{selectedCompany.description}</p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Open Positions at {selectedCompany.name} ({companyJobs.length})
                </h3>

                {companyJobs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No active openings right now.</p>
                ) : (
                  <div className="space-y-2.5">
                    {companyJobs.map(job => (
                      <div
                        key={job.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{job.title}</h4>
                          <span className="text-[11px] text-slate-500">
                            {job.location} • {job.workplaceType} • {job.jobType}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            id={`company-job-view-btn-${job.id}`}
                            onClick={() => {
                              setSelectedCompany(null);
                              onSelectJob(job);
                            }}
                            className="px-3 py-1 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold rounded-lg"
                          >
                            Details
                          </button>
                          <button
                            id={`company-job-apply-btn-${job.id}`}
                            onClick={() => {
                              setSelectedCompany(null);
                              onApplyJob(job);
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
