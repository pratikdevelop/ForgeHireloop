import React, { useEffect } from 'react';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { generateMetaTags } from '../utils/seo';
import {
  X,
  MapPin,
  Building,
  DollarSign,
  Bookmark,
  Briefcase,
  CheckCircle2,
  Share2,
  Calendar,
  Users,
  Globe,
  ShieldCheck,
  Flag,
  ArrowRight,
} from 'lucide-react';

interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (job: Job) => void;
  isApplied?: boolean;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  isOpen,
  onClose,
  onApply,
  isApplied,
}) => {
  const { user, toggleSaveJob, toggleFollowCompany } = useAuth();

  useEffect(() => {
    if (isOpen && job) {
      generateMetaTags('job', { job });
    }
  }, [isOpen, job?.id]);

  if (!isOpen || !job) return null;

  const isSaved = user?.savedJobIds?.includes(job.id);
  const isFollowing = user?.followedCompanyIds?.includes(job.companyId);

  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return 'Competitive compensation based on experience';
    const min = job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : '';
    const max = job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : '';
    if (min && max) return `${min} - ${max} USD / year`;
    return `${min || max} USD / year`;
  };

  const handleReport = async () => {
    const reason = window.prompt('Please enter the reason for reporting this job listing:');
    if (!reason) return;
    try {
      await api.reportContent({
        targetType: 'job',
        targetId: job.id,
        targetTitle: `${job.title} at ${job.company?.name}`,
        reason,
      });
      alert('Thank you. This listing has been reported to platform administrators for review.');
    } catch (err) {
      alert('Failed to submit report');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-start gap-4">
            <img
              src={job.company?.logoUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=120&auto=format&fit=crop&q=80'}
              alt={`${job.company?.name || 'Company'} logo - ${job.title}`}
              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
              loading="eager"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">{job.company?.name}</span>
                {job.company?.verified && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 font-medium">
                    <ShieldCheck className="w-4 h-4" /> Verified
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">{job.title}</h1>
              
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {job.location}
                </span>
                <span className="text-slate-300">•</span>
                <span className="capitalize font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                  {job.workplaceType}
                </span>
                <span className="text-slate-300">•</span>
                <span className="capitalize font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                  {job.jobType}
                </span>
                <span className="text-slate-300">•</span>
                <span className="capitalize text-slate-600">
                  {job.experienceLevel} level ({job.minExperienceYears}+ yrs)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="detail-modal-bookmark-btn"
              onClick={() => toggleSaveJob(job.id)}
              className={`p-2 rounded-xl border transition ${
                isSaved
                  ? 'border-blue-300 bg-blue-50 text-blue-600'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              id="close-detail-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick highlight bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Offered Salary
              </span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5">
                {formatSalary()}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Industry
              </span>
              <span className="text-sm font-semibold text-slate-900 block mt-0.5">
                {job.industry}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Posted Date
              </span>
              <span className="text-sm font-semibold text-slate-900 block mt-0.5">
                {new Date(job.postedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Job Description */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              Role Overview
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </div>

          {/* Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                Core Responsibilities
              </h2>
              <ul className="space-y-2">
                {job.responsibilities.map((resp, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0"></span>
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                Requirements & Qualifications
              </h2>
              <ul className="space-y-2">
                {job.requirements.map((req, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0"></span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills Required */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              Key Technologies & Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill, idx) => {
                const userHasSkill = user?.skills?.some(
                  s => s.toLowerCase() === skill.toLowerCase()
                );
                return (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      userHasSkill
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {userHasSkill && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                    {skill}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Company Card */}
          {job.company && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">About {job.company.name}</h3>
                  {job.company.website && (
                    <a
                      href={job.company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" /> Website
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{job.company.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>{job.company.size}</span>
                  <span>•</span>
                  <span>{job.company.location}</span>
                </div>
              </div>

              {user?.role === 'candidate' && (
                <button
                  id="follow-company-detail-btn"
                  onClick={() => toggleFollowCompany(job.companyId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                    isFollowing
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {isFollowing ? 'Following' : '+ Follow'}
                </button>
              )}
            </div>
          )}

          {/* Report link */}
          <div className="pt-2 text-right">
            <button
              id="report-job-btn"
              onClick={handleReport}
              className="text-[11px] text-slate-400 hover:text-rose-600 transition inline-flex items-center gap-1"
            >
              <Flag className="w-3 h-3" /> Report this job posting
            </button>
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <span>{job.applicantCount || 0} applicants</span>
            <span className="mx-2">•</span>
            <span>{job.viewsCount || 0} views</span>
          </div>

          <div className="flex items-center gap-3">
            {isApplied ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Application Submitted
              </div>
            ) : (
              <button
                id="modal-apply-btn"
                onClick={() => onApply(job)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-2"
              >
                Apply Now <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
