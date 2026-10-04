import React, { useState, useEffect } from 'react';
import { Job, Application } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { JobCard } from '../components/JobCard';
import { FAQSection } from '../components/FAQSection';
import {
  Search,
  MapPin,
  Filter,
  SlidersHorizontal,
  Briefcase,
  Sparkles,
  Bookmark,
  CheckCircle2,
  RefreshCw,
  Layers,
  Building,
} from 'lucide-react';

interface JobsViewProps {
  onSelectJob: (job: Job) => void;
  onApplyJob: (job: Job) => void;
  appliedJobIds: string[];
  initialTab?: 'all' | 'recommended' | 'saved';
}

export const JobsView: React.FC<JobsViewProps> = ({
  onSelectJob,
  onApplyJob,
  appliedJobIds,
  initialTab = 'all',
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'recommended' | 'saved'>(initialTab);

  // Toast Notification state
  const [bookmarkToast, setBookmarkToast] = useState<{
    message: string;
    isSaved: boolean;
  } | null>(null);

  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [workplaceType, setWorkplaceType] = useState('all');
  const [jobType, setJobType] = useState('all');
  const [experienceLevel, setExperienceLevel] = useState('all');
  const [industry, setIndustry] = useState('all');
  const [minSalary, setMinSalary] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'recent' | 'salary' | 'views'>('recent');

  // Data states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleBookmarkToggle = (job: Job, willBeSaved: boolean) => {
    const msg = willBeSaved
      ? `Saved "${job.title}" to your bookmarks`
      : `Removed "${job.title}" from your bookmarks`;
    setBookmarkToast({ message: msg, isSaved: willBeSaved });
    setTimeout(() => {
      setBookmarkToast(null);
    }, 3200);
  };

  // Debounced auto-fetch whenever search, location, jobType, experienceLevel, salary, etc. change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 250);

    return () => clearTimeout(timer);
  }, [
    searchQuery,
    locationQuery,
    workplaceType,
    jobType,
    experienceLevel,
    industry,
    minSalary,
    sortBy,
  ]);

  useEffect(() => {
    if (user?.role === 'candidate') {
      fetchRecommendations();
    }
  }, [user]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.getJobs({
        search: searchQuery,
        location: locationQuery === 'all' ? '' : locationQuery,
        workplaceType,
        jobType,
        experienceLevel,
        industry,
        minSalary: minSalary !== '' ? minSalary : undefined,
        sortBy,
      });
      setJobs(res.jobs);
    } catch (err) {
      console.error('Failed to load jobs', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await api.getJobRecommendations();
      setRecommendedJobs(res.recommendations);
    } catch (err) {
      console.error('Failed to load recommendations', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setLocationQuery('');
    setWorkplaceType('all');
    setJobType('all');
    setExperienceLevel('all');
    setIndustry('all');
    setMinSalary('');
    setSortBy('recent');
  };

  // Helper filter check for recommended and saved tabs
  const filterJobItem = (j: Job) => {
    if (locationQuery && locationQuery.trim() && locationQuery.toLowerCase() !== 'all') {
      const loc = locationQuery.toLowerCase().trim();
      const locMatch = j.location.toLowerCase().includes(loc);
      const remoteMatch =
        loc === 'remote' &&
        (j.workplaceType === 'remote' || j.location.toLowerCase().includes('remote'));
      if (!locMatch && !remoteMatch) return false;
    }
    if (jobType !== 'all' && j.jobType.toLowerCase() !== jobType.toLowerCase()) return false;
    if (workplaceType !== 'all' && j.workplaceType.toLowerCase() !== workplaceType.toLowerCase())
      return false;
    if (
      experienceLevel !== 'all' &&
      j.experienceLevel.toLowerCase() !== experienceLevel.toLowerCase()
    )
      return false;
    if (industry !== 'all' && j.industry.toLowerCase() !== industry.toLowerCase()) return false;
    if (minSalary !== '' && (j.salaryMax || j.salaryMin || 0) < Number(minSalary)) return false;
    return true;
  };

  // Determine jobs to display based on active tab
  const getDisplayedJobs = () => {
    if (activeTab === 'recommended') {
      return recommendedJobs.filter(filterJobItem);
    }
    if (activeTab === 'saved') {
      const savedIds = user?.savedJobIds || [];
      return jobs.filter(j => savedIds.includes(j.id)).filter(filterJobItem);
    }
    return jobs;
  };

  const displayedJobs = getDisplayedJobs();

  // Active filter count calculation
  const activeFiltersCount = [
    locationQuery && locationQuery !== 'all' && locationQuery.trim() !== '',
    jobType !== 'all',
    experienceLevel !== 'all',
    minSalary !== '' && minSalary > 0,
    workplaceType !== 'all',
    industry !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 relative">
      {/* Bookmark / Save Toast Notification */}
      {bookmarkToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-xs border border-slate-700 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className={`p-1 rounded-lg ${bookmarkToast.isSaved ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
            <Bookmark className="w-4 h-4 fill-current" />
          </div>
          <span>{bookmarkToast.message}</span>
        </div>
      )}

      {/* Search Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="max-w-3xl relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5" /> Over 1,200+ Verified Tech & Enterprise Jobs
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Find your next high-impact career move
          </h1>
          <p className="text-sm text-slate-300">
            Explore verified opportunities from top startups and global tech leaders. One-click apply with your saved resume.
          </p>
        </div>

        {/* Search Bar Input Form */}
        <form
          onSubmit={handleSearchSubmit}
          className="mt-6 bg-white p-2 rounded-2xl shadow-xl flex flex-col md:flex-row gap-2"
        >
          <div className="flex-1 flex items-center px-3 gap-2 border-b md:border-b-0 md:border-r border-slate-200 py-2">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              id="search-job-input"
              type="text"
              placeholder="Job title, skill keywords (e.g. React, Python), or company"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-hidden"
            />
          </div>

          <div className="flex-1 flex items-center px-3 gap-2 py-2">
            <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              id="search-location-input"
              type="text"
              placeholder="City, state, or 'Remote'"
              value={locationQuery}
              onChange={e => setLocationQuery(e.target.value)}
              className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-hidden"
            />
          </div>

          <button
            id="search-submit-btn"
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <Search className="w-4 h-4" />
            Search Jobs
          </button>
        </form>
      </div>

      {/* Navigation Tabs (All, Recommended, Saved) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            id="tab-all-jobs"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            All Job Openings ({jobs.length})
          </button>

          {user?.role === 'candidate' && (
            <>
              <button
                id="tab-recommended-jobs"
                onClick={() => setActiveTab('recommended')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                  activeTab === 'recommended'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Recommended for You ({recommendedJobs.length})
              </button>

              <button
                id="tab-saved-jobs"
                onClick={() => setActiveTab('saved')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                  activeTab === 'saved'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                Saved ({user?.savedJobIds?.length || 0})
              </button>
            </>
          )}
        </div>

        {/* Mobile Filter toggle button */}
        <div className="flex items-center gap-2">
          <button
            id="mobile-toggle-filters-btn"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="md:hidden px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            Filters
          </button>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="hidden sm:inline text-slate-400">Sort:</span>
            <select
              id="jobs-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-hidden"
            >
              <option value="recent">Most Recent</option>
              <option value="salary">Highest Salary</option>
              <option value="views">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Filters Sidebar + Job Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Filter Sidebar */}
        <div className={`${filtersOpen ? 'block' : 'hidden'} md:block md:col-span-1 space-y-4`}>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" /> Filter Jobs
              </span>
              <button
                id="reset-filters-btn"
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
              >
                Reset All
              </button>
            </div>

            {/* Location & Market Filter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-800">Location</label>
                {locationQuery && locationQuery !== 'all' && (
                  <button
                    onClick={() => setLocationQuery('')}
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <select
                id="filter-location-select"
                value={locationQuery || 'all'}
                onChange={e => setLocationQuery(e.target.value === 'all' ? '' : e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-hidden mb-2"
              >
                <option value="all">All Locations</option>
                <option value="remote">Remote (Worldwide / US)</option>
                <option value="San Francisco, CA">San Francisco, CA</option>
                <option value="New York, NY">New York, NY</option>
                <option value="Austin, TX">Austin, TX</option>
                <option value="Seattle, WA">Seattle, WA</option>
                <option value="Boston, MA">Boston, MA</option>
              </select>

              {/* Quick location pills */}
              <div className="flex flex-wrap gap-1">
                {[
                  { id: '', label: 'All' },
                  { id: 'remote', label: 'Remote' },
                  { id: 'San Francisco, CA', label: 'SF' },
                  { id: 'New York, NY', label: 'NYC' },
                  { id: 'Austin, TX', label: 'Austin' },
                  { id: 'Seattle, WA', label: 'Seattle' },
                ].map(loc => {
                  const isSelected =
                    (loc.id === '' && (!locationQuery || locationQuery === 'all')) ||
                    (loc.id !== '' && locationQuery.toLowerCase() === loc.id.toLowerCase());
                  return (
                    <button
                      key={loc.id || 'all-pill'}
                      type="button"
                      onClick={() => setLocationQuery(loc.id)}
                      className={`text-[10px] px-2 py-1 rounded-md transition font-medium ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {loc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workplace Arrangement */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">Workplace Type</label>
              <div className="space-y-1.5">
                {[
                  { id: 'all', label: 'All Arrangements' },
                  { id: 'remote', label: 'Remote' },
                  { id: 'hybrid', label: 'Hybrid' },
                  { id: 'onsite', label: 'On-site' },
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name="workplaceFilter"
                      checked={workplaceType === opt.id}
                      onChange={() => setWorkplaceType(opt.id)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Job Type */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">Employment Type</label>
              <div className="space-y-1.5">
                {[
                  { id: 'all', label: 'All Types' },
                  { id: 'full-time', label: 'Full-time' },
                  { id: 'part-time', label: 'Part-time' },
                  { id: 'contract', label: 'Contract' },
                  { id: 'internship', label: 'Internship' },
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name="jobTypeFilter"
                      checked={jobType === opt.id}
                      onChange={() => setJobType(opt.id)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Seniority / Experience Level */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">Experience Level</label>
              <div className="space-y-1.5">
                {[
                  { id: 'all', label: 'All Levels' },
                  { id: 'entry', label: 'Entry Level (0-2 yrs)' },
                  { id: 'mid', label: 'Mid Level (2-5 yrs)' },
                  { id: 'senior', label: 'Senior (5+ yrs)' },
                  { id: 'lead', label: 'Lead / Principal' },
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name="expLevelFilter"
                      checked={experienceLevel === opt.id}
                      onChange={() => setExperienceLevel(opt.id)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">Industry</label>
              <select
                id="filter-industry-select"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-hidden"
              >
                <option value="all">All Industries</option>
                <option value="Software & Technology">Software & Technology</option>
                <option value="Cloud & Infrastructure">Cloud & Infrastructure</option>
                <option value="Fintech & Banking">Fintech & Banking</option>
                <option value="Healthcare & Biotech">Healthcare & Biotech</option>
                <option value="Robotics & Hardware">Robotics & Hardware</option>
              </select>
            </div>

            {/* Minimum Salary Range */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-800">Min Annual Salary</label>
                <span className="text-xs font-semibold text-blue-600">
                  {minSalary ? `$${Number(minSalary).toLocaleString()}` : 'Any'}
                </span>
              </div>
              <input
                id="filter-salary-range"
                type="range"
                min="0"
                max="200000"
                step="10000"
                value={minSalary || 0}
                onChange={e => setMinSalary(Number(e.target.value) === 0 ? '' : Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 mb-2.5">
                <span>$0</span>
                <span>$100k</span>
                <span>$200k+</span>
              </div>

              {/* Quick Salary Presets */}
              <div className="flex flex-wrap gap-1">
                {[
                  { val: '', label: 'Any' },
                  { val: 80000, label: '$80k+' },
                  { val: 120000, label: '$120k+' },
                  { val: 150000, label: '$150k+' },
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setMinSalary(preset.val)}
                    className={`text-[10px] px-2 py-0.5 rounded-md transition font-medium ${
                      (preset.val === '' && (minSalary === '' || minSalary === 0)) ||
                      (preset.val !== '' && minSalary === preset.val)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Job Cards Grid */}
        <div className="md:col-span-3 space-y-4">
          {/* Active Filter Tags Bar */}
          {activeFiltersCount > 0 && (
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Active Filters ({activeFiltersCount}):
                </span>
                {locationQuery && locationQuery !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    <MapPin className="w-3 h-3" /> {locationQuery}
                    <button onClick={() => setLocationQuery('')} className="hover:text-blue-900 ml-0.5">
                      ×
                    </button>
                  </span>
                )}
                {jobType !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Type: {jobType}
                    <button onClick={() => setJobType('all')} className="hover:text-indigo-900 ml-0.5">
                      ×
                    </button>
                  </span>
                )}
                {experienceLevel !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    Exp: {experienceLevel}
                    <button onClick={() => setExperienceLevel('all')} className="hover:text-purple-900 ml-0.5">
                      ×
                    </button>
                  </span>
                )}
                {minSalary !== '' && minSalary > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Min: ${Number(minSalary).toLocaleString()}
                    <button onClick={() => setMinSalary('')} className="hover:text-emerald-900 ml-0.5">
                      ×
                    </button>
                  </span>
                )}
                {workplaceType !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    Workplace: {workplaceType}
                    <button onClick={() => setWorkplaceType('all')} className="hover:text-amber-900 ml-0.5">
                      ×
                    </button>
                  </span>
                )}
                {industry !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
                    {industry}
                    <button onClick={() => setIndustry('all')} className="hover:text-slate-900 ml-0.5">
                      ×
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            </div>
          )}
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-2 text-blue-600" />
              <p className="text-xs font-medium">Fetching job listings...</p>
            </div>
          ) : displayedJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No jobs match your criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try widening your search terms, removing filters, or resetting the workplace arrangement.
              </p>
              <button
                id="empty-reset-filters-btn"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-blue-50 text-blue-600 font-semibold text-xs rounded-xl hover:bg-blue-100 transition"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {displayedJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  onSelect={onSelectJob}
                  onApply={onApplyJob}
                  isApplied={appliedJobIds.includes(job.id)}
                  onBookmarkToggle={handleBookmarkToggle}
                />
              ))}
            </div>
          )}

          {/* Search-optimized FAQ Section with Schema.org JSON-LD */}
          <FAQSection />
        </div>
      </div>
    </div>
  );
};
