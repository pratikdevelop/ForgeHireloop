import React, { useState } from 'react';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { uploadResumeToStorage } from '../firebase';
import {
  X,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface ApplyModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (jobId: string) => void;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({ job, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [coverNote, setCoverNote] = useState('');
  const [useExistingResume, setUseExistingResume] = useState(true);
  const [uploadedResumeUrl, setUploadedResumeUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submissionState, setSubmissionState] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !job) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setError('Please sign in to upload your resume');
      return;
    }

    // Check size (under 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Resume file must be under 10MB');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      // Upload directly to Firebase Storage: /resumes/{userId}/...
      const result = await uploadResumeToStorage(user.id, file);
      setUploadedResumeUrl(result.downloadUrl);
      setUploadedFileName(result.fileName);
      setSelectedFile(file);
      setUseExistingResume(false);
    } catch (err: any) {
      setError(err.message || 'Failed to upload resume to Firebase Storage');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to submit your application');
      return;
    }

    setSubmissionState('submitting');
    setError(null);

    try {
      const resumeToUse = useExistingResume ? user.resumeUrl : uploadedResumeUrl;
      const fileNameToUse = useExistingResume ? user.resumeFileName : uploadedFileName;

      await api.applyToJob(job.id, {
        resumeUrl: resumeToUse,
        resumeFileName: fileNameToUse || 'Resume.pdf',
        coverNote,
      });

      // Micro-animation success state
      setSubmissionState('success');
      setTimeout(() => {
        onSuccess(job.id);
        onClose();
        setSubmissionState('idle');
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
      setSubmissionState('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <img
              src={job.company?.logoUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&auto=format&fit=crop&q=80'}
              alt={job.company?.name}
              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
            />
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Apply to {job.title}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {job.company?.name} • {job.location}
              </p>
            </div>
          </div>
          <button
            id="close-apply-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Candidate Profile Summary */}
          <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 flex items-center gap-3">
            <img
              src={user?.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
              alt={user?.name}
              className="w-10 h-10 rounded-full border border-blue-200 object-cover"
            />
            <div>
              <p className="text-xs font-bold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500 line-clamp-1">{user?.headline || user?.email}</p>
            </div>
          </div>

          {/* Resume Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Resume Attachment
            </label>

            {user?.resumeFileName && (
              <div
                onClick={() => setUseExistingResume(true)}
                className={`p-3 rounded-xl border mb-2 cursor-pointer flex items-center justify-between transition ${
                  useExistingResume
                    ? 'border-blue-600 bg-blue-50/40 text-blue-900 font-medium'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="text-xs block font-semibold">{user.resumeFileName}</span>
                    <span className="text-[10px] text-slate-400">Default profile resume</span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="resumeSelection"
                  checked={useExistingResume}
                  onChange={() => setUseExistingResume(true)}
                  className="text-blue-600 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Option to upload another file */}
            <div className="relative">
              <label
                htmlFor="upload-new-resume"
                className={`w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  !useExistingResume && uploadedFileName
                    ? 'border-blue-600 bg-blue-50/20'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-700">
                  {!useExistingResume && uploadedFileName
                    ? `Uploaded: ${uploadedFileName}`
                    : 'Upload a different resume (PDF / DOC)'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Up to 10MB</span>
                <input
                  id="upload-new-resume"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Optional Cover Note */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Cover Note / Message to Hiring Manager (Optional)
              </label>
              <span className="text-[11px] text-slate-400">Recommended</span>
            </div>
            <textarea
              id="cover-note-input"
              rows={3}
              value={coverNote}
              onChange={e => setCoverNote(e.target.value)}
              placeholder="Briefly share why you are a great match for this role or what excites you about this company..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              id="cancel-apply-btn"
              type="button"
              disabled={submissionState !== 'idle'}
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              id="submit-application-btn"
              type="submit"
              disabled={submissionState !== 'idle'}
              className={`relative overflow-hidden px-5 py-2.5 text-xs font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                submissionState === 'success'
                  ? 'bg-emerald-600 text-white scale-102 ring-2 ring-emerald-400'
                  : submissionState === 'submitting'
                  ? 'bg-blue-600 text-white opacity-95 cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98'
              }`}
            >
              {submissionState === 'submitting' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                  <span>Submitting Application...</span>
                  {/* Subtle animated progress bar across bottom of the button */}
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 overflow-hidden">
                    <span className="block h-full w-1/2 bg-white/80 rounded-full animate-btn-progress" />
                  </span>
                </>
              )}
              {submissionState === 'success' && (
                <>
                  <CheckCircle2 className="w-4 h-4 animate-bounce text-emerald-100 shrink-0" />
                  <span>Application Sent!</span>
                </>
              )}
              {submissionState === 'idle' && (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
