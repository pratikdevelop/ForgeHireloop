import React, { useState } from 'react';
import { Application, InterviewSlot } from '../types';
import {
  Calendar,
  Clock,
  Video,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface InterviewSchedulerProps {
  applicants: Application[];
  onUpdateApplicantStatus: (
    applicantId: string,
    status: 'interview',
    slots: InterviewSlot[],
    note?: string
  ) => Promise<void>;
  onOpenMessages?: (recipientId?: string, recipientName?: string) => void;
}

export const InterviewScheduler: React.FC<InterviewSchedulerProps> = ({
  applicants,
  onUpdateApplicantStatus,
  onOpenMessages,
}) => {
  // Currently selected applicant to schedule or review
  const [selectedAppId, setSelectedAppId] = useState<string>(
    applicants.length > 0 ? applicants[0].id : ''
  );

  // New slot drafting inputs
  const [newDate, setNewDate] = useState<string>('');
  const [newDuration, setNewDuration] = useState<number>(45);
  const [newMeetingLink, setNewMeetingLink] = useState<string>('https://meet.google.com/abc-hire-loop');
  const [schedulerNote, setSchedulerNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const selectedApp = applicants.find((a) => a.id === selectedAppId);

  // Filter applicants that have interviews scheduled or are eligible (status === 'shortlisted' or 'interview' or all)
  const interviewCandidates = applicants.filter(
    (a) => a.status === 'interview' || (a.interviewSlots && a.interviewSlots.length > 0)
  );

  const allScheduleEligible = applicants.filter(
    (a) => a.status === 'shortlisted' || a.status === 'interview' || a.status === 'applied'
  );

  const handleAddSlot = async () => {
    if (!selectedApp || !newDate) return;

    const newSlot: InterviewSlot = {
      id: `slot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dateTime: new Date(newDate).toISOString(),
      durationMinutes: newDuration,
      meetingLink: newMeetingLink || undefined,
      notes: schedulerNote || undefined,
      status: 'suggested',
    };

    const existingSlots = selectedApp.interviewSlots || [];
    const updatedSlots = [...existingSlots, newSlot];

    setIsSubmitting(true);
    try {
      await onUpdateApplicantStatus(
        selectedApp.id,
        'interview',
        updatedSlots,
        `Proposed interview time: ${new Date(newDate).toLocaleString()}`
      );
      setNewDate('');
      setSuccessToast(`Interview invitation proposed to ${selectedApp.candidate?.name || 'candidate'}!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSlotStatus = async (
    slotId: string,
    newStatus: 'accepted' | 'declined' | 'rescheduled'
  ) => {
    if (!selectedApp || !selectedApp.interviewSlots) return;

    const updatedSlots = selectedApp.interviewSlots.map((s) =>
      s.id === slotId ? { ...s, status: newStatus } : s
    );

    setIsSubmitting(true);
    try {
      await onUpdateApplicantStatus(
        selectedApp.id,
        'interview',
        updatedSlots,
        `Interview slot status changed to ${newStatus}`
      );
      setSuccessToast(`Invitation status updated to ${newStatus}.`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!selectedApp || !selectedApp.interviewSlots) return;

    const updatedSlots = selectedApp.interviewSlots.filter((s) => s.id !== slotId);

    setIsSubmitting(true);
    try {
      await onUpdateApplicantStatus(
        selectedApp.id,
        updatedSlots.length > 0 ? 'interview' : selectedApp.status,
        updatedSlots,
        'Removed interview invitation slot'
      );
    } catch (err: any) {
      alert(err.message || 'Failed to remove slot');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Two-Column Scheduler Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Candidate Queue */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Candidate Pipeline ({allScheduleEligible.length})
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">Select candidate</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[580px]">
            {allScheduleEligible.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active candidates found to schedule.
              </div>
            ) : (
              allScheduleEligible.map((app) => {
                const isSelected = app.id === selectedAppId;
                const slotCount = app.interviewSlots?.length || 0;
                const hasAccepted = app.interviewSlots?.some((s) => s.status === 'accepted');

                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedAppId(app.id)}
                    className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/60 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={
                        app.candidate?.photoUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${app.candidate?.name || 'User'}`
                      }
                      alt={app.candidate?.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate block">
                          {app.candidate?.name || 'Applicant'}
                        </span>
                        {hasAccepted ? (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                            Confirmed
                          </span>
                        ) : slotCount > 0 ? (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                            {slotCount} Slot{slotCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-medium rounded">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {app.job?.title || 'Applied Role'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span>Status: <strong className="capitalize text-slate-600">{app.status}</strong></span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Slot Management & Suggestion Engine */}
        <div className="lg:col-span-8 space-y-6">
          {selectedApp ? (
            <>
              {/* Selected Candidate Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      selectedApp.candidate?.photoUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${selectedApp.candidate?.name || 'User'}`
                    }
                    alt={selectedApp.candidate?.name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedApp.candidate?.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full capitalize">
                        {selectedApp.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Candidate for <strong className="text-slate-800">{selectedApp.job?.title}</strong> ({selectedApp.job?.location || 'Remote'})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {onOpenMessages && (
                    <button
                      type="button"
                      onClick={() => onOpenMessages(selectedApp.candidateId, selectedApp.candidate?.name)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
                    >
                      Direct Message
                    </button>
                  )}
                  {selectedApp.resumeUrl && (
                    <a
                      href={selectedApp.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View Resume
                    </a>
                  )}
                </div>
              </div>

              {/* Propose New Time Slot Form */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Propose Interview Time Slot
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Candidate will be invited to confirm or reschedule
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date & Start Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="scheduler-datetime-input"
                      type="datetime-local"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Duration
                    </label>
                    <select
                      id="scheduler-duration-input"
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value={30}>30 Minutes (Screening)</option>
                      <option value={45}>45 Minutes (Technical / Fit)</option>
                      <option value={60}>60 Minutes (Deep Dive)</option>
                      <option value={90}>90 Minutes (System Design)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Video Meeting URL
                    </label>
                    <div className="relative">
                      <Video className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        id="scheduler-meeting-link-input"
                        type="url"
                        value={newMeetingLink}
                        onChange={(e) => setNewMeetingLink(e.target.value)}
                        placeholder="https://meet.google.com/..."
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Agenda / Preparation Note for Candidate
                  </label>
                  <textarea
                    id="scheduler-agenda-input"
                    rows={2}
                    value={schedulerNote}
                    onChange={(e) => setSchedulerNote(e.target.value)}
                    placeholder="e.g. Focus on frontend state architecture, React concurrency, and portfolio walkthrough."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    id="propose-slot-btn"
                    type="button"
                    onClick={handleAddSlot}
                    disabled={!newDate || isSubmitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Sending Invitation...' : 'Send Interview Invitation'}
                  </button>
                </div>
              </div>

              {/* Existing Proposed Slots & Status Tracker */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Active Interview Invitations ({selectedApp.interviewSlots?.length || 0})
                  </h4>
                  <span className="text-[11px] text-slate-400">Real-time RSVP status tracking</span>
                </div>

                {(!selectedApp.interviewSlots || selectedApp.interviewSlots.length === 0) ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No interview invitations proposed yet for this candidate. Use the form above to suggest times.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedApp.interviewSlots.map((slot) => {
                      const dateObj = new Date(slot.dateTime);
                      const isPast = dateObj.getTime() < Date.now();

                      return (
                        <div
                          key={slot.id}
                          className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {dateObj.toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}{' '}
                                at{' '}
                                {dateObj.toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                ({slot.durationMinutes} mins)
                              </span>

                              {/* Status Badge */}
                              {slot.status === 'accepted' ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confirmed by Candidate
                                </span>
                              ) : slot.status === 'declined' ? (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                                  <XCircle className="w-3 h-3 text-rose-600" /> Declined
                                </span>
                              ) : slot.status === 'rescheduled' ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                                  Reschedule Requested
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">
                                  Invitation Pending RSVP
                                </span>
                              )}
                            </div>

                            {slot.meetingLink && (
                              <div className="text-[11px] text-indigo-600 flex items-center gap-1">
                                <Video className="w-3 h-3 shrink-0" />
                                <a
                                  href={slot.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {slot.meetingLink}
                                </a>
                              </div>
                            )}

                            {slot.notes && (
                              <p className="text-[11px] text-slate-600 italic">
                                Note: &quot;{slot.notes}&quot;
                              </p>
                            )}
                          </div>

                          {/* Quick RSVP toggle controls for recruiter */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {slot.status !== 'accepted' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateSlotStatus(slot.id, 'accepted')}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-semibold transition"
                              >
                                Mark Confirmed
                              </button>
                            )}
                            {slot.status !== 'declined' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateSlotStatus(slot.id, 'declined')}
                                className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-[11px] font-medium transition"
                              >
                                Decline
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Select an applicant from the pipeline queue to manage interview slots.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
