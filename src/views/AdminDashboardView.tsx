import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  ShieldAlert,
  Users,
  Briefcase,
  Building,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Flag,
  Trash2,
  ShieldCheck,
  Search,
} from 'lucide-react';

interface AdminDashboardViewProps {
  initialTab?: 'overview' | 'users' | 'companies' | 'jobs' | 'reports';
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  initialTab = 'overview',
}) => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'companies' | 'jobs' | 'reports'>(initialTab);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, companiesData, jobsData, reportsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getCompanies(),
        api.getAdminJobs(),
        api.getAdminReports(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setCompanies(companiesData);
      setJobs(jobsData);
      setReports(reportsData);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserBan = async (userId: string, currentBanned: boolean) => {
    try {
      await api.updateUserStatus(userId, !currentBanned);
      setUsers(users.map(u => (u.id === userId ? { ...u, isBanned: !currentBanned } : u)));
    } catch (err) {
      alert('Failed to update user ban status');
    }
  };

  const handleToggleCompanyVerified = async (companyId: string, currentVerified: boolean) => {
    try {
      await api.verifyCompany(companyId, !currentVerified);
      setCompanies(companies.map(c => (c.id === companyId ? { ...c, verified: !currentVerified } : c)));
    } catch (err) {
      alert('Failed to update company verification');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Remove this job from the platform?')) return;
    try {
      await api.deleteJob(jobId);
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (err) {
      alert('Failed to delete job');
    }
  };

  const handleResolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
    try {
      await api.resolveReport(reportId, action);
      setReports(reports.map(r => (r.id === reportId ? { ...r, status: action } : r)));
    } catch (err) {
      alert('Failed to update report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" /> Platform Administration & Moderation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Oversee user accounts, recruiter verification, job listing compliance, and reports
          </p>
        </div>
        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold rounded-lg self-start sm:self-auto">
          Super Admin Active
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          id="admin-tab-overview"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Overview & Metrics
        </button>
        <button
          id="admin-tab-users"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Users ({users.length})
        </button>
        <button
          id="admin-tab-companies"
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'companies'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Companies ({companies.length})
        </button>
        <button
          id="admin-tab-jobs"
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'jobs'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Job Postings ({jobs.length})
        </button>
        <button
          id="admin-tab-reports"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'reports'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          Flagged Reports ({reports.filter(r => r.status === 'pending').length})
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Users
              </span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {stats.totalUsers}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {stats.candidatesCount} Candidates • {stats.employersCount} Recruiters
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Jobs
              </span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {stats.totalJobs}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                {stats.activeJobsCount} Active Postings
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Applications Filed
              </span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {stats.totalApplications}
              </span>
              <span className="text-[11px] text-blue-600 font-medium mt-1 block">
                Across all listings
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Companies Verified
              </span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {stats.verifiedCompaniesCount} / {stats.totalCompanies}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Trust & safety vetted
              </span>
            </div>
          </div>

          {/* Applications Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              Application Pipeline Distribution
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {Object.entries(stats.applicationsByStatus || {}).map(([status, count]: any) => (
                <div key={status} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs capitalize font-semibold text-slate-600 block">{status}</span>
                  <span className="text-lg font-bold text-slate-900 mt-1 block">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="p-4">
                    <div className="font-semibold text-slate-900">{u.name}</div>
                    <div className="text-slate-500 text-[11px]">{u.email}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full capitalize font-semibold text-[11px] bg-slate-100 text-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    {u.isBanned ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        Banned
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {u.role !== 'admin' && (
                      <button
                        id={`ban-user-btn-${u.id}`}
                        onClick={() => handleToggleUserBan(u.id, !!u.isBanned)}
                        className={`px-3 py-1 rounded-lg font-semibold transition ${
                          u.isBanned
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {u.isBanned ? 'Unban Account' : 'Suspend / Ban'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Companies */}
      {activeTab === 'companies' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase">
              <tr>
                <th className="p-4">Company</th>
                <th className="p-4">Industry</th>
                <th className="p-4">Location</th>
                <th className="p-4">Verification</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-semibold text-slate-900 flex items-center gap-2">
                    <img src={c.logoUrl} className="w-6 h-6 rounded-md object-cover" />
                    <span>{c.name}</span>
                  </td>
                  <td className="p-4 text-slate-600">{c.industry}</td>
                  <td className="p-4 text-slate-500">{c.location}</td>
                  <td className="p-4">
                    {c.verified ? (
                      <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-slate-400">Unverified</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      id={`verify-company-btn-${c.id}`}
                      onClick={() => handleToggleCompanyVerified(c.id, !!c.verified)}
                      className="px-3 py-1 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      {c.verified ? 'Revoke Badge' : 'Grant Verified Badge'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Job Postings */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase">
              <tr>
                <th className="p-4">Title</th>
                <th className="p-4">Company</th>
                <th className="p-4">Location</th>
                <th className="p-4">Applicants</th>
                <th className="p-4 text-right">Moderate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map(j => (
                <tr key={j.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-semibold text-slate-900">{j.title}</td>
                  <td className="p-4 text-slate-600">{j.company?.name || 'Company'}</td>
                  <td className="p-4 text-slate-500">{j.location}</td>
                  <td className="p-4 font-bold text-slate-900">{j.applicantCount || 0}</td>
                  <td className="p-4 text-right">
                    <button
                      id={`admin-delete-job-${j.id}`}
                      onClick={() => handleDeleteJob(j.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Remove Listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Flagged Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              No reports filed yet. Platform integrity looks clean!
            </div>
          ) : (
            reports.map(rep => (
              <div
                key={rep.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded-md">
                      Report: {rep.targetType}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(rep.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{rep.targetTitle}</h3>
                  <p className="text-xs text-rose-600 mt-1">Reason: &quot;{rep.reason}&quot;</p>
                  <span className="text-[11px] text-slate-400 mt-1 block">Status: {rep.status}</span>
                </div>

                {rep.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      id={`resolve-report-btn-${rep.id}`}
                      onClick={() => handleResolveReport(rep.id, 'resolved')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                    >
                      Take Action & Resolve
                    </button>
                    <button
                      id={`dismiss-report-btn-${rep.id}`}
                      onClick={() => handleResolveReport(rep.id, 'dismissed')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
