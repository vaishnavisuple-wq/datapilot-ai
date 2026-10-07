import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Scale, ArrowRight, Trophy, Sparkles, Loader2 } from 'lucide-react';
import { ComparisonResult } from '../types';
import { api } from '../services/api';

interface ComparisonViewProps {
  sessionId: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ sessionId }) => {
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [valuesByDim, setValuesByDim] = useState<Record<string, string[]>>({});
  const [selectedDim, setSelectedDim] = useState<string>('');
  const [entity1, setEntity1] = useState<string>('');
  const [entity2, setEntity2] = useState<string>('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOptions();
  }, [sessionId]);

  const loadOptions = async () => {
    setLoadingOptions(true);
    setError(null);
    try {
      const opts = await api.getComparisonOptions(sessionId);
      setDimensions(opts.dimensions);
      setValuesByDim(opts.values_by_dimension);

      if (opts.dimensions.length > 0) {
        const firstDim = opts.dimensions[0];
        setSelectedDim(firstDim);
        const vals = opts.values_by_dimension[firstDim] || [];
        if (vals.length >= 2) {
          setEntity1(vals[0]);
          setEntity2(vals[1]);
          // Run initial comparison
          runComparison(firstDim, vals[0], vals[1]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load comparison options');
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleDimChange = (dim: string) => {
    setSelectedDim(dim);
    const vals = valuesByDim[dim] || [];
    if (vals.length >= 2) {
      setEntity1(vals[0]);
      setEntity2(vals[1]);
      runComparison(dim, vals[0], vals[1]);
    } else {
      setEntity1('');
      setEntity2('');
      setResult(null);
    }
  };

  const runComparison = async (dim = selectedDim, e1 = entity1, e2 = entity2) => {
    if (!dim || !e1 || !e2 || e1 === e2) return;
    setComparing(true);
    setError(null);
    try {
      const res = await api.executeComparison(sessionId, dim, e1, e2);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Comparison failed');
    } finally {
      setComparing(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400">Loading benchmark dimensions...</p>
      </div>
    );
  }

  if (dimensions.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
        <Scale className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-300">No Eligible Comparison Dimensions</h3>
        <p className="text-xs text-slate-500 mt-1">
          Comparisons require categorical or temporal attributes with at least two unique groups.
        </p>
      </div>
    );
  }

  const currentValues = valuesByDim[selectedDim] || [];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" />
              Smart Comparative Benchmarking
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare any two products, regions, categories, years, or segments with automated percentage deltas and leadership analysis.
            </p>
          </div>
        </div>

        {/* Dimension & Entity Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              1. Select Dimension
            </label>
            <select
              value={selectedDim}
              onChange={(e) => handleDimChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {dimensions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              2. Baseline Entity (A)
            </label>
            <select
              value={entity1}
              onChange={(e) => {
                setEntity1(e.target.value);
                runComparison(selectedDim, e.target.value, entity2);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {currentValues.map((v) => (
                <option key={v} value={v} disabled={v === entity2}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              3. Target Entity (B)
            </label>
            <select
              value={entity2}
              onChange={(e) => {
                setEntity2(e.target.value);
                runComparison(selectedDim, entity1, e.target.value);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {currentValues.map((v) => (
                <option key={v} value={v} disabled={v === entity1}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {result && (
        <div className="space-y-6">
          {/* Executive Takeaway */}
          <div className="p-5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 flex items-start gap-3">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Benchmarking Takeaway
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  Winner: {result.overall_winner}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {result.conclusion}
              </p>
            </div>
          </div>

          {/* Side-by-Side Chart */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70">
            <h3 className="text-sm font-bold text-white mb-4">
              Visual Metric Comparison: {result.entity1} vs {result.entity2}
            </h3>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="metric" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                  <Bar dataKey={result.entity1} fill="#6366f1" radius={[4, 4, 0, 0]} name={`${result.entity1}`} />
                  <Bar dataKey={result.entity2} fill="#38bdf8" radius={[4, 4, 0, 0]} name={`${result.entity2}`} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Numerical Benchmark Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Metric</th>
                  <th className="py-3 px-4">{result.entity1} (A)</th>
                  <th className="py-3 px-4">{result.entity2} (B)</th>
                  <th className="py-3 px-4">Difference (B - A)</th>
                  <th className="py-3 px-4">% Change</th>
                  <th className="py-3 px-4">Dominant Leader</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {result.comparisons.map((c, i) => {
                  const isPositive = c.pct_change_sum > 0;
                  return (
                    <tr key={i} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {c.metric}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">
                        {c.val1_sum.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">
                        {c.val2_sum.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">
                        {c.diff_sum > 0 ? `+${c.diff_sum.toLocaleString()}` : c.diff_sum.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${
                            isPositive
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {isPositive ? `+${c.pct_change_sum}%` : `${c.pct_change_sum}%`}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-300">
                        {c.leader}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
