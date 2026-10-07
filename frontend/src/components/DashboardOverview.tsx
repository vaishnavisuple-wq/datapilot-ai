import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  CheckCircle2, 
  ShieldCheck, 
  Activity, 
  BarChart3, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { DatasetProfile, ExecutiveIntelligence } from '../types';

interface DashboardOverviewProps {
  profile: DatasetProfile;
  intelligence: ExecutiveIntelligence | null;
  onNavigateToTab: (tab: string) => void;
  onAskAI: (prompt: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  profile,
  intelligence,
  onNavigateToTab,
  onAskAI
}) => {
  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  const formatMetricValue = (kpi: any) => {
    const val = kpi.display_value !== undefined ? kpi.display_value : (kpi.is_additive === false ? kpi.average : kpi.total);
    const labelLower = (kpi.label || '').toLowerCase();
    
    // Percentage
    if (kpi.format === 'percent' || labelLower.includes('%') || labelLower.includes('pct') || labelLower.includes('rate') || labelLower.includes('margin') || labelLower.includes('discount')) {
      // If value is between 0 and 1, multiply by 100
      const pctVal = (val <= 1.0 && val >= -1.0 && !labelLower.includes('100')) ? val * 100 : val;
      return `${pctVal.toFixed(1)}%`;
    }
    // Rating or score
    if (kpi.format === 'score' || labelLower.includes('satisfaction') || labelLower.includes('rating') || labelLower.includes('score')) {
      return `${val.toFixed(1)} / 5.0`;
    }
    // Currency
    if (kpi.format === 'currency' || labelLower.includes('$') || labelLower.includes('sales') || labelLower.includes('revenue') || labelLower.includes('profit') || labelLower.includes('cost') || labelLower.includes('spend') || labelLower.includes('salary') || labelLower.includes('income')) {
      return `$${formatNumber(val)}`;
    }
    // Days
    if (labelLower.includes('days') || labelLower.includes('lead time')) {
      return `${val.toFixed(1)} days`;
    }
    return formatNumber(val);
  };

  const formatSubtext = (kpi: any) => {
    const isRate = kpi.is_additive === false;
    if (isRate) {
      return `Range: [${kpi.min} - ${kpi.max}]`;
    }
    const labelLower = (kpi.label || '').toLowerCase();
    const isCurrency = labelLower.includes('$') || labelLower.includes('sales') || labelLower.includes('revenue') || labelLower.includes('profit') || labelLower.includes('cost') || labelLower.includes('salary');
    return `Avg / unit: ${isCurrency ? '$' : ''}${formatNumber(kpi.average)}`;
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Domain Highlight */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Domain: {profile.inferred_domain}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {profile.data_health_score}% Integrity
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {intelligence?.executive_summary_title || `Executive Summary: ${profile.filename}`}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Profiling {profile.total_rows.toLocaleString()} records across {profile.total_columns} attributes ({profile.numeric_columns.length} numeric, {profile.categorical_columns.length} categorical, {profile.datetime_columns.length} temporal).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onAskAI("Provide a full executive diagnosis and top 3 priorities for this dataset")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI Strategy</span>
          </button>
        </div>
      </div>

      {/* Adaptive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {profile.executive_kpis.slice(0, 4).map((kpi, idx) => {
          const isRate = kpi.is_additive === false;
          return (
            <div
              key={idx}
              className={`p-5 rounded-xl border bg-slate-900/70 transition ${
                kpi.is_primary ? 'border-indigo-500/40 bg-indigo-950/20' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate max-w-[160px]" title={kpi.label}>
                  {kpi.display_label || (isRate ? `Avg ${kpi.label}` : `Total ${kpi.label}`)}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${kpi.is_primary ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                  {kpi.is_primary ? 'Primary' : (isRate ? 'Average' : 'Volume')}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-white tracking-tight">
                {formatMetricValue(kpi)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
                <span>{formatSubtext(kpi)}</span>
                <span className="text-slate-500">
                  {isRate ? `N=${profile.total_rows.toLocaleString()}` : `Total`}
                </span>
              </div>
            </div>
          );
        })}

        {profile.executive_kpis.length < 4 && (
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/70">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Health</span>
            <div className="text-2xl font-extrabold text-emerald-400 tracking-tight mt-1">
              {profile.data_health_score}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">
              {profile.duplicate_rows_count} duplicates • {profile.total_outliers} outliers
            </div>
          </div>
        )}
      </div>

      {/* Executive Key Findings & Risks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key Findings (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Executive Key Findings
            </h3>
            <span className="text-xs text-slate-500">Evidence-Backed</span>
          </div>

          <div className="space-y-3">
            {intelligence?.key_findings.map((f, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
                <h4 className="text-sm font-bold text-slate-200 mb-1">{f.title}</h4>
                <p className="text-xs text-slate-300 mb-1.5 leading-relaxed">
                  <span className="text-indigo-400 font-semibold">Evidence: </span>{f.evidence}
                </p>
                <p className="text-[11px] text-slate-400">
                  <span className="text-slate-500 font-semibold">Strategic Impact: </span>{f.impact}
                </p>
              </div>
            )) || (
              <div className="p-6 text-center text-slate-500 text-xs rounded-xl bg-slate-900/40 border border-slate-800">
                Generating findings...
              </div>
            )}
          </div>

          {/* Quick AI Prompt Pills */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 mb-2 block">Quick Deep-Dives:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onAskAI("What are my best-performing segments and why?")}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                🏆 Best Performers
              </button>
              <button
                onClick={() => onAskAI("Why did performance decline or where are the weakest points?")}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                📉 Root-Cause Diagnostics
              </button>
              <button
                onClick={() => onNavigateToTab('compare')}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                ⚖️ Head-to-Head Comparison
              </button>
              <button
                onClick={() => onNavigateToTab('forecast')}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                🔮 Future Forecast
              </button>
            </div>
          </div>
        </div>

        {/* Major Risks & Anomalies Summary (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Major Risks & Vulnerabilities
            </h3>
            <button
              onClick={() => onNavigateToTab('anomalies')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
            >
              See all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {intelligence?.major_risks.map((risk, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border ${
                  risk.severity === 'High'
                    ? 'border-red-500/30 bg-red-950/20'
                    : 'border-amber-500/30 bg-amber-950/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-200">{risk.title}</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      risk.severity === 'High'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {risk.severity} Risk
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {risk.description}
                </p>
              </div>
            )) || (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                No high-priority vulnerabilities flagged.
              </div>
            )}
          </div>

          {/* Strategic Opportunities */}
          <div className="pt-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-emerald-400" />
              Strategic Opportunities
            </h3>
            <div className="space-y-3">
              {intelligence?.strategic_opportunities.map((opp, i) => (
                <div key={i} className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
                  <span className="text-xs font-bold text-emerald-300 block mb-1">{opp.title}</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {opp.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Recommendations Table */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          Actionable Business Recommendations
        </h3>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Focus Area</th>
                <th className="py-3 px-4">Data Finding</th>
                <th className="py-3 px-4">Recommended Action</th>
                <th className="py-3 px-4">Expected Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {intelligence?.actionable_recommendations.map((rec, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-bold text-indigo-300 whitespace-nowrap">
                    {rec.area}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {rec.finding}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-200">
                    {rec.action}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-400">
                    {rec.expected_impact}
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">
                    No recommendations computed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* C-Suite Final Conclusion Callout */}
      {intelligence?.final_conclusion && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/40 border border-indigo-500/30">
          <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Executive Synthesis & Final Conclusion
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            {intelligence.final_conclusion}
          </p>
        </div>
      )}
    </div>
  );
};
