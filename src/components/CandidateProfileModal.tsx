import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ExperienceItem, EducationItem } from '../types';
import { uploadResumeToStorage } from '../firebase';
import {
  X,
  User,
  Mail,
  MapPin,
  Phone,
  FileText,
  Upload,
  Plus,
  Trash2,
  Briefcase,
  GraduationCap,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Download,
} from 'lucide-react';

interface CandidateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CandidateProfileModal: React.FC<CandidateProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, uploadResume } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [headline, setHeadline] = useState(user?.headline || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');
  const [experienceYears, setExperienceYears] = useState(user?.experienceYears || 0);

  // Skills
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [newSkillInput, setNewSkillInput] = useState('');

  // Experience
  const [experience, setExperience] = useState<ExperienceItem[]>(user?.experience || []);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpCompany, setNewExpCompany] = useState('');
  const [newExpStartDate, setNewExpStartDate] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');

  // Education
  const [education, setEducation] = useState<EducationItem[]>(user?.education || []);
  const [newEduDegree, setNewEduDegree] = useState('');
  const [newEduSchool, setNewEduSchool] = useState('');
  const [newEduYear, setNewEduYear] = useState('');

  const [saving, setSaving] = useState(false);
  const [showResumePreview, setShowResumePreview] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<'document' | 'raw_pdf'>('document');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    const trimmed = newSkillInput.trim();
    if (!skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleAddExperience = () => {
    if (!newExpTitle.trim() || !newExpCompany.trim()) return;
    const item: ExperienceItem = {
      id: `exp_${Date.now()}`,
      title: newExpTitle,
      company: newExpCompany,
      startDate: newExpStartDate || '2023-01',
      current: true,
      description: newExpDesc,
    };
    setExperience([item, ...experience]);
    setNewExpTitle('');
    setNewExpCompany('');
    setNewExpStartDate('');
    setNewExpDesc('');
  };

  const handleRemoveExperience = (id: string) => {
    setExperience(experience.filter(e => e.id !== id));
  };

  const handleAddEducation = () => {
    if (!newEduDegree.trim() || !newEduSchool.trim()) return;
    const item: EducationItem = {
      id: `edu_${Date.now()}`,
      degree: newEduDegree,
      institution: newEduSchool,
      startYear: '2016',
      endYear: newEduYear || '2020',
    };
    setEducation([...education, item]);
    setNewEduDegree('');
    setNewEduSchool('');
    setNewEduYear('');
  };

  const handleRemoveEducation = (id: string) => {
    setEducation(education.filter(e => e.id !== id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setMessage('Uploading resume to Firebase Storage...');
      setError(null);
      const { downloadUrl, fileName } = await uploadResumeToStorage(user.id, file);
      await uploadResume(downloadUrl, fileName);
      setMessage(`Resume "${fileName}" uploaded successfully to Firebase Storage!`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload resume');
      setMessage(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updateProfile({
        name,
        headline,
        phone,
        location,
        bio,
        photoUrl,
        experienceYears: Number(experienceYears),
        skills,
        experience,
        education,
      });
      setMessage('Profile updated successfully!');
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`relative w-full ${
          showResumePreview ? 'max-w-4xl' : 'max-w-2xl'
        } max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Candidate Profile & Resume</h2>
              <p className="text-xs text-slate-500">
                Keep your profile updated for better job recommendations and 1-click applications
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="header-toggle-pdf-preview-btn"
              type="button"
              onClick={() => setShowResumePreview(!showResumePreview)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                showResumePreview
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {showResumePreview ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  Hide Resume Preview
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  Preview Resume (PDF)
                </>
              )}
            </button>
            <button
              id="close-profile-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-6">
          {message && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Resume Attachment */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" /> Default Resume (PDF)
              </span>
              {user?.resumeUploadedAt && (
                <span className="text-[10px] text-slate-400">
                  Last uploaded:{' '}
                  {new Date(user.resumeUploadedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {user?.resumeFileName ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{user.resumeFileName}</p>
                      <span className="text-[10px] text-emerald-600 font-medium">Ready for 1-click apply</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="toggle-pdf-preview-btn"
                      type="button"
                      onClick={() => setShowResumePreview(!showResumePreview)}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition flex items-center gap-1.5"
                    >
                      {showResumePreview ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Hide Preview
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Preview PDF / Recruiter View
                        </>
                      )}
                    </button>

                    <label
                      htmlFor="change-resume-input"
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition"
                    >
                      Replace PDF
                      <input
                        id="change-resume-input"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <label
                    htmlFor="upload-initial-resume"
                    className="flex-1 border-2 border-dashed border-blue-300 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-white hover:bg-blue-50/30 transition"
                  >
                    <Upload className="w-6 h-6 text-blue-500 mb-1" />
                    <span className="text-xs font-semibold text-slate-800">Upload your Resume (PDF)</span>
                    <span className="text-[10px] text-slate-400">Enables instant 1-click applications</span>
                    <input
                      id="upload-initial-resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    id="preview-mock-resume-btn"
                    type="button"
                    onClick={() => setShowResumePreview(!showResumePreview)}
                    className="sm:w-48 px-4 py-3 bg-white border border-blue-200 hover:border-blue-300 rounded-xl flex flex-col items-center justify-center text-center transition group text-slate-700 hover:text-blue-600 shadow-2xs"
                  >
                    <FileText className="w-5 h-5 text-blue-500 mb-1 group-hover:scale-105 transition" />
                    <span className="text-xs font-semibold">
                      {showResumePreview ? 'Hide Resume Preview' : 'Preview Mock Resume'}
                    </span>
                    <span className="text-[10px] text-slate-400">View generated ATS profile</span>
                  </button>
                </div>
              </div>
            )}

            {/* Resume Document / PDF Preview Panel (Displays either uploaded PDF or live profile mock resume) */}
            {showResumePreview && (
              <div className="mt-3 bg-slate-100 rounded-xl border border-blue-200 p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-800">
                      {user?.resumeFileName
                        ? `Document: ${user.resumeFileName}`
                        : 'Mock Resume Preview (Generated from your profile data)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {user?.resumeUrl && (
                      <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setPreviewFormat('document')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                            previewFormat === 'document' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Document
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFormat('raw_pdf')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                            previewFormat === 'raw_pdf' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Raw PDF
                        </button>
                      </div>
                    )}

                    {user?.resumeUrl && (
                      <a
                        href={user.resumeUrl}
                        download={user.resumeFileName || 'Resume.pdf'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </a>
                    )}
                  </div>
                </div>

                {/* Sub-view: Raw PDF embed if requested and url exists */}
                {previewFormat === 'raw_pdf' && user?.resumeUrl ? (
                  <div className="rounded-lg overflow-hidden border border-slate-200">
                    <iframe
                      src={user.resumeUrl}
                      title="Candidate Resume PDF Preview"
                      className="w-full h-96 bg-white"
                    />
                  </div>
                ) : (
                  /* Formatted Document View: Clean A4-style executive resume representation */
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-left max-w-2xl mx-auto">
                    {/* Resume Header */}
                    <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 tracking-tight">
                          {name || user?.name || 'Alex Morgan'}
                        </h4>
                        <p className="text-xs font-semibold text-blue-600 mt-0.5">
                          {headline || user?.headline || 'Senior Full Stack Software Engineer'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {user?.email} {phone ? `• ${phone}` : user?.phone ? `• ${user.phone}` : ''} •{' '}
                          {location || user?.location || 'San Francisco, CA (Open to Remote)'}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-md uppercase self-start">
                        ATS-Optimized Profile
                      </span>
                    </div>

                    {/* Executive Summary */}
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Professional Summary
                      </h5>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                        {bio ||
                          user?.bio ||
                          'Results-driven software engineer with expertise in architecting resilient web applications, collaborating across cross-functional teams, and delivering high-performance digital products.'}
                      </p>
                    </div>

                    {/* Core Skills */}
                    {(skills.length > 0 || (user?.skills && user.skills.length > 0)) && (
                      <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Technical & Core Competencies
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {(skills.length > 0 ? skills : user?.skills || ['React', 'TypeScript', 'Node.js', 'Tailwind CSS']).map(
                            (s, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-blue-50/80 border border-blue-100 text-blue-800 text-[11px] rounded-md font-medium"
                              >
                                {s}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Work Experience */}
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Professional Experience
                      </h5>
                      {experience.length > 0 ? (
                        <div className="space-y-2.5">
                          {experience.map(exp => (
                            <div key={exp.id} className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900">{exp.title}</span>
                                <span className="text-[10px] text-slate-400">
                                  {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                                </span>
                              </div>
                              <div className="text-[11px] font-medium text-blue-600 mb-1">{exp.company}</div>
                              {exp.description && (
                                <p className="text-[11px] text-slate-600 leading-relaxed">{exp.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 text-xs text-slate-500 italic">
                          Senior Engineer • Tech Innovations Inc (2021 – Present)
                          <p className="text-[11px] text-slate-400 not-italic mt-0.5">
                            Led scalable architecture migration, improved query latency by 45%, and mentored junior engineers.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Education */}
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Education & Credentials
                      </h5>
                      {education.length > 0 ? (
                        <div className="space-y-1.5">
                          {education.map(edu => (
                            <div key={edu.id} className="p-2 bg-slate-50/70 rounded-lg border border-slate-100 text-xs">
                              <span className="font-bold text-slate-900">{edu.degree}</span>
                              <div className="text-[11px] text-slate-500">
                                {edu.school} {edu.year ? `• Class of ${edu.year}` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-50/70 rounded-lg border border-slate-100 text-xs text-slate-500">
                          <span className="font-bold text-slate-900">B.S. in Computer Science</span>
                          <div className="text-[11px] text-slate-400">University of California, Berkeley</div>
                        </div>
                      )}
                    </div>

                    {/* Footer note */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>ForgeHireloop Verified Candidate Profile</span>
                      <span>Verified for 1-Click Applications</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Basic Info */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Personal & Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  id="profile-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Headline</label>
                <input
                  id="profile-headline-input"
                  type="text"
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer | React & TypeScript"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  id="profile-phone-input"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                <input
                  id="profile-location-input"
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Years of Experience</label>
                <input
                  id="profile-exp-years-input"
                  type="number"
                  min="0"
                  max="50"
                  value={experienceYears}
                  onChange={e => setExperienceYears(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">About / Bio</label>
                <textarea
                  id="profile-bio-input"
                  rows={2}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Brief summary of your expertise, passions, and background..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section: Skills */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Key Skills & Technologies
            </h3>
            <div className="flex gap-2 mb-2">
              <input
                id="profile-add-skill-input"
                type="text"
                value={newSkillInput}
                onChange={e => setNewSkillInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Type a skill and press Enter (e.g. React, Node.js, AWS)"
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                id="profile-add-skill-btn"
                type="button"
                onClick={handleAddSkill}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
              >
                Add Skill
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 rounded-lg bg-slate-50 border border-slate-200">
              {skills.map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-slate-700 border border-slate-200 rounded-md text-xs font-medium shadow-2xs"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(s)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {skills.length === 0 && (
                <span className="text-xs text-slate-400 italic">No skills added yet</span>
              )}
            </div>
          </div>

          {/* Section: Experience */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-slate-500" /> Work Experience
            </h3>

            {/* List */}
            <div className="space-y-2 mb-3">
              {experience.map(exp => (
                <div
                  key={exp.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 flex items-start justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{exp.title}</h4>
                    <p className="text-xs text-slate-600">
                      {exp.company} • {exp.startDate} {exp.current ? '- Present' : ''}
                    </p>
                    {exp.description && (
                      <p className="text-[11px] text-slate-500 mt-1">{exp.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExperience(exp.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Experience mini-form */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">Add Position</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Job Title (e.g. Senior Frontend Dev)"
                  value={newExpTitle}
                  onChange={e => setNewExpTitle(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Company Name"
                  value={newExpCompany}
                  onChange={e => setNewExpCompany(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <input
                type="text"
                placeholder="Start Date (e.g. 2022-03)"
                value={newExpStartDate}
                onChange={e => setNewExpStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <textarea
                placeholder="Key achievements, technologies used, responsibilities..."
                rows={2}
                value={newExpDesc}
                onChange={e => setNewExpDesc(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <button
                id="add-experience-item-btn"
                type="button"
                onClick={handleAddExperience}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
              >
                + Add to Experience
              </button>
            </div>
          </div>

          {/* Section: Education */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-slate-500" /> Education
            </h3>

            <div className="space-y-2 mb-3">
              {education.map(edu => (
                <div
                  key={edu.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 flex items-start justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{edu.degree}</h4>
                    <p className="text-xs text-slate-600">
                      {edu.institution} • Graduated {edu.endYear}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEducation(edu.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Education mini-form */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">Add Degree / School</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Degree (e.g. B.S. in Computer Science)"
                  value={newEduDegree}
                  onChange={e => setNewEduDegree(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="University / College"
                  value={newEduSchool}
                  onChange={e => setNewEduSchool(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <input
                type="text"
                placeholder="Graduation Year (e.g. 2021)"
                value={newEduYear}
                onChange={e => setNewEduYear(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <button
                id="add-education-item-btn"
                type="button"
                onClick={handleAddEducation}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
              >
                + Add Education
              </button>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              id="cancel-profile-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              id="save-profile-btn"
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
