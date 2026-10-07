import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Sparkles, Calendar, TrendingUp, Compass, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { ForecastResult, DatasetProfile } from '../types';
import { api } from '../services/api';

interface ForecastViewProps {
  sessionId: string;
  profile: DatasetProfile;
}

export const ForecastView: React.FC<ForecastViewProps> = ({ sessionId, profile }) => {
  const [metric, setMetric] = useState<string>(profile.primary_metric || (profile.numeric_columns[0] || ''));
  const [horizon, setHorizon] = useState<number>(6);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadForecast(metric, horizon);
  }, [sessionId, metric, horizon]);

  const loadForecast = async (m: string, h: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getForecast(sessionId, m, undefined, h);
      setForecast(res);
    } catch (err: any) {
      setError(err.message || 'Failed to compute forecast');
    } finally {
      setLoading(false);
    }
  };

  const horizons = [3, 6, 12, 18, 24];

  if (loading && !forecast) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400">Fitting Holt-Winters predictive time-series models...</p>
      </div>
    );
  }

  if (forecast && !forecast.is_eligible) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
        <Compass className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Dataset Not Suitable for Forecasting</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          {forecast.message || 'Forecasting requires a sequential date column and numerical metrics.'}
        </p>
      </div>
    );
  }

  const metrics = forecast?.metrics;
  const isGrowth = (metrics?.projected_growth_rate_pct || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Predictive Time-Series Forecasting
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Holt-Winters Exponential Smoothing with parametric 95% confidence intervals and capacity planning.
            </p>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Metric:</span>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {profile.numeric_columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Horizon Selector */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-400 font-medium mr-2">Forecast Horizon:</span>
          {horizons.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                horizon === h
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {h} {forecast?.frequency === 'Monthly' ? 'Months' : forecast?.frequency === 'Weekly' ? 'Weeks' : 'Periods'}
            </button>
          ))}
        </div>
      </div>

      {forecast && (
        <>
          {/* Key Forecast Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
              <span className="text-xs text-slate-400 uppercase font-semibold">Historical Baseline</span>
              <div className="text-xl font-bold text-white mt-1">
                {metrics?.recent_historical_avg.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500">Recent period average</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
              <span className="text-xs text-slate-400 uppercase font-semibold">Projected Average</span>
              <div className="text-xl font-bold text-indigo-300 mt-1">
                {metrics?.projected_avg.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500">Across next {horizon} periods</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
              <span className="text-xs text-slate-400 uppercase font-semibold">Expected Growth Rate</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-xl font-bold ${isGrowth ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isGrowth ? `+${metrics?.projected_growth_rate_pct}%` : `${metrics?.projected_growth_rate_pct}%`}
                </span>
                {isGrowth ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
              </div>
              <span className="text-[11px] text-slate-500">Projected delta</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
              <span className="text-xs text-slate-400 uppercase font-semibold">Model Trajectory</span>
              <div className="text-base font-bold text-cyan-300 mt-1.5">
                {metrics?.trend_direction}
              </div>
              <span className="text-[11px] text-slate-500">95% Confidence Interval</span>
            </div>
          </div>

          {/* Interactive Forecast Chart */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Trajectory & Prediction Interval: {metric}
                </h3>
                <p className="text-xs text-slate-400">
                  Historical actuals (solid blue) transitioning to forecast (dashed indigo) with 95% upper/lower bounds.
                </p>
              </div>
            </div>

            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast.combined_chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} angle={-25} textAnchor="end" />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                  <Area
                    type="monotone"
                    dataKey="upper_bound"
                    stroke="transparent"
                    fill="#6366f1"
                    fillOpacity={0.15}
                    name="95% Upper Bound"
                  />
                  <Area
                    type="monotone"
                    dataKey="lower_bound"
                    stroke="transparent"
                    fill="#6366f1"
                    fillOpacity={0.05}
                    name="95% Lower Bound"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    name="Historical Actual"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    name="Projected Forecast"
                    dot={{ fill: '#818cf8', r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Strategic Action Recommendation */}
          {forecast.recommendation && (
            <div className="p-5 rounded-xl border border-indigo-500/30 bg-indigo-950/20">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 block mb-1">
                Forecasting Recommendation
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {forecast.recommendation}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
