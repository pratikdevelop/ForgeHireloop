import React, { useState, useMemo } from 'react';
import { Job } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  MapPin,
  Award,
  Layers,
  DollarSign,
  Filter,
  Info,
} from 'lucide-react';

interface SalaryAnalyticsProps {
  jobs: Job[];
  allMarketJobs: Job[];
}

export const SalaryAnalytics: React.FC<SalaryAnalyticsProps> = ({
  jobs,
  allMarketJobs,
}) => {
  // Filter states
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedSeniority, setSelectedSeniority] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'company'>('all');

  const pool = useMemo(() => {
    return selectedSource === 'company'
      ? jobs
      : allMarketJobs.length > 0
      ? allMarketJobs
      : jobs;
  }, [selectedSource, jobs, allMarketJobs]);

  // Extract distinct locations and seniorities
  const locations = useMemo(() => {
    const locSet = new Set<string>();
    pool.forEach((j) => {
      if (j.location) {
        // Normalize location name e.g. "San Francisco, CA" -> "San Francisco"
        const clean = j.location.split(',')[0].trim();
        if (clean) locSet.add(clean);
      }
    });
    return Array.from(locSet).sort();
  }, [pool]);

  const seniorities = [
    { value: 'all', label: 'All Experience Levels' },
    { value: 'entry', label: 'Entry Level (0-2 yrs)' },
    { value: 'mid', label: 'Mid-Level (2-5 yrs)' },
    { value: 'senior', label: 'Senior (5-8 yrs)' },
    { value: 'lead', label: 'Lead / Staff (8+ yrs)' },
  ];

  // Filtered dataset based on selection
  const filteredJobs = useMemo(() => {
    return pool.filter((j) => {
      const matchLoc =
        selectedLocation === 'all' ||
        j.location?.toLowerCase().includes(selectedLocation.toLowerCase());
      const matchSeniority =
        selectedSeniority === 'all' ||
        j.experienceLevel?.toLowerCase() === selectedSeniority.toLowerCase();
      return matchLoc && matchSeniority;
    });
  }, [pool, selectedLocation, selectedSeniority]);

  // 1. Location-based Salary Breakdown
  const locationChartData = useMemo(() => {
    const grouped: Record<
      string,
      { count: number; sumAvg: number; sumMin: number; sumMax: number }
    > = {};

    pool
      .filter(
        (j) =>
          selectedSeniority === 'all' ||
          j.experienceLevel?.toLowerCase() === selectedSeniority.toLowerCase()
      )
      .forEach((j) => {
        const loc = j.location ? j.location.split(',')[0].trim() : 'Remote';
        const min = j.salaryMin || 0;
        const max = j.salaryMax || j.salaryMin || 0;
        const avg = min && max ? (min + max) / 2 : min || max;

        if (avg > 0) {
          if (!grouped[loc]) {
            grouped[loc] = { count: 0, sumAvg: 0, sumMin: 0, sumMax: 0 };
          }
          grouped[loc].count += 1;
          grouped[loc].sumAvg += avg;
          grouped[loc].sumMin += min;
          grouped[loc].sumMax += max;
        }
      });

    return Object.entries(grouped)
      .map(([loc, data]) => ({
        location: loc,
        avgSalary: Math.round(data.sumAvg / data.count / 1000),
        minSalary: Math.round(data.sumMin / data.count / 1000),
        maxSalary: Math.round(data.sumMax / data.count / 1000),
        jobCount: data.count,
      }))
      .sort((a, b) => b.avgSalary - a.avgSalary)
      .slice(0, 7);
  }, [pool, selectedSeniority]);

  // 2. Seniority-based Salary Trends
  const seniorityChartData = useMemo(() => {
    const levels = ['entry', 'mid', 'senior', 'lead'];
    const labelMap: Record<string, string> = {
      entry: 'Entry Level',
      mid: 'Mid-Level',
      senior: 'Senior',
      lead: 'Lead / Staff',
    };

    return levels.map((lvl) => {
      const matching = pool.filter((j) => {
        const matchLvl = j.experienceLevel?.toLowerCase() === lvl;
        const matchLoc =
          selectedLocation === 'all' ||
          j.location?.toLowerCase().includes(selectedLocation.toLowerCase());
        return matchLvl && matchLoc;
      });

      const salaries = matching
        .map((j) => {
          const min = j.salaryMin || 0;
          const max = j.salaryMax || j.salaryMin || 0;
          return min && max ? (min + max) / 2 : min || max;
        })
        .filter((s) => s > 0);

      const avg =
        salaries.length > 0
          ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length / 1000)
          : 0;

      const mins = matching.map((j) => j.salaryMin || 0).filter((s) => s > 0);
      const maxs = matching.map((j) => j.salaryMax || 0).filter((s) => s > 0);

      const avgMin =
        mins.length > 0 ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length / 1000) : 0;
      const avgMax =
        maxs.length > 0 ? Math.round(maxs.reduce((a, b) => a + b, 0) / maxs.length / 1000) : 0;

      return {
        levelKey: lvl,
        level: labelMap[lvl] || lvl,
        avgSalary: avg,
        avgMin: avgMin,
        avgMax: avgMax,
        jobCount: matching.length,
      };
    });
  }, [pool, selectedLocation]);

  // High-level summary metrics
  const summaryMetrics = useMemo(() => {
    const salaries = filteredJobs
      .map((j) => {
        const min = j.salaryMin || 0;
        const max = j.salaryMax || j.salaryMin || 0;
        return min && max ? (min + max) / 2 : min || max;
      })
      .filter((s) => s > 0);

    salaries.sort((a, b) => a - b);
    const count = salaries.length;
    const avg =
      count > 0 ? Math.round(salaries.reduce((a, b) => a + b, 0) / count / 1000) : 0;
    const median =
      count > 0 ? Math.round(salaries[Math.floor(count / 2)] / 1000) : 0;
    const min = count > 0 ? Math.round(salaries[0] / 1000) : 0;
    const max = count > 0 ? Math.round(salaries[count - 1] / 1000) : 0;

    return { avg, median, min, max, count };
  }, [filteredJobs]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Role Salary Trends & Benchmarks
            </h3>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200/60">
              Interactive Recharts Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Analyze average base compensation distributions across major tech hubs and seniority levels.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Data Pool Source */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              type="button"
              id="salary-pool-all"
              onClick={() => setSelectedSource('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                selectedSource === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Tech Market ({allMarketJobs.length || pool.length})
            </button>
            <button
              type="button"
              id="salary-pool-company"
              onClick={() => setSelectedSource('company')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                selectedSource === 'company'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Postings ({jobs.length})
            </button>
          </div>

          {/* Location Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="salary-location-filter"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-hidden"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Seniority Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Award className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="salary-seniority-filter"
              value={selectedSeniority}
              onChange={(e) => setSelectedSeniority(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-hidden"
            >
              {seniorities.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Average Base
          </span>
          <span className="text-lg font-extrabold text-indigo-700">
            {summaryMetrics.avg > 0 ? `$${summaryMetrics.avg}k / yr` : '—'}
          </span>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Median Base
          </span>
          <span className="text-lg font-extrabold text-slate-900">
            {summaryMetrics.median > 0 ? `$${summaryMetrics.median}k / yr` : '—'}
          </span>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Min - Max Band
          </span>
          <span className="text-lg font-extrabold text-slate-900">
            {summaryMetrics.min > 0
              ? `$${summaryMetrics.min}k – $${summaryMetrics.max}k`
              : '—'}
          </span>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Roles Sampled
          </span>
          <span className="text-lg font-extrabold text-emerald-700">
            {summaryMetrics.count} Roles
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Average Salary by Geographic Location */}
        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              Average Annual Salary by Tech Hub ($k USD)
            </h4>
            <span className="text-[10px] text-slate-400">
              {selectedSeniority === 'all' ? 'All Seniorities' : selectedSeniority.toUpperCase()}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={locationChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="location"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  unit="k"
                />
                <Tooltip
                  formatter={(val: any) => [`$${val}k / year`, 'Avg Base Salary']}
                  labelFormatter={(lbl: any) => `Market Location: ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#FFFFFF',
                  }}
                />
                <Bar dataKey="avgSalary" name="Avg Base" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {locationChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#4F46E5' : '#6366F1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Seniority Ladder Salary Bands */}
        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              Salary Bands by Seniority Level ($k USD)
            </h4>
            <span className="text-[10px] text-slate-400">
              {selectedLocation === 'all' ? 'Worldwide' : selectedLocation}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={seniorityChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="level"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  unit="k"
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `$${val}k / yr`,
                    name === 'avgMin'
                      ? 'Min Base'
                      : name === 'avgMax'
                      ? 'Max Base'
                      : 'Average Base',
                  ]}
                  labelFormatter={(lbl: any) => `Seniority: ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#FFFFFF',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  formatter={(value: string) =>
                    value === 'avgMin'
                      ? 'Avg Min ($k)'
                      : value === 'avgMax'
                      ? 'Avg Max ($k)'
                      : 'Overall Avg ($k)'
                  }
                />
                <Bar
                  dataKey="avgMin"
                  name="avgMin"
                  fill="#93C5FD"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="avgSalary"
                  name="avgSalary"
                  fill="#4F46E5"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="avgMax"
                  name="avgMax"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
