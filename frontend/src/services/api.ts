import {
  DatasetProfile,
  AutoChart,
  ComparisonResult,
  TrendAnalysis,
  AnomalyAnalysis,
  ForecastResult,
  ExecutiveIntelligence,
  ChatMessage
} from '../types';

const API_BASE = '/api';

export const api = {
  // Upload and Data Initialization
  async uploadFile(file: File): Promise<{
    session_id: string;
    filename: string;
    file_type: string;
    sheet_names: string[];
    active_sheet: string;
    profile: DatasetProfile;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async loadSample(sampleId: string): Promise<{
    session_id: string;
    filename: string;
    file_type: string;
    sheet_names: string[];
    active_sheet: string;
    profile: DatasetProfile;
  }> {
    const res = await fetch(`${API_BASE}/upload/load-sample`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_id: sampleId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load sample' }));
      throw new Error(err.detail || 'Failed to load sample');
    }
    return res.json();
  },

  async selectSheet(sessionId: string, sheetName: string): Promise<{
    session_id: string;
    active_sheet: string;
    profile: DatasetProfile;
  }> {
    const res = await fetch(`${API_BASE}/upload/select-sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, sheet_name: sheetName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to select sheet' }));
      throw new Error(err.detail || 'Failed to select sheet');
    }
    return res.json();
  },

  // Analysis & Charts
  async getProfile(sessionId: string): Promise<DatasetProfile> {
    const res = await fetch(`${API_BASE}/analysis/${sessionId}/profile`);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async getAutoCharts(sessionId: string): Promise<{ total_charts: number; charts: AutoChart[] }> {
    const res = await fetch(`${API_BASE}/visualize/${sessionId}/auto-charts`);
    if (!res.ok) throw new Error('Failed to fetch charts');
    return res.json();
  },

  // Comparisons
  async getComparisonOptions(sessionId: string): Promise<{
    dimensions: string[];
    values_by_dimension: Record<string, string[]>;
    available_metrics: string[];
  }> {
    const res = await fetch(`${API_BASE}/compare/${sessionId}/options`);
    if (!res.ok) throw new Error('Failed to fetch comparison options');
    return res.json();
  },

  async executeComparison(
    sessionId: string,
    dimension: string,
    entity1: string,
    entity2: string,
    metrics?: string[]
  ): Promise<ComparisonResult> {
    const res = await fetch(`${API_BASE}/compare/${sessionId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dimension, entity1, entity2, metrics }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Comparison failed' }));
      throw new Error(err.detail || 'Comparison failed');
    }
    return res.json();
  },

  // Trends
  async getTrends(sessionId: string): Promise<TrendAnalysis> {
    const res = await fetch(`${API_BASE}/trends/${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch trends');
    return res.json();
  },

  // Anomalies
  async getAnomalies(sessionId: string): Promise<AnomalyAnalysis> {
    const res = await fetch(`${API_BASE}/anomalies/${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch anomalies');
    return res.json();
  },

  // Forecast
  async getForecast(
    sessionId: string,
    metric?: string,
    dateCol?: string,
    horizon: number = 6
  ): Promise<ForecastResult> {
    const params = new URLSearchParams({ horizon: horizon.toString() });
    if (metric) params.append('metric', metric);
    if (dateCol) params.append('date_col', dateCol);

    const res = await fetch(`${API_BASE}/forecast/${sessionId}?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch forecast');
    return res.json();
  },

  // Executive Intelligence & Report
  async getExecutiveIntelligence(sessionId: string): Promise<ExecutiveIntelligence> {
    const res = await fetch(`${API_BASE}/report/${sessionId}/executive-intelligence`);
    if (!res.ok) throw new Error('Failed to fetch executive intelligence');
    return res.json();
  },

  async getFullReport(sessionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/report/${sessionId}/full-report`);
    if (!res.ok) throw new Error('Failed to fetch full report');
    return res.json();
  },

  // AI Chat
  async sendChatMessage(
    sessionId: string,
    message: string,
    apiKeyOverride?: string,
    providerOverride?: string
  ): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE}/chat/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        api_key_override: apiKeyOverride || undefined,
        provider_override: providerOverride || undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to send message' }));
      throw new Error(err.detail || 'Failed to send message');
    }
    return res.json();
  },

  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE}/chat/${sessionId}/history`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  },

  async clearChatHistory(sessionId: string): Promise<void> {
    await fetch(`${API_BASE}/chat/${sessionId}/clear`, { method: 'DELETE' });
  },
};
