import React, { useState, useEffect } from 'react';
import { AlertOctagon, AlertTriangle, ShieldAlert, CheckCircle2, Filter, Loader2 } from 'lucide-react';
import { AnomalyAnalysis, AnomalyItem } from '../types';
import { api } from '../services/api';

interface AnomalyViewProps {
  sessionId: string;
}

export const AnomalyView: React.FC<AnomalyViewProps> = ({ sessionId }) => {
  const [data, setData] = useState<AnomalyAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<'All' | 'Critical' | 'Warning'>('All');

  useEffect(() => {
    loadAnomalies();
  }, [sessionId]);

  const loadAnomalies = async () => {
    setLoading(true);
    try {
      const res = await api.getAnomalies(sessionId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400">Running Isolation Forest & Z-Score anomaly detectors...</p>
      </div>
    );
  }

  if (!data || data.anomalies.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">No Critical Outliers Flagged</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          All records fall within acceptable statistical thresholds. Your dataset exhibits stable parametric distributions.
        </p>
      </div>
    );
  }

  const criticalCount = data.anomalies.filter((a) => a.severity === 'Critical').length;
  const warningCount = data.anomalies.filter((a) => a.severity === 'Warning').length;

  const filtered = data.anomalies.filter((a) => {
    if (filterSeverity === 'All') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header & Badges */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              Machine Learning & Statistical Anomaly Detection
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Unsupervised Isolation Forest + Extreme Z-Score filters to spotlight unexpected drops, spikes, and fraudulent or erroneous records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {criticalCount} Critical
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {warningCount} Warnings
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          {data.summary}
        </p>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-400 mr-2">Filter:</span>
          {(['All', 'Critical', 'Warning'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSeverity(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filterSeverity === s
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Anomaly Cards List */}
      <div className="space-y-3">
        {filtered.map((anomaly, index) => {
          const isCritical = anomaly.severity === 'Critical';
          return (
            <div
              key={index}
              className={`p-4 rounded-xl border transition ${
                isCritical
                  ? 'border-red-500/30 bg-red-950/10 hover:border-red-500/50'
                  : 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isCritical
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {anomaly.severity}
                  </span>
                  <span className="text-xs font-bold text-white">
                    Row #{anomaly.row_index + 1}: Abnormal {anomaly.primary_feature}
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-indigo-300 font-mono">
                    Value: {anomaly.value.toLocaleString()} ({anomaly.z_score}σ deviation)
                  </span>
                </div>

                <span className="text-[11px] text-slate-400 font-medium">
                  {anomaly.type}
                </span>
              </div>

              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                {anomaly.explanation}
              </p>

              {/* Row Context Fields */}
              {anomaly.row_data && Object.keys(anomaly.row_data).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                  {Object.entries(anomaly.row_data).map(([k, v]) => (
                    <span
                      key={k}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-900/90 text-slate-400 border border-slate-800"
                    >
                      <strong className="text-slate-300">{k}:</strong> {String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
