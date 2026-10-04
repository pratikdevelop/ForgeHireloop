import React, { useState, useEffect } from 'react';
import { JobAlert } from '../types';
import { api } from '../api/client';
import { X, Bell, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface JobAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JobAlertsModal: React.FC<JobAlertsModalProps> = ({ isOpen, onClose }) => {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (err: any) {
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords.trim()) {
      setError('Keywords are required');
      return;
    }

    try {
      const newAlert = await api.createAlert({
        title: title || `${keywords} Alert`,
        keywords,
        location: location || undefined,
        frequency,
      });
      setAlerts([newAlert, ...alerts]);
      setTitle('');
      setKeywords('');
      setLocation('');
      setSuccess('Alert created! You will receive notifications when matching jobs are posted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create alert');
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await api.deleteAlert(id);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (err) {
      setError('Failed to delete alert');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Job Alerts & Notifications</h2>
          </div>
          <button
            id="close-alerts-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {success && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Create Alert Form */}
          <form onSubmit={handleCreateAlert} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Create New Job Alert</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Keywords / Skills</label>
              <input
                id="alert-keywords-input"
                type="text"
                required
                placeholder="e.g. React, TypeScript, Full Stack"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location (Optional)</label>
                <input
                  id="alert-location-input"
                  type="text"
                  placeholder="e.g. Remote, San Francisco"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notification Frequency</label>
                <select
                  id="alert-frequency-select"
                  value={frequency}
                  onChange={e => setFrequency(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden"
                >
                  <option value="daily">Daily Digest</option>
                  <option value="weekly">Weekly Summary</option>
                </select>
              </div>
            </div>

            <button
              id="create-alert-submit-btn"
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
            >
              + Create Alert
            </button>
          </form>

          {/* Existing Alerts List */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Active Alerts</h3>
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No job alerts set yet.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{alert.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        Matches: &quot;{alert.keywords}&quot; {alert.location ? `in ${alert.location}` : ''} • {alert.frequency}
                      </p>
                    </div>
                    <button
                      id={`delete-alert-${alert.id}`}
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Delete Alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
