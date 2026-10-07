import React, { useState, useEffect } from 'react';
import { X, FileDown, Printer, ShieldCheck, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface ReportModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  sessionId,
  isOpen,
  onClose
}) => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && sessionId) {
      loadReport();
    }
  }, [isOpen, sessionId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await api.getFullReport(sessionId);
      setReportData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.open(`/api/report/${sessionId}/download-html`, '_blank');
  };

  const handleDownloadJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datapilot_report_${reportData.metadata?.filename || 'dataset'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Executive Intelligence Report</h3>
              <p className="text-xs text-slate-400">
                Ready-to-export business summary with evidence-based recommendations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Compiling executive intelligence report...</p>
            </div>
          ) : reportData ? (
            <>
              {/* Meta Card */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-sm text-white mb-0.5">
                    {reportData.metadata?.title}
                  </h4>
                  <p className="text-slate-400">
                    Dataset: {reportData.metadata?.filename} • Domain: {reportData.metadata?.domain}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <span>{reportData.metadata?.rows.toLocaleString()} Rows</span>
                  <span>•</span>
                  <span>{reportData.metadata?.columns} Cols</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">{reportData.metadata?.health_score}% Integrity</span>
                </div>
              </div>

              {/* KPIs */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Executive Performance Indicators
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {reportData.kpis?.slice(0, 4).map((kpi: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40">
                      <span className="text-[11px] text-slate-400 block truncate">{kpi.label}</span>
                      <span className="text-base font-bold text-white block mt-0.5">
                        {kpi.total.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500">Avg: {kpi.average.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Findings */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Key Findings
                </h4>
                <div className="space-y-2">
                  {reportData.intelligence?.key_findings.map((f: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                      <h5 className="font-bold text-slate-200 mb-1">{f.title}</h5>
                      <p className="text-slate-400 mb-1">{f.evidence}</p>
                      <p className="text-[11px] text-slate-500">{f.impact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risks */}
              {reportData.intelligence?.major_risks?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Operational Risks
                  </h4>
                  <div className="space-y-2">
                    {reportData.intelligence.major_risks.map((r: any, i: number) => (
                      <div key={i} className="p-3.5 rounded-xl border border-red-500/20 bg-red-950/10 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-200">{r.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 uppercase">
                            {r.severity}
                          </span>
                        </div>
                        <p className="text-slate-300">{r.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Strategic Recommendations
                </h4>
                <div className="space-y-2">
                  {reportData.intelligence?.actionable_recommendations.map((rec: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 text-xs">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-0.5">
                        {rec.area}
                      </span>
                      <p className="text-slate-200 font-medium mb-1">Action: {rec.action}</p>
                      <p className="text-emerald-400 text-[11px]">Expected Impact: {rec.expected_impact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Conclusion */}
              {reportData.intelligence?.final_conclusion && (
                <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/30 text-xs">
                  <span className="font-bold text-indigo-300 block mb-1">Executive Conclusion</span>
                  <p className="text-slate-300 leading-relaxed">
                    {reportData.intelligence.final_conclusion}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-xs text-slate-500 py-12">
              Failed to load report data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
