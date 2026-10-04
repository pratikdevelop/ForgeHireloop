import React, { useState } from 'react';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, Plus, Trash2, Briefcase, DollarSign, MapPin, Building, AlertCircle } from 'lucide-react';

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobPosted: () => void;
  jobToEdit?: Job | null;
}

export const PostJobModal: React.FC<PostJobModalProps> = ({
  isOpen,
  onClose,
  onJobPosted,
  jobToEdit,
}) => {
  const { user, company } = useAuth();

  const [title, setTitle] = useState(jobToEdit?.title || '');
  const [category, setCategory] = useState(jobToEdit?.category || 'Frontend Development');
  const [industry, setIndustry] = useState(jobToEdit?.industry || company?.industry || 'Software & Technology');
  const [location, setLocation] = useState(jobToEdit?.location || 'San Francisco, CA');
  const [workplaceType, setWorkplaceType] = useState<any>(jobToEdit?.workplaceType || 'remote');
  const [jobType, setJobType] = useState<any>(jobToEdit?.jobType || 'full-time');
  const [experienceLevel, setExperienceLevel] = useState<any>(jobToEdit?.experienceLevel || 'mid');
  const [minExperienceYears, setMinExperienceYears] = useState(jobToEdit?.minExperienceYears || 3);
  const [salaryMin, setSalaryMin] = useState(jobToEdit?.salaryMin || 120000);
  const [salaryMax, setSalaryMax] = useState(jobToEdit?.salaryMax || 160000);
  const [description, setDescription] = useState(jobToEdit?.description || '');
  
  // Skills
  const [skillsInput, setSkillsInput] = useState(jobToEdit?.skills.join(', ') || 'React, TypeScript, Tailwind CSS');
  // Requirements
  const [reqInput, setReqInput] = useState(jobToEdit?.requirements.join('\n') || '3+ years with React and TypeScript\nExperience with modern UI state management\nStrong focus on responsive design');
  // Responsibilities
  const [respInput, setRespInput] = useState(jobToEdit?.responsibilities.join('\n') || 'Architect and build key customer-facing features\nCollaborate closely with designers and product managers\nWrite clean, well-tested code');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) {
      setError('Title, description, and location are required');
      return;
    }

    setLoading(true);
    setError(null);

    const skillsArray = skillsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const reqArray = reqInput
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const respArray = respInput
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      if (jobToEdit) {
        await api.updateJob(jobToEdit.id, {
          title,
          category,
          industry,
          location,
          workplaceType,
          jobType,
          experienceLevel,
          minExperienceYears: Number(minExperienceYears),
          salaryMin: Number(salaryMin),
          salaryMax: Number(salaryMax),
          description,
          skills: skillsArray,
          requirements: reqArray,
          responsibilities: respArray,
        });
      } else {
        await api.createJob({
          title,
          category,
          industry,
          location,
          workplaceType,
          jobType,
          experienceLevel,
          minExperienceYears: Number(minExperienceYears),
          salaryMin: Number(salaryMin),
          salaryMax: Number(salaryMax),
          description,
          skills: skillsArray,
          requirements: reqArray,
          responsibilities: respArray,
          companyId: company?.id,
        });
      }
      onJobPosted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save job posting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {jobToEdit ? 'Edit Job Posting' : 'Post a New Job Opening'}
              </h2>
              <p className="text-xs text-slate-500">
                {company?.name || 'Recruiter Portal'} • Publish to candidates worldwide
              </p>
            </div>
          </div>
          <button
            id="close-post-job-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
            <input
              id="job-title-input"
              type="text"
              required
              placeholder="e.g. Senior Full Stack Engineer"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Category</label>
              <select
                id="job-category-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Frontend Development">Frontend Development</option>
                <option value="Backend & APIs">Backend & APIs</option>
                <option value="Full Stack Development">Full Stack Development</option>
                <option value="DevOps & SRE">DevOps & SRE</option>
                <option value="Data & AI / ML">Data & AI / ML</option>
                <option value="Design & Creative">Design & Creative</option>
                <option value="Product Management">Product Management</option>
                <option value="Quality Assurance">Quality Assurance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
              <input
                id="job-industry-input"
                type="text"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder="e.g. Software & Technology"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location *</label>
              <input
                id="job-location-input"
                type="text"
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA or Remote"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Workplace Arrangement</label>
              <select
                id="job-workplace-select"
                value={workplaceType}
                onChange={e => setWorkplaceType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden bg-white"
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
              <select
                id="job-type-select"
                value={jobType}
                onChange={e => setJobType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden bg-white"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Seniority Level</label>
              <select
                id="job-level-select"
                value={experienceLevel}
                onChange={e => setExperienceLevel(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden bg-white"
              >
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="lead">Lead / Principal</option>
                <option value="executive">Executive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Experience (Years)</label>
              <input
                id="job-min-exp-input"
                type="number"
                min="0"
                max="25"
                value={minExperienceYears}
                onChange={e => setMinExperienceYears(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Salary Range (USD)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="job-salary-min-input"
                  type="number"
                  placeholder="Min (e.g. 120000)"
                  value={salaryMin}
                  onChange={e => setSalaryMin(Number(e.target.value))}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                />
                <input
                  id="job-salary-max-input"
                  type="number"
                  placeholder="Max (e.g. 160000)"
                  value={salaryMax}
                  onChange={e => setSalaryMax(Number(e.target.value))}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Required Skills (comma separated)
            </label>
            <input
              id="job-skills-input"
              type="text"
              placeholder="e.g. React, TypeScript, GraphQL, Docker"
              value={skillsInput}
              onChange={e => setSkillsInput(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Job Description *</label>
            <textarea
              id="job-description-input"
              rows={4}
              required
              placeholder="Detailed description of the role, expectations, and team..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Responsibilities (one per line)
              </label>
              <textarea
                id="job-responsibilities-input"
                rows={3}
                placeholder="Architect scalable services&#10;Mentor team members&#10;Conduct code reviews"
                value={respInput}
                onChange={e => setRespInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Requirements (one per line)
              </label>
              <textarea
                id="job-requirements-input"
                rows={3}
                placeholder="4+ years experience&#10;Degree in CS or equivalent&#10;Proficiency in TypeScript"
                value={reqInput}
                onChange={e => setReqInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              id="cancel-post-job-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              id="submit-post-job-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : jobToEdit ? 'Save Changes' : 'Publish Job Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
