import React, { useState, useEffect } from 'react';
import { 
  Navbar 
} from './components/Navbar';
import { 
  FileUploader 
} from './components/FileUploader';
import { 
  DashboardOverview 
} from './components/DashboardOverview';
import { 
  ChartsSection 
} from './components/ChartsSection';
import { 
  ComparisonView 
} from './components/ComparisonView';
import { 
  TrendsView 
} from './components/TrendsView';
import { 
  AnomalyView 
} from './components/AnomalyView';
import { 
  ForecastView 
} from './components/ForecastView';
import { 
  AIChatDrawer 
} from './components/AIChatDrawer';
import { 
  DataTableModal 
} from './components/DataTableModal';
import { 
  ReportModal 
} from './components/ReportModal';
import { 
  SettingsModal 
} from './components/SettingsModal';

import { 
  LayoutDashboard, 
  BarChart3, 
  Scale, 
  TrendingUp, 
  AlertOctagon, 
  Sparkles, 
  Bot, 
  Upload,
  ChevronRight
} from 'lucide-react';
import { DatasetProfile, AutoChart, ExecutiveIntelligence } from './types';
import { api } from './services/api';

export function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [charts, setCharts] = useState<AutoChart[]>([]);
  const [intelligence, setIntelligence] = useState<ExecutiveIntelligence | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'compare' | 'trends' | 'anomalies' | 'forecast'>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modals & Drawers
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatPrompt, setChatPrompt] = useState<string>('');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isDataTableOpen, setIsDataTableOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Auto-load ecommerce sample on first launch if no dataset loaded yet
  useEffect(() => {
    const autoLoad = async () => {
      try {
        await handleLoadSample('ecommerce');
      } catch (err) {
        console.log('Sample autoload ready on demand');
      }
    };
    autoLoad();
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const res = await api.uploadFile(file);
      setSessionId(res.session_id);
      setProfile(res.profile);
      setActiveSheet(res.active_sheet);
      setSheetNames(res.sheet_names);
      setIsUploadOpen(false);
      setActiveTab('overview');

      // Load analytics in parallel
      loadSecondaryAnalytics(res.session_id);
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = async (sampleId: string) => {
    setIsLoading(true);
    try {
      const res = await api.loadSample(sampleId);
      setSessionId(res.session_id);
      setProfile(res.profile);
      setActiveSheet(res.active_sheet);
      setSheetNames(res.sheet_names);
      setIsUploadOpen(false);
      setActiveTab('overview');

      // Load secondary analytics
      loadSecondaryAnalytics(res.session_id);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSheet = async (sheetName: string) => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await api.selectSheet(sessionId, sheetName);
      setActiveSheet(res.active_sheet);
      setProfile(res.profile);
      loadSecondaryAnalytics(sessionId);
    } catch (err: any) {
      alert(`Sheet switch error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSecondaryAnalytics = async (sId: string) => {
    try {
      const [chartsData, intelData] = await Promise.all([
        api.getAutoCharts(sId).catch(() => ({ charts: [] })),
        api.getExecutiveIntelligence(sId).catch(() => null),
      ]);
      setCharts(chartsData.charts);
      setIntelligence(intelData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAskAI = (promptText: string) => {
    setChatPrompt(promptText);
    setIsChatOpen(true);
  };

  const tabs = [
    { id: 'overview', label: 'Executive Summary', icon: LayoutDashboard },
    { id: 'charts', label: 'Visual Analytics', icon: BarChart3 },
    { id: 'compare', label: 'Smart Comparisons', icon: Scale },
    { id: 'trends', label: 'Trend & Seasonality', icon: TrendingUp },
    { id: 'anomalies', label: 'Anomaly Detection', icon: AlertOctagon },
    { id: 'forecast', label: 'AI Forecasting', icon: Sparkles },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Navbar */}
      <Navbar
        profile={profile}
        activeSheet={activeSheet}
        sheetNames={sheetNames}
        onSelectSheet={handleSelectSheet}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenDataTable={() => setIsDataTableOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!profile || isUploadOpen ? (
          <FileUploader
            onFileUpload={handleFileUpload}
            onLoadSample={handleLoadSample}
            isLoading={isLoading}
          />
        ) : (
          <div className="space-y-6">
            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80 scrollbar-none">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Workspace View */}
            <div className="transition-all duration-200">
              {activeTab === 'overview' && (
                <DashboardOverview
                  profile={profile}
                  intelligence={intelligence}
                  onNavigateToTab={(t: any) => setActiveTab(t)}
                  onAskAI={handleAskAI}
                />
              )}

              {activeTab === 'charts' && (
                <ChartsSection charts={charts} />
              )}

              {activeTab === 'compare' && sessionId && (
                <ComparisonView sessionId={sessionId} />
              )}

              {activeTab === 'trends' && sessionId && (
                <TrendsView sessionId={sessionId} />
              )}

              {activeTab === 'anomalies' && sessionId && (
                <AnomalyView sessionId={sessionId} />
              )}

              {activeTab === 'forecast' && sessionId && (
                <ForecastView sessionId={sessionId} profile={profile} />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating AI Chat Dock Button (when chat closed and profile loaded) */}
      {profile && !isChatOpen && (
        <button
          onClick={() => {
            setChatPrompt('');
            setIsChatOpen(true);
          }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>
          <span>Ask AI Analyst</span>
        </button>
      )}

      {/* AI Chat Drawer */}
      {profile && sessionId && (
        <AIChatDrawer
          sessionId={sessionId}
          profile={profile}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          initialPrompt={chatPrompt}
        />
      )}

      {/* Data Explorer Table Modal */}
      {profile && (
        <DataTableModal
          profile={profile}
          isOpen={isDataTableOpen}
          onClose={() => setIsDataTableOpen(false)}
        />
      )}

      {/* Executive Report Modal */}
      {sessionId && (
        <ReportModal
          sessionId={sessionId}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
