import React from 'react';
import { 
  Sparkles, 
  Table, 
  FileDown, 
  Settings, 
  Upload, 
  Layers, 
  ShieldCheck, 
  Database
} from 'lucide-react';
import { DatasetProfile } from '../types';

interface NavbarProps {
  profile: DatasetProfile | null;
  activeSheet: string;
  sheetNames: string[];
  onSelectSheet: (sheet: string) => void;
  onOpenUpload: () => void;
  onOpenDataTable: () => void;
  onOpenReport: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  activeSheet,
  sheetNames,
  onSelectSheet,
  onOpenUpload,
  onOpenDataTable,
  onOpenReport,
  onOpenSettings
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                DataPilot AI
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                Enterprise Analyst
              </span>
            </div>
            <div className="text-xs text-slate-400 hidden sm:block">
              Autonomous Intelligence & Grounded Data Science
            </div>
          </div>
        </div>

        {/* Dataset Pill Status */}
        {profile && (
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate max-w-[140px]" title={profile.filename}>{profile.filename}</span>
            </div>

            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{profile.total_rows.toLocaleString()} rows</span>

            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{profile.total_columns} cols</span>

            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1 text-emerald-400 font-semibold" title="Data Integrity Rating">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{profile.data_health_score}%</span>
            </div>

            {/* Sheet Selector for Excel */}
            {sheetNames.length > 1 && (
              <>
                <span className="text-slate-600">•</span>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <select
                    value={activeSheet}
                    onChange={(e) => onSelectSheet(e.target.value)}
                    className="bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {profile && (
            <>
              <button
                onClick={onOpenDataTable}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 hover:text-white border border-slate-800 transition"
                title="Explore Raw Dataset"
              >
                <Table className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Data Explorer</span>
              </button>

              <button
                onClick={onOpenReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 transition shadow-sm"
                title="Download Executive Report"
              >
                <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Export Report</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
            title="Settings & LLM API Configuration"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 transition shadow-md shadow-indigo-600/20"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{profile ? 'New Dataset' : 'Upload File'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
