import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  Sparkles, 
  ShoppingBag, 
  TrendingUp, 
  Truck, 
  Users, 
  ShieldCheck, 
  ArrowRight,
  Download,
  DollarSign,
  Layers,
  Loader2
} from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (file: File) => Promise<void>;
  onLoadSample: (sampleId: string) => Promise<void>;
  isLoading: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileUpload,
  onLoadSample,
  isLoading
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeSampleLoading, setActiveSampleLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await onFileUpload(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await onFileUpload(file);
    }
  };

  const handleSampleClick = async (sampleId: string) => {
    setActiveSampleLoading(sampleId);
    try {
      await onLoadSample(sampleId);
    } finally {
      setActiveSampleLoading(null);
    }
  };

  const sampleDatasets = [
    {
      id: 'financial_excel',
      title: 'Corporate Financial Performance',
      icon: DollarSign,
      format: 'Excel (.xlsx)',
      isExcel: true,
      sheets: '3 Sheets: Revenue & PnL, Product Sales, Regional Targets',
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      description: 'Multi-sheet financial model tracking revenues, COGS, gross margins, product profitability, and regional quota attainment.',
      tag: 'Finance & Multi-Sheet Excel'
    },
    {
      id: 'supply_excel',
      title: 'Global Supply Chain Operations',
      icon: Truck,
      format: 'Excel (.xlsx)',
      isExcel: true,
      sheets: '2 Sheets: Inventory Levels, Supplier Scorecard',
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      description: 'Multi-warehouse logistics workbook featuring safety stock levels, on-time delivery percentages, defect rates, and vendor lead times.',
      tag: 'Operations & Logistics Excel'
    },
    {
      id: 'hr_excel',
      title: 'Enterprise HR & Talent Census',
      icon: Users,
      format: 'Excel (.xlsx)',
      isExcel: true,
      sheets: '2 Sheets: Employee Census, Recruiting Metrics',
      color: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30',
      description: 'Comprehensive workforce dataset covering salaries, satisfaction ratings, retention probabilities, and recruiting pipeline metrics.',
      tag: 'People Analytics Excel'
    },
    {
      id: 'ecommerce',
      title: 'E-Commerce Retail & Profit',
      icon: ShoppingBag,
      format: 'CSV File',
      isExcel: false,
      sheets: 'Single Table',
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
      description: '2,200+ multi-regional orders across Electronics, Furniture & Subscriptions with pricing, margins & discounts.',
      tag: 'Retail & Sales'
    },
    {
      id: 'saas',
      title: 'SaaS Subscription & Churn',
      icon: TrendingUp,
      format: 'CSV File',
      isExcel: false,
      sheets: 'Single Table',
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
      description: '36-month subscription cohort metrics tracking MRR expansion, churn rates, ARPU, CAC and customer LTV.',
      tag: 'Finance & SaaS'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Autonomous AI Data Analyst
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
          Turn your spreadsheets into{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
            instant executive intelligence
          </span>
        </h1>
        <p className="text-slate-400 text-base sm:text-lg">
          Upload any Excel or CSV file. DataPilot automatically cleans the data, runs statistical modeling, generates interactive charts, detects anomalies, forecasts trends, and provides zero-hallucination business recommendations.
        </p>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900/90'
        } ${isLoading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">Analyzing Dataset Structure...</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Parsing columns, computing statistical profiles, running isolation forests, and preparing visualizations...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400 shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              Drop your spreadsheet here, or <span className="text-indigo-400 underline underline-offset-4">browse files</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-md">
              Supports Excel (.xlsx, .xls) and CSV datasets up to 50MB. Automatic multi-sheet detection and date parsing.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Excel (.xlsx, .xls) Multi-Sheet
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">
                <FileText className="w-3.5 h-3.5 text-blue-400" /> CSV Files
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> 100% In-Memory Privacy
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pre-Loaded Enterprise Samples with Multi-Sheet Excel */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Test Datasets & Multi-Sheet Excel Workbooks
            </h2>
            <p className="text-xs text-slate-400">
              Click any dataset to load instantly, or download the Excel (.xlsx) files to test uploading from your computer.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sampleDatasets.map((sample) => {
            const Icon = sample.icon;
            const isThisLoading = activeSampleLoading === sample.id;

            return (
              <div
                key={sample.id}
                className="group relative flex flex-col justify-between p-5 rounded-xl text-left bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg bg-gradient-to-br border ${sample.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-indigo-300 transition">
                          {sample.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            {sample.tag}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-[10px] font-bold text-emerald-400">
                            {sample.format}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {sample.description}
                  </p>

                  <div className="text-[11px] font-mono text-indigo-300 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80 mb-4">
                    {sample.sheets}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
                  {sample.isExcel && (
                    <a
                      href={`/api/upload/download-sample/${sample.id}`}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
                      title="Download .xlsx file to test uploading yourself"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Download .xlsx</span>
                    </a>
                  )}

                  <button
                    onClick={() => !isLoading && handleSampleClick(sample.id)}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600/90 hover:bg-indigo-600 transition disabled:opacity-60"
                  >
                    {isThisLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Load Dataset</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
