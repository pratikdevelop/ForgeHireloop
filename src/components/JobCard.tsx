import React from 'react';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  MapPin,
  Building,
  DollarSign,
  Bookmark,
  CheckCircle,
  Clock,
  Briefcase,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface JobCardProps {
  job: Job;
  onSelect: (job: Job) => void;
  onApply: (job: Job) => void;
  isApplied?: boolean;
  onBookmarkToggle?: (job: Job, willBeSaved: boolean) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onSelect,
  onApply,
  isApplied,
  onBookmarkToggle,
}) => {
  const { user, toggleSaveJob } = useAuth();
  const isSaved = user?.savedJobIds?.includes(job.id);

  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return 'Competitive Salary';
    const min = job.salaryMin ? `$${(job.salaryMin / 1000).toFixed(0)}k` : '';
    const max = job.salaryMax ? `$${(job.salaryMax / 1000).toFixed(0)}k` : '';
    if (min && max) return `${min} - ${max} / yr`;
    return `${min || max} / yr`;
  };

  const getWorkplaceBadgeColor = () => {
    switch (job.workplaceType) {
      case 'remote':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'hybrid':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const timeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  return (
    <div
      id={`job-card-${job.id}`}
      onClick={() => onSelect(job)}
      className="group bg-white rounded-xl border border-slate-200 hover:border-blue-400 p-5 transition shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between relative"
    >
      <div>
        {/* Top bar: Company & Bookmark */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={job.company?.logoUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&auto=format&fit=crop&q=80'}
              alt={`${job.company?.name || 'Company'} logo - ${job.title}`}
              loading="lazy"
              className="w-12 h-12 rounded-lg object-cover border border-slate-100 shrink-0"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition">
                  {job.company?.name || 'Top Company'}
                </span>
                {job.company?.verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" title="Verified Employer" />
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                {job.title}
              </h3>
            </div>
          </div>

          <button
            id={`bookmark-btn-${job.id}`}
            type="button"
            onClick={e => {
              e.stopPropagation();
              const nextState = !isSaved;
              toggleSaveJob(job.id);
              if (onBookmarkToggle) {
                onBookmarkToggle(job, nextState);
              }
            }}
            title={isSaved ? 'Remove Bookmark' : 'Save Job'}
            className={`p-2 rounded-lg transition ${
              isSaved
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Location & Workplace Metadata */}
        <div className="flex flex-wrap items-center gap-2 mt-3.5 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {job.location}
          </span>
          <span className="text-slate-300">•</span>
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize ${getWorkplaceBadgeColor()}`}>
            {job.workplaceType}
          </span>
          <span className="text-slate-300">•</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium capitalize">
            {job.jobType}
          </span>
        </div>

        {/* Salary & Experience */}
        <div className="flex items-center gap-4 mt-3">
          <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
            <span>{formatSalary()}</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            <span>{job.minExperienceYears}+ yrs exp</span>
          </div>
        </div>

        {/* Skill tags */}
        <div className="flex flex-wrap gap-1.5 mt-3.5">
          {job.skills.slice(0, 4).map((skill, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-md font-medium"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="px-1.5 py-0.5 text-xs text-slate-400 font-medium">
              +{job.skills.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="border-t border-slate-100 mt-4 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeAgo(job.postedAt)}</span>
          <span className="mx-1">•</span>
          <span>{job.applicantCount || 0} applicants</span>
        </div>

        <div className="flex items-center gap-2">
          {isApplied ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              Applied
            </span>
          ) : (
            <button
              id={`apply-quick-btn-${job.id}`}
              type="button"
              onClick={e => {
                e.stopPropagation();
                onApply(job);
              }}
              className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white text-xs font-semibold rounded-lg transition"
            >
              Quick Apply
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
