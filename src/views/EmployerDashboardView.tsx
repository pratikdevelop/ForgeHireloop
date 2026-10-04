import React, { useState, useEffect } from 'react';
import { Job, Application, ApplicationStatus, User, Company, InterviewSlot } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SalaryAnalytics } from '../components/SalaryAnalytics';
import { InterviewScheduler } from '../components/InterviewScheduler';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Briefcase,
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Mail,
  Building,
  Filter,
  Eye,
  MessageSquare,
  Sparkles,
  Award,
  ChevronDown,
  ExternalLink,
  Download,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

interface EmployerDashboardViewProps {
  initialTab?: 'jobs' | 'applicants' | 'interviews' | 'salary-trends' | 'resumes' | 'company';
  onOpenPostJob: (jobToEdit?: Job) => void;
  onOpenMessages: (recipientId?: string, recipientName?: string) => void;
}

export const EmployerDashboardView: React.FC<EmployerDashboardViewProps> = ({
  initialTab = 'jobs',
  onOpenPostJob,
  onOpenMessages,
}) => {
  const { user, company, updateCompanyProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'jobs' | 'applicants' | 'interviews' | 'salary-trends' | 'resumes' | 'company'
  >(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Employer state
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [allMarketJobs, setAllMarketJobs] = useState<Job[]>([]);
  const [compensationViewMode, setCompensationViewMode] = useState<'distribution' | 'roles'>('distribution');
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [selectedJobIdFilter, setSelectedJobIdFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Resume Search
  const [resumeSearchKeyword, setResumeSearchKeyword] = useState('');
  const [resumeMinExp, setResumeMinExp] = useState<number>(0);
  const [resumeResults, setResumeResults] = useState<User[]>([]);
  const [searchingResumes, setSearchingResumes] = useState(false);

  // Company Profile Form
  const [companyName, setCompanyName] = useState(company?.name || '');
  const [companyDesc, setCompanyDesc] = useState(company?.description || '');
  const [companyIndustry, setCompanyIndustry] = useState(company?.industry || '');
  const [companySize, setCompanySize] = useState(company?.size || '51-200 employees');
  const [companyWebsite, setCompanyWebsite] = useState(company?.website || '');
  const [companyLocation, setCompanyLocation] = useState(company?.location || '');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(company?.logoUrl || '');
  const [companySavedMsg, setCompanySavedMsg] = useState(false);

  // Status update modal / interview scheduling
  const [activeApplicant, setActiveApplicant] = useState<Application | null>(null);
  const [interviewDateInput, setInterviewDateInput] = useState('');
  const [statusNoteInput, setStatusNoteInput] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmployerData();
  }, []);

  const loadEmployerData = async () => {
    setLoading(true);
    try {
      const [jobsData, appsData, marketJobsRes] = await Promise.all([
        api.getMyPostedJobs(),
        api.getEmployerApplications(),
        api.getJobs({}),
      ]);
      setPostedJobs(jobsData);
      setApplicants(appsData);
      setAllMarketJobs(marketJobsRes.jobs || []);
    } catch (err) {
      console.error('Failed to load employer data', err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregated Salary Distribution for Competitive Compensation Analysis
  const getSalaryDistributionAnalytics = () => {
    const targetJobs = allMarketJobs.length > 0 ? allMarketJobs : postedJobs;

    const brackets = [
      { range: '< $80k', min: 0, max: 80000, label: 'Entry (<$80k)' },
      { range: '$80k - $110k', min: 80000, max: 110000, label: 'Junior ($80k-$110k)' },
      { range: '$110k - $140k', min: 110000, max: 140000, label: 'Mid-Level ($110k-$140k)' },
      { range: '$140k - $170k', min: 140000, max: 170000, label: 'Senior ($140k-$170k)' },
      { range: '$170k - $200k', min: 170000, max: 200000, label: 'Staff / Lead ($170k-$200k)' },
      { range: '$200k+', min: 200000, max: 999999, label: 'Principal / Exec ($200k+)' },
    ];

    const distribution = brackets.map(b => {
      const marketMatching = targetJobs.filter(j => {
        const mid =
          j.salaryMin && j.salaryMax
            ? (j.salaryMin + j.salaryMax) / 2
            : j.salaryMin || j.salaryMax || 0;
        return mid >= b.min && mid < b.max;
      });

      const companyMatching = postedJobs.filter(j => {
        const mid =
          j.salaryMin && j.salaryMax
            ? (j.salaryMin + j.salaryMax) / 2
            : j.salaryMin || j.salaryMax || 0;
        return mid >= b.min && mid < b.max;
      });

      return {
        range: b.range,
        bracketLabel: b.label,
        marketJobs: marketMatching.length,
        companyJobs: companyMatching.length,
      };
    });

    const allSalaries = targetJobs
      .map(j =>
        j.salaryMin && j.salaryMax
          ? (j.salaryMin + j.salaryMax) / 2
          : j.salaryMin || j.salaryMax || 0
      )
      .filter(s => s > 0);

    allSalaries.sort((a, b) => a - b);
    const medianSalary =
      allSalaries.length > 0 ? allSalaries[Math.floor(allSalaries.length / 2)] : 145000;
    const minSalary = allSalaries.length > 0 ? allSalaries[0] : 70000;
    const maxSalary = allSalaries.length > 0 ? allSalaries[allSalaries.length - 1] : 220000;

    return {
      distribution,
      totalMarketJobs: targetJobs.length,
      medianSalary: Math.round(medianSalary / 1000),
      minSalary: Math.round(minSalary / 1000),
      maxSalary: Math.round(maxSalary / 1000),
    };
  };

  const handleToggleJobStatus = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    try {
      await api.updateJob(jobId, { status: newStatus as any });
      setPostedJobs(postedJobs.map(j => (j.id === jobId ? { ...j, status: newStatus as any } : j)));
    } catch (err) {
      alert('Failed to update job status');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;
    try {
      await api.deleteJob(jobId);
      setPostedJobs(postedJobs.filter(j => j.id !== jobId));
    } catch (err) {
      alert('Failed to delete job');
    }
  };

  const handleUpdateApplicantStatus = async (
    applicantId: string,
    newStatus: ApplicationStatus,
    interviewDate?: string
  ) => {
    try {
      const updated = await api.updateApplicationStatus(applicantId, {
        status: newStatus,
        note: statusNoteInput || `Status updated to ${newStatus}`,
        interviewDate: interviewDate || undefined,
      });

      setApplicants(applicants.map(a => (a.id === applicantId ? { ...a, ...updated } : a)));
      setActiveApplicant(null);
      setStatusNoteInput('');
      setInterviewDateInput('');
    } catch (err) {
      alert('Failed to update application status');
    }
  };

  const handleUpdateInterviewSlots = async (
    applicantId: string,
    status: 'interview',
    slots: InterviewSlot[],
    note?: string
  ) => {
    try {
      const nextDate = slots.length > 0 ? slots[0].dateTime : undefined;
      const updated = await api.updateApplicationStatus(applicantId, {
        status,
        note: note || 'Updated interview invitation slots',
        interviewDate: nextDate,
        interviewSlots: slots,
      });

      setApplicants((prev) =>
        prev.map((a) => (a.id === applicantId ? { ...a, ...updated } : a))
      );
    } catch (err: any) {
      console.error('Failed to update interview slots:', err);
      throw err;
    }
  };

  const handleSearchResumeDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchingResumes(true);
    try {
      const res = await api.searchCandidates({
        keyword: resumeSearchKeyword,
        minExperience: resumeMinExp > 0 ? resumeMinExp : undefined,
      });
      setResumeResults(res);
    } catch (err) {
      console.error('Failed to search resumes', err);
    } finally {
      setSearchingResumes(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCompanyProfile({
        name: companyName,
        description: companyDesc,
        industry: companyIndustry,
        size: companySize,
        website: companyWebsite,
        location: companyLocation,
        logoUrl: companyLogoUrl,
      });
      setCompanySavedMsg(true);
      setTimeout(() => setCompanySavedMsg(false), 3000);
    } catch (err) {
      alert('Failed to save company profile');
    }
  };

  // Filter applicants
  const filteredApplicants = applicants.filter(app => {
    if (selectedJobIdFilter !== 'all' && app.jobId !== selectedJobIdFilter) return false;
    if (selectedStatusFilter !== 'all' && app.status !== selectedStatusFilter) return false;
    return true;
  });

  const avgSalary =
    postedJobs.length > 0
      ? Math.round(
          postedJobs.reduce((acc, j) => {
            const min = j.salaryMin || 0;
            const max = j.salaryMax || 0;
            const mid = min && max ? (min + max) / 2 : min || max;
            return acc + mid;
          }, 0) / postedJobs.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Recruiter Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={company?.logoUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&auto=format&fit=crop&q=80'}
            alt={company?.name}
            className="w-12 h-12 rounded-xl object-cover border border-slate-200"
          />
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-1.5">
              {company?.name || 'Company Portal'}
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">
                Recruiter Hub
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Manage postings, screen candidates, schedule interviews, and scout talent
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="employer-post-job-btn"
            onClick={() => onOpenPostJob()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Post New Job
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          id="employer-tab-jobs"
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'jobs'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          My Job Listings ({postedJobs.length})
        </button>

        <button
          id="employer-tab-applicants"
          onClick={() => setActiveTab('applicants')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'applicants'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Applicants ({applicants.length})
        </button>

        <button
          id="employer-tab-interviews"
          onClick={() => setActiveTab('interviews')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'interviews'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Interview Scheduler
          {applicants.filter((a) => a.interviewSlots && a.interviewSlots.length > 0).length > 0 && (
            <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] rounded-full font-bold">
              {applicants.filter((a) => a.interviewSlots && a.interviewSlots.length > 0).length}
            </span>
          )}
        </button>

        <button
          id="employer-tab-salary-trends"
          onClick={() => setActiveTab('salary-trends')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'salary-trends'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Salary Trends
        </button>

        <button
          id="employer-tab-resumes"
          onClick={() => setActiveTab('resumes')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'resumes'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Search className="w-4 h-4" />
          Search Resume Database
        </button>

        <button
          id="employer-tab-company"
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'company'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building className="w-4 h-4" />
          Company Profile
        </button>
      </div>

      {/* Tab 1: Posted Jobs */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          {postedJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Briefcase className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No active job listings</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create your first job listing to start receiving applications from qualified candidates.
              </p>
              <button
                id="empty-post-job-btn"
                onClick={() => onOpenPostJob()}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition"
              >
                Post a Job Now
              </button>
            </div>
          ) : (
            <>
              {/* Analytics & Salary Distribution Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Metric stats */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Recruiting Intelligence
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">Compensation Overview</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                      <span className="text-[11px] text-slate-500 font-medium block">Avg Offered Salary</span>
                      <span className="text-xl font-extrabold text-blue-900">
                        {avgSalary > 0 ? `$${(avgSalary / 1000).toFixed(0)}k / year` : 'Competitive'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 font-medium block">Active Openings</span>
                        <span className="text-lg font-bold text-slate-900">
                          {postedJobs.filter(j => j.status === 'active').length}
                        </span>
                      </div>
                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                        <span className="text-[11px] text-emerald-700 font-medium block">Total Applicants</span>
                        <span className="text-lg font-bold text-emerald-900">{applicants.length}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    id="recruiter-quick-post-btn"
                    onClick={() => onOpenPostJob()}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Post Another Role
                  </button>
                </div>

                {/* Salary Distribution Recharts Graph */}
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  {(() => {
                    const salaryAnalytics = getSalaryDistributionAnalytics();

                    return (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-blue-600" />
                                Competitive Compensation & Salary Distribution
                              </h3>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
                                {salaryAnalytics.totalMarketJobs} Jobs Analyzed
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Aggregated base salary brackets across all currently posted platform jobs vs. your company
                            </p>
                          </div>

                          {/* View Toggle */}
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                            <button
                              id="toggle-salary-distribution-btn"
                              type="button"
                              onClick={() => setCompensationViewMode('distribution')}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                                compensationViewMode === 'distribution'
                                  ? 'bg-white text-blue-600 shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Market Distribution
                            </button>
                            <button
                              id="toggle-salary-roles-btn"
                              type="button"
                              onClick={() => setCompensationViewMode('roles')}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                                compensationViewMode === 'roles'
                                  ? 'bg-white text-blue-600 shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              By Role Min/Max
                            </button>
                          </div>
                        </div>

                        {/* Benchmark KPIs */}
                        <div className="grid grid-cols-3 gap-2 py-1">
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Market Median</span>
                            <span className="text-sm font-extrabold text-slate-800">${salaryAnalytics.medianSalary}k / yr</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Platform Salary Range</span>
                            <span className="text-sm font-extrabold text-slate-800">
                              ${salaryAnalytics.minSalary}k – ${salaryAnalytics.maxSalary}k
                            </span>
                          </div>
                          <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 block">Recruiter Insight</span>
                            <span className="text-xs font-bold text-emerald-800">Competitive Tier</span>
                          </div>
                        </div>

                        {/* Recharts Chart */}
                        <div className="w-full h-56 pt-1">
                          <ResponsiveContainer width="100%" height="100%">
                            {compensationViewMode === 'distribution' ? (
                              <BarChart
                                data={salaryAnalytics.distribution}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis
                                  dataKey="range"
                                  tick={{ fontSize: 10, fill: '#64748B' }}
                                  axisLine={{ stroke: '#E2E8F0' }}
                                  tickLine={false}
                                />
                                <YAxis
                                  tick={{ fontSize: 11, fill: '#64748B' }}
                                  axisLine={false}
                                  tickLine={false}
                                  allowDecimals={false}
                                />
                                <Tooltip
                                  formatter={(value: any, name: any) => [
                                    `${value} job${value === 1 ? '' : 's'}`,
                                    name === 'marketJobs'
                                      ? 'All Market Postings'
                                      : 'Your Company Postings',
                                  ]}
                                  labelFormatter={(label: any) => `Salary Band: ${label}`}
                                  contentStyle={{
                                    backgroundColor: '#0F172A',
                                    borderColor: '#334155',
                                    borderRadius: '0.75rem',
                                    fontSize: '12px',
                                    color: '#FFFFFF',
                                  }}
                                />
                                <Legend
                                  wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                                  formatter={(value: string) =>
                                    value === 'marketJobs'
                                      ? 'Market Postings (All Companies)'
                                      : 'Your Company Postings'
                                  }
                                />
                                <Bar
                                  dataKey="marketJobs"
                                  name="marketJobs"
                                  fill="#3B82F6"
                                  radius={[4, 4, 0, 0]}
                                  maxBarSize={28}
                                />
                                <Bar
                                  dataKey="companyJobs"
                                  name="companyJobs"
                                  fill="#10B981"
                                  radius={[4, 4, 0, 0]}
                                  maxBarSize={28}
                                />
                              </BarChart>
                            ) : (
                              <BarChart
                                data={postedJobs.map(job => ({
                                  role:
                                    job.title.length > 16
                                      ? job.title.slice(0, 14) + '…'
                                      : job.title,
                                  fullTitle: job.title,
                                  min: job.salaryMin ? Math.round(job.salaryMin / 1000) : 0,
                                  max: job.salaryMax ? Math.round(job.salaryMax / 1000) : 0,
                                }))}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis
                                  dataKey="role"
                                  tick={{ fontSize: 11, fill: '#64748B' }}
                                  axisLine={{ stroke: '#E2E8F0' }}
                                  tickLine={false}
                                />
                                <YAxis
                                  tick={{ fontSize: 11, fill: '#64748B' }}
                                  axisLine={false}
                                  tickLine={false}
                                  unit="k"
                                />
                                <Tooltip
                                  formatter={(value: any, name: any) => [
                                    `$${value}k / yr`,
                                    name === 'min' ? 'Min Base Salary' : 'Max Base Salary',
                                  ]}
                                  labelFormatter={(label: any) => `Role: ${label}`}
                                  contentStyle={{
                                    backgroundColor: '#0F172A',
                                    borderColor: '#334155',
                                    borderRadius: '0.75rem',
                                    fontSize: '12px',
                                    color: '#FFFFFF',
                                  }}
                                />
                                <Legend
                                  wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                                  formatter={(value: string) =>
                                    value === 'min' ? 'Min Salary ($k)' : 'Max Salary ($k)'
                                  }
                                />
                                <Bar
                                  dataKey="min"
                                  name="min"
                                  fill="#93C5FD"
                                  radius={[4, 4, 0, 0]}
                                  maxBarSize={32}
                                />
                                <Bar
                                  dataKey="max"
                                  name="max"
                                  fill="#2563EB"
                                  radius={[4, 4, 0, 0]}
                                  maxBarSize={32}
                                />
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Jobs Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Company Job Listings ({postedJobs.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">Click any applicant count to review candidates</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Role Title</th>
                        <th className="py-3 px-4">Location & Type</th>
                        <th className="py-3 px-4">Salary Range</th>
                        <th className="py-3 px-4">Applicants</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {postedJobs.map(job => {
                        const jobApplicantsCount = applicants.filter(a => a.jobId === job.id).length;
                        return (
                          <tr key={job.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              <div className="text-sm font-bold text-slate-900">{job.title}</div>
                              <span className="text-[11px] text-slate-400 font-normal">
                                Posted {new Date(job.postedAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span>{job.location}</span>
                              <span className="text-slate-400 block capitalize">{job.workplaceType} • {job.jobType}</span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              {job.salaryMin && job.salaryMax
                                ? `$${(job.salaryMin / 1000).toFixed(0)}k - $${(job.salaryMax / 1000).toFixed(0)}k`
                                : 'Competitive'}
                            </td>
                            <td className="py-3.5 px-4">
                              <button
                                id={`view-applicants-job-${job.id}`}
                                onClick={() => {
                                  setSelectedJobIdFilter(job.id);
                                  setActiveTab('applicants');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                                title="Click to view applicants for this role"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>{jobApplicantsCount || job.applicantCount || 0} candidates</span>
                              </button>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  job.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {job.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              <button
                                id={`edit-job-btn-${job.id}`}
                                onClick={() => onOpenPostJob(job)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                                title="Edit Job"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                id={`toggle-status-job-${job.id}`}
                                onClick={() => handleToggleJobStatus(job.id, job.status)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                              >
                                {job.status === 'active' ? 'Close' : 'Reactivate'}
                              </button>
                              <button
                                id={`delete-job-btn-${job.id}`}
                                onClick={() => handleDeleteJob(job.id)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Applicants */}
      {activeTab === 'applicants' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Filter by Job:</span>
              <select
                id="applicant-job-filter"
                value={selectedJobIdFilter}
                onChange={e => setSelectedJobIdFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
              >
                <option value="all">All Jobs ({applicants.length})</option>
                {postedJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Status:</span>
              <select
                id="applicant-status-filter"
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white capitalize"
              >
                <option value="all">All Statuses</option>
                <option value="applied">Applied</option>
                <option value="viewed">Viewed</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Applicants Grid */}
          {filteredApplicants.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              No applicants found matching this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredApplicants.map(app => (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs hover:border-slate-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={app.candidate?.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${app.candidate?.name}`}
                        alt={app.candidate?.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{app.candidate?.name}</h3>
                        <p className="text-xs text-slate-500">
                          {app.candidate?.headline || app.candidate?.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span>Applied for: <strong>{app.job?.title}</strong></span>
                          <span>•</span>
                          <span>{new Date(app.appliedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg capitalize border border-slate-200">
                        Status: {app.status}
                      </span>
                      <button
                        id={`message-candidate-btn-${app.id}`}
                        onClick={() => onOpenMessages(app.candidateId, app.candidate?.name)}
                        className="p-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                        title="Send Message"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Skills badges of candidate */}
                  {app.candidate?.skills && app.candidate.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {app.candidate.skills.map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-700 rounded-md">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Cover note */}
                  {app.coverNote && (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100">
                      <span className="font-semibold block text-[11px] text-slate-500 mb-0.5">Candidate Note:</span>
                      &quot;{app.coverNote}&quot;
                    </div>
                  )}

                  {/* Scheduled Interview Banner */}
                  {app.interviewDate && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Interview scheduled for: {new Date(app.interviewDate).toLocaleString()}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('interviews')}
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        View in Scheduler &rarr;
                      </button>
                    </div>
                  )}

                  {/* Action controls */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-slate-700">
                        Resume: {app.resumeFileName || 'Resume.pdf'}
                      </span>
                      {app.resumeUrl && (
                        <a
                          id={`download-resume-btn-${app.id}`}
                          href={app.resumeUrl}
                          download={app.resumeFileName || `${app.candidate?.name || 'Candidate'}_Resume.pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline ml-2 bg-blue-50 px-2 py-0.5 rounded"
                        >
                          <Download className="w-3.5 h-3.5" /> View / Download
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        id={`status-shortlist-btn-${app.id}`}
                        onClick={() => handleUpdateApplicantStatus(app.id, 'shortlisted')}
                        className="px-3 py-1 text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg border border-purple-200"
                      >
                        Shortlist
                      </button>

                      <button
                        id={`status-interview-btn-${app.id}`}
                        onClick={() => setActiveApplicant(app)}
                        className="px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                      >
                        Schedule Interview
                      </button>

                      <button
                        id={`status-hire-btn-${app.id}`}
                        onClick={() => handleUpdateApplicantStatus(app.id, 'hired')}
                        className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                      >
                        Extend Offer
                      </button>

                      <button
                        id={`status-reject-btn-${app.id}`}
                        onClick={() => handleUpdateApplicantStatus(app.id, 'rejected')}
                        className="px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Interview Scheduler */}
      {activeTab === 'interviews' && (
        <InterviewScheduler
          applicants={applicants}
          onUpdateApplicantStatus={handleUpdateInterviewSlots}
          onOpenMessages={onOpenMessages}
        />
      )}

      {/* Tab: Salary Trends (Recharts) */}
      {activeTab === 'salary-trends' && (
        <SalaryAnalytics
          jobs={postedJobs}
          allMarketJobs={allMarketJobs}
        />
      )}

      {/* Tab 3: Search Resume Database */}
      {activeTab === 'resumes' && (
        <div className="space-y-4">
          <form
            onSubmit={handleSearchResumeDatabase}
            className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4"
          >
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Talent Sourcing & Candidate Search
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keywords or Skills</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="resume-search-input"
                    type="text"
                    placeholder="e.g. React, TypeScript, GraphQL, AWS"
                    value={resumeSearchKeyword}
                    onChange={e => setResumeSearchKeyword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Min Experience (Years)</label>
                <input
                  id="resume-min-exp-input"
                  type="number"
                  min="0"
                  max="20"
                  value={resumeMinExp}
                  onChange={e => setResumeMinExp(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden"
                />
              </div>
            </div>

            <button
              id="search-resumes-btn"
              type="submit"
              disabled={searchingResumes}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
            >
              {searchingResumes ? 'Searching...' : 'Search Candidate Profiles'}
            </button>
          </form>

          {/* Results */}
          <div className="space-y-3">
            {resumeResults.length > 0 ? (
              resumeResults.map(cand => (
                <div
                  key={cand.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={cand.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${cand.name}`}
                      alt={cand.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{cand.name}</h3>
                      <p className="text-xs text-slate-500">{cand.headline}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {cand.location || 'Location Not Specified'} • {cand.experienceYears || 0} years experience
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cand.skills?.map((s, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded-md font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id={`contact-candidate-btn-${cand.id}`}
                      onClick={() => onOpenMessages(cand.id, cand.name)}
                      className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white text-xs font-semibold rounded-lg transition"
                    >
                      Contact Candidate
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-slate-400 py-6">
                Type a keyword (e.g. &quot;React&quot;) and search the candidate directory.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Company Profile */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Company Branding & Details
            </h2>
            {companySavedMsg && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Changes Saved!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
              <input
                id="company-name-input"
                type="text"
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
              <input
                id="company-industry-input"
                type="text"
                value={companyIndustry}
                onChange={e => setCompanyIndustry(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Size</label>
              <select
                id="company-size-select"
                value={companySize}
                onChange={e => setCompanySize(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden bg-white"
              >
                <option value="1-10 employees">1-10 employees</option>
                <option value="11-50 employees">11-50 employees</option>
                <option value="51-200 employees">51-200 employees</option>
                <option value="201-1000 employees">201-1000 employees</option>
                <option value="1000+ employees">1000+ employees</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Headquarters Location</label>
              <input
                id="company-location-input"
                type="text"
                value={companyLocation}
                onChange={e => setCompanyLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Website URL</label>
              <input
                id="company-website-input"
                type="url"
                value={companyWebsite}
                onChange={e => setCompanyWebsite(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL</label>
              <input
                id="company-logo-input"
                type="url"
                value={companyLogoUrl}
                onChange={e => setCompanyLogoUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Overview</label>
              <textarea
                id="company-desc-input"
                rows={3}
                value={companyDesc}
                onChange={e => setCompanyDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden"
              />
            </div>
          </div>

          <button
            id="save-company-btn"
            type="submit"
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
          >
            Save Company Details
          </button>
        </form>
      )}

      {/* Schedule Interview Modal */}
      {activeApplicant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Schedule Interview with {activeApplicant.candidate?.name}
            </h2>
            <p className="text-xs text-slate-500">
              Set interview date and instructions for the candidate.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Interview Date & Time</label>
              <input
                id="interview-date-input"
                type="datetime-local"
                value={interviewDateInput}
                onChange={e => setInterviewDateInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Video Link</label>
              <textarea
                id="interview-notes-input"
                rows={3}
                placeholder="Google Meet link or interview agenda..."
                value={statusNoteInput}
                onChange={e => setStatusNoteInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveApplicant(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                id="confirm-schedule-interview-btn"
                type="button"
                onClick={() =>
                  handleUpdateApplicantStatus(activeApplicant.id, 'interview', interviewDateInput)
                }
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                Confirm & Notify Candidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
