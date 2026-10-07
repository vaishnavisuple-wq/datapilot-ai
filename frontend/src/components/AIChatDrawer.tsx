import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Bot, 
  User, 
  Loader2, 
  BarChart2, 
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  BarChart, Bar, 
  LineChart, Line, 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { ChatMessage, DatasetProfile } from '../types';
import { api } from '../services/api';

interface AIChatDrawerProps {
  sessionId: string;
  profile: DatasetProfile;
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  sessionId,
  profile,
  isOpen,
  onClose,
  initialPrompt
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedCode, setExpandedCode] = useState<Record<number, boolean>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId) {
      loadHistory();
    }
  }, [sessionId]);

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadHistory = async () => {
    try {
      const hist = await api.getChatHistory(sessionId);
      setMessages(hist);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setInput('');
    const userMsg: ChatMessage = {
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const apiKey = localStorage.getItem('datapilot_api_key') || undefined;
      const provider = localStorage.getItem('datapilot_provider') || undefined;
      const resp = await api.sendChatMessage(sessionId, query, apiKey, provider);
      setMessages((prev) => [...prev, resp]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `**Error:** ${err.message || 'Failed to process query'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear conversation history for this dataset?')) {
      await api.clearChatHistory(sessionId);
      setMessages([]);
    }
  };

  const toggleCode = (idx: number) => {
    setExpandedCode((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const quickPrompts = [
    'What are my best-performing segments?',
    'Why did sales decline or where are the weakest points?',
    'What are the biggest operational risks or anomalies?',
    'Compare top 2 categories with exact metrics',
    'Forecast upcoming trajectory'
  ];

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-0 right-0 z-50 transition-all duration-300 flex flex-col shadow-2xl bg-slate-950 border-l border-t border-slate-800 ${
        isExpanded
          ? 'w-full md:w-[700px] h-full'
          : 'w-full md:w-[500px] h-[640px] md:h-[700px] rounded-tl-2xl'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-white">AI Data Analyst</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                Ground-Truth Math
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
              Active: {profile.filename} ({profile.total_rows.toLocaleString()} rows)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
              title="Clear Chat History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <Bot className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-white mb-1">
              Ask anything about your data
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mb-6">
              Answers are backed by verified calculations run directly on your dataset. Zero hallucinated metrics.
            </p>

            <div className="w-full space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Suggested Questions
              </span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="w-full p-2.5 rounded-xl text-left text-xs bg-slate-900 hover:bg-slate-850 hover:text-indigo-300 border border-slate-800 transition text-slate-300"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                  }`}
                >
                  {/* Markdown Answer Rendering */}
                  <div className="whitespace-pre-wrap space-y-1.5 font-sans">
                    {msg.content}
                  </div>

                  {/* Calculations Executed Badge */}
                  {msg.query_executed && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                      <button
                        onClick={() => toggleCode(idx)}
                        className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition"
                      >
                        <Terminal className="w-3 h-3" />
                        <span>Calculation Proof</span>
                        {expandedCode[idx] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {expandedCode[idx] && (
                        <div className="mt-2 p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto">
                          <code>{msg.query_executed}</code>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline Chart Spec */}
                  {msg.chart_spec && msg.chart_spec.data && msg.chart_spec.data.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300 mb-2">
                        <BarChart2 className="w-3 h-3 text-indigo-400" />
                        <span>{msg.chart_spec.title || 'Data Visualization'}</span>
                      </div>
                      <div className="w-full h-44 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={msg.chart_spec.data} margin={{ top: 5, right: 5, left: -20, bottom: 15 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="category" stroke="#64748b" fontSize={9} interval={0} angle={-25} textAnchor="end" />
                            <YAxis stroke="#64748b" fontSize={9} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px' }} />
                            <Bar dataKey="value" fill="#6366f1" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Follow-up Prompts */}
                  {msg.suggested_followups && msg.suggested_followups.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                      {msg.suggested_followups.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(f)}
                          className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium transition"
                        >
                          → {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <span>Analyzing dataset & calculating statistics...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about this dataset..."
            disabled={loading}
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition shadow-md shadow-indigo-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
