import React, { useState, useEffect } from 'react';
import { X, Settings, Key, ShieldCheck, Cpu, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [provider, setProvider] = useState<string>('local_engine');
  const [apiKey, setApiKey] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const savedP = localStorage.getItem('datapilot_provider') || 'local_engine';
    const savedK = localStorage.getItem('datapilot_api_key') || '';
    setProvider(savedP);
    setApiKey(savedK);
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('datapilot_provider', provider);
    if (apiKey.trim()) {
      localStorage.setItem('datapilot_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('datapilot_api_key');
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">AI Analyst Settings</h3>
              <p className="text-xs text-slate-400">Configure LLM engine and analysis options</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Intelligence Engine Provider
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="radio"
                  name="provider"
                  value="local_engine"
                  checked={provider === 'local_engine'}
                  onChange={(e) => setProvider(e.target.value)}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Built-In Grounded Semantic Engine (Zero API Key Required)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    100% offline calculations, verified Pandas statistics, instant response time, and zero hallucinations.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="radio"
                  name="provider"
                  value="gemini"
                  checked={provider === 'gemini'}
                  onChange={(e) => setProvider(e.target.value)}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Google Gemini API</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Uses Gemini 1.5 with full dataset grounding and strategic advice.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="radio"
                  name="provider"
                  value="openai"
                  checked={provider === 'openai'}
                  onChange={(e) => setProvider(e.target.value)}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Key className="w-3.5 h-3.5 text-blue-400" />
                    <span>OpenAI API</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Connects to GPT-4o / GPT-4o-mini with schema context.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {provider !== 'local_engine' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                API Key for {provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Leave empty to fallback to the server environment key or local calculation engine.
              </p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Privacy Assurance:</strong> Client keys are saved strictly in your local browser session and never stored permanently in databases.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : null}
            <span>{savedSuccess ? 'Saved' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
