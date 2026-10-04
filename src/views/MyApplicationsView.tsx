import React, { useState, useEffect } from 'react';
import { Application, ApplicationStatus } from '../types';
import { api } from '../api/client';
import {
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Building,
  ChevronRight,
  AlertCircle,
  Eye,
  Award,
  XCircle,
} from 'lucide-react';

interface MyApplicationsViewProps {
  onOpenMessages: (recipientId?: string, recipientName?: string) => void;
  onExploreJobs: () => void;
}

export const MyApplicationsView: React.FC<MyApplicationsViewProps> = ({
  onOpenMessages,
  onExploreJobs,
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadMyApplications();
  }, []);

  const loadMyApplications = async () => {
    setLoading(true);
    try {
      const data = await api.getMyApplications();
      setApplications(data);
    } catch (err) {
      console.error('Failed to load applications', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'applied':
        return {
          label: 'Application Submitted',
          classes: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Clock,
        };
      case 'viewed':
        return {
          label: 'Viewed by Recruiter',
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Eye,
        };
      case 'shortlisted':
        return {
          label: 'Shortlisted for Review',
          classes: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: Award,
        };
      case 'interview':
        return {
          label: 'Interview Scheduled',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
          icon: Calendar,
        };
      case 'hired':
        return {
          label: 'Offer Extended / Hired',
          classes: 'bg-emerald-600 text-white font-bold',
          icon: CheckCircle2,
        };
      case 'rejected':
        return {
          label: 'Not Selected',
          classes: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: XCircle,
        };
      default:
        return { label: status, classes: 'bg-slate-100 text-slate-600', icon: Clock };
    }
  };

  const pipelineStages: ApplicationStatus[] = ['applied', 'viewed', 'shortlisted', 'interview', 'hired'];

  const getStepProgressIndex = (status: ApplicationStatus) => {
    if (status === 'rejected') return -1;
    return pipelineStages.indexOf(status);
  };

  const filtered = filterStatus === 'all'
    ? applications
    : applications.filter(a => a.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" /> My Job Applications
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status updates and recruitment pipeline tracking
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'applied', 'viewed', 'shortlisted', 'interview', 'rejected'].map(st => (
            <button
              key={st}
              id={`filter-app-status-${st}`}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                filterStatus === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'All Applications' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading your applications...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No applications found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You have not applied to any matching jobs yet. Explore hundreds of openings and apply with one click!
          </p>
          <button
            id="empty-explore-jobs-btn"
            onClick={onExploreJobs}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            Explore Open Jobs
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => {
            const badge = getStatusBadge(app.status);
            const BadgeIcon = badge.icon;
            const currentStepIdx = getStepProgressIndex(app.status);

            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs hover:border-slate-300 transition"
              >
                {/* Header: Company & Job */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <img
                      src={app.company?.logoUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&auto=format&fit=crop&q=80'}
                      alt={app.company?.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-500">{app.company?.name}</span>
                      <h2 className="text-base font-bold text-slate-900">{app.job?.title || 'Job Position'}</h2>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span>Applied on {new Date(app.appliedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{app.job?.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${badge.classes}`}>
                      <BadgeIcon className="w-4 h-4" />
                      {badge.label}
                    </span>

                    <button
                      id={`message-recruiter-app-${app.id}`}
                      onClick={() => onOpenMessages(app.job?.employerId, app.company?.name)}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                      title="Message Recruiter"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Visual Pipeline Progress Stepper */}
                {app.status !== 'rejected' ? (
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                    <div className="grid grid-cols-5 gap-2">
                      {pipelineStages.map((st, idx) => {
                        const isDone = idx <= currentStepIdx;
                        const isCurrent = idx === currentStepIdx;
                        return (
                          <div key={st} className="text-center space-y-1.5">
                            <div className="relative flex items-center justify-center">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
                                  isDone
                                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                                    : 'bg-slate-200 text-slate-400'
                                }`}
                              >
                                {isDone ? '✓' : idx + 1}
                              </div>
                            </div>
                            <span
                              className={`block text-[11px] capitalize font-medium ${
                                isCurrent
                                  ? 'text-blue-700 font-bold'
                                  : isDone
                                  ? 'text-slate-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {st}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>This role is no longer moving forward. We encourage applying to other matching opportunities!</span>
                  </div>
                )}

                {/* Interview date or Employer Notes */}
                {app.interviewDate && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">Upcoming Interview: </span>
                      <span>
                        {new Date(app.interviewDate).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Latest Status Note & Resume Used */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Submitted Resume: <strong>{app.resumeFileName || 'Resume.pdf'}</strong></span>
                  </div>
                  {app.statusHistory && app.statusHistory.length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      Last update: {app.statusHistory[app.statusHistory.length - 1].note}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
