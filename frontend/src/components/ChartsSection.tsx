import React, { useState } from 'react';
import { 
  BarChart, Bar, 
  LineChart, Line, 
  AreaChart, Area,
  PieChart, Pie, Cell, 
  ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { AutoChart, DatasetProfile } from '../types';
import { 
  BarChart3, 
  PlusCircle, 
  SlidersHorizontal, 
  Sparkles, 
  Check, 
  Loader2, 
  Layers 
} from 'lucide-react';
import { api } from '../services/api';

interface ChartsSectionProps {
  charts: AutoChart[];
  sessionId?: string;
  profile?: DatasetProfile;
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

const formatValue = (val: any, name?: string) => {
  if (typeof val !== 'number') return val;
  const n = (name || '').toLowerCase();
  if (n.includes('%') || n.includes('rate') || n.includes('pct') || n.includes('margin') || n.includes('discount')) {
    const pVal = (val <= 1.0 && val >= -1.0 && !n.includes('100')) ? val * 100 : val;
    return `${pVal.toFixed(1)}%`;
  }
  if (n.includes('$') || n.includes('sales') || n.includes('revenue') || n.includes('profit') || n.includes('cost') || n.includes('spend') || n.includes('salary')) {
    return `$${val.toLocaleString()}`;
  }
  if (n.includes('rating') || n.includes('satisfaction') || n.includes('score')) {
    return `${val.toFixed(2)} / 5.0`;
  }
  return val.toLocaleString();
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="font-bold text-white mb-1">{label || payload[0]?.payload?.category || payload[0]?.payload?.label || payload[0]?.payload?.date}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color || '#818cf8' }}>
            {entry.name || 'Value'}: {formatValue(entry.value, entry.name || entry.dataKey)}
            {entry.payload?.share_percentage !== undefined && (
              <span className="text-slate-400 ml-1">({entry.payload.share_percentage}% of total)</span>
            )}
            {entry.payload?.vs_overall_avg !== undefined && (
              <span className={`ml-1 font-semibold ${entry.payload.vs_overall_avg >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ({entry.payload.vs_overall_avg >= 0 ? '+' : ''}{entry.payload.vs_overall_avg}% vs avg)
              </span>
            )}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ChartsSection: React.FC<ChartsSectionProps> = ({ charts, sessionId, profile }) => {
  const [customCharts, setCustomCharts] = useState<AutoChart[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [chartType, setChartType] = useState<string>('bar');
  const [xCol, setXCol] = useState<string>(profile?.categorical_columns[0] || profile?.datetime_columns[0] || '');
  const [yCol, setYCol] = useState<string>(profile?.numeric_columns[0] || '');
  const [aggFunc, setAggFunc] = useState<string>('auto');
  const [topN, setTopN] = useState<number>(10);
  const [building, setBuilding] = useState(false);

  const handleBuildChart = async () => {
    if (!sessionId || !xCol) return;
    setBuilding(true);
    try {
      const newChart = await api.createCustomChart(sessionId, chartType, xCol, yCol || undefined, aggFunc, topN);
      setCustomCharts((prev) => [newChart, ...prev]);
      setShowBuilder(false);
    } catch (err: any) {
      alert(`Chart generation error: ${err.message}`);
    } finally {
      setBuilding(false);
    }
  };

  const allCharts = [...customCharts, ...charts];

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Visual Analytics Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-generated charts with verified mathematical aggregations (Averages for rates, Totals for volume).
          </p>
        </div>

        {profile && sessionId && (
          <button
            onClick={() => setShowBuilder(!showBuilder)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20 shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showBuilder ? 'Close Chart Studio' : 'Custom Chart Studio'}</span>
          </button>
        )}
      </div>

      {/* Interactive Custom Chart Builder Drawer */}
      {showBuilder && profile && (
        <div className="p-6 rounded-2xl border border-indigo-500/30 bg-slate-900/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Build & Tune Custom Visualizations
            </div>
            <span className="text-[11px] text-slate-400">
              Compute real sums, averages, distributions or trends
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Chart Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Chart Type
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="area">Area Chart</option>
                <option value="pie">Pie / Donut</option>
                <option value="scatter">Scatter Plot</option>
              </select>
            </div>

            {/* X-Axis */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                X-Axis Dimension
              </label>
              <select
                value={xCol}
                onChange={(e) => setXCol(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                {[...profile.categorical_columns, ...profile.datetime_columns, ...profile.numeric_columns].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Y-Axis */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Y-Axis Metric
              </label>
              <select
                value={yCol}
                onChange={(e) => setYCol(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                {profile.numeric_columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Aggregation */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Aggregation
              </label>
              <select
                value={aggFunc}
                onChange={(e) => setAggFunc(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="auto">Auto (Smart Soundness)</option>
                <option value="mean">Average (Mean)</option>
                <option value="sum">Sum (Total)</option>
                <option value="count">Count (Frequency)</option>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
              </select>
            </div>

            {/* Top N */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Limit Groups
              </label>
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value={5}>Top 5 Groups</option>
                <option value={10}>Top 10 Groups</option>
                <option value={15}>Top 15 Groups</option>
                <option value={25}>Top 25 Groups</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleBuildChart}
              disabled={building}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {building ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
              <span>{building ? 'Computing...' : 'Add Chart to Dashboard'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Render Charts Grid */}
      {allCharts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">No Visualizations Available</h3>
          <p className="text-xs text-slate-500 mt-1">Upload a dataset with numerical or categorical attributes to generate visual analytics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {allCharts.map((chart, cIdx) => (
            <div
              key={`${chart.id || cIdx}-${chart.title}`}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between hover:border-slate-700 transition shadow-sm"
            >
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-white truncate max-w-[80%]" title={chart.title}>
                    {chart.title}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {chart.aggregation && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {chart.aggregation}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-800 text-indigo-300 border border-slate-700">
                      {chart.type}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{chart.description}</p>
              </div>

              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {chart.type === 'bar' ? (
                    <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="category"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => formatValue(v, chart.y_axis)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name={chart.y_axis || 'Value'} />
                    </BarChart>
                  ) : chart.type === 'line' ? (
                    <LineChart data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey={chart.data[0]?.date !== undefined ? 'date' : 'category'}
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => formatValue(v, chart.y_axis)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        dot={{ fill: '#0284c7', r: 3 }}
                        activeDot={{ r: 6 }}
                        name={chart.y_axis || 'Value'}
                      />
                    </LineChart>
                  ) : chart.type === 'area' ? (
                    <AreaChart data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey={chart.data[0]?.date !== undefined ? 'date' : 'category'}
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => formatValue(v, chart.y_axis)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.2}
                        strokeWidth={2.5}
                        name={chart.y_axis || 'Value'}
                      />
                    </AreaChart>
                  ) : chart.type === 'pie' ? (
                    <PieChart>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                      <Pie
                        data={chart.data}
                        dataKey="value"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {chart.data.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  ) : chart.type === 'scatter' ? (
                    <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="x" stroke="#64748b" fontSize={11} name={chart.x_axis} />
                      <YAxis dataKey="y" stroke="#64748b" fontSize={11} name={chart.y_axis} />
                      <Tooltip content={<CustomTooltip />} />
                      <Scatter data={chart.data} fill="#818cf8" />
                    </ScatterChart>
                  ) : (
                    // Histogram
                    <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="bucket"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Frequency" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
