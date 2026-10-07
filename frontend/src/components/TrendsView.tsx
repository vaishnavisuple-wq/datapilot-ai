import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, Compass, Flame, Loader2 } from 'lucide-react';
import { TrendAnalysis } from '../types';
import { api } from '../services/api';

interface TrendsViewProps {
  sessionId: string;
}

export const TrendsView: React.FC<TrendsViewProps> = ({ sessionId }) => {
  const [trends, setTrends] = useState<TrendAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrends();
  }, [sessionId]);

  const loadTrends = async () => {
    setLoading(true);
    try {
      const data = await api.getTrends(sessionId);
      setTrends(data);
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
        <p className="text-xs text-slate-400">Computing trend velocity and seasonality...</p>
      </div>
    );
  }

  if (!trends || !trends.has_temporal_trends) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
        <Compass className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-300">No Temporal Dimensions Found</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Trend analysis and seasonal decomposition require a dataset containing date or timestamp columns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          Trend & Seasonality Dynamics
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Automated evaluation of historical momentum, inflection points, periodic growth, and seasonal peaks.
        </p>
      </div>

      {/* Findings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trends.findings.map((f, i) => (
          <div key={i} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2 inline-block">
                {f.type}
              </span>
              <h4 className="text-sm font-bold text-white mb-1.5">{f.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Period Timeline Chart */}
      {trends.periodic_chart.length > 0 && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                Historical Progression & Growth Velocity: {trends.primary_metric}
              </h3>
              <p className="text-xs text-slate-400">Total volume and period-over-period percentage variance.</p>
            </div>
          </div>

          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends.periodic_chart} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} angle={-25} textAnchor="end" />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="metric_value"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  name={`${trends.primary_metric}`}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="growth_rate_pct"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  name="Growth Rate (%)"
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Seasonality & Category Momentum Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonality */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-amber-400" />
            Seasonal Patterns & Calendar Effects
          </h3>
          <div className="space-y-3">
            {trends.seasonality_insights.map((s, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300 leading-relaxed">
                {s}
              </div>
            )) || (
              <p className="text-xs text-slate-500">Seasonality data not detected.</p>
            )}
          </div>
        </div>

        {/* Category Momentum */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-rose-400" />
            Segment Velocity & Momentum
          </h3>
          <div className="space-y-3">
            {trends.category_momentum.map((cm, i) => {
              const isAcc = cm.growth_pct > 0;
              return (
                <div key={i} className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-white block">{cm.category}</span>
                    <span className="text-[11px] text-slate-400">
                      Earlier: {cm.h1_total.toLocaleString()} → Recent: {cm.h2_total.toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-full text-[11px] ${
                      isAcc ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {isAcc ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {cm.growth_pct > 0 ? `+${cm.growth_pct}%` : `${cm.growth_pct}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
