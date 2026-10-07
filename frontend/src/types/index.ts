export interface ColumnStats {
  count: number;
  mean: number;
  std: number;
  min: number;
  q25: number;
  median: number;
  q75: number;
  max: number;
  sum: number;
  skew: number;
  outliers_count: number;
  outliers_percentage: number;
}

export interface CategoricalStats {
  unique_count: number;
  top_value: string;
  top_frequency: number;
  top_categories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

export interface ExecutiveKPI {
  label: string;
  metric_type?: string;
  is_additive?: boolean;
  display_label?: string;
  display_value?: number;
  total: number;
  average: number;
  min: number;
  max: number;
  format?: string;
  unit?: string;
  is_primary: boolean;
}

export interface DatasetProfile {
  filename: string;
  active_sheet: string;
  total_rows: number;
  total_columns: number;
  column_types: Record<string, string>;
  numeric_columns: string[];
  categorical_columns: string[];
  datetime_columns: string[];
  id_columns: string[];
  missing_counts: Record<string, number>;
  missing_percentages: Record<string, number>;
  duplicate_rows_count: number;
  duplicate_percentage: number;
  data_health_score: number;
  total_outliers: number;
  numeric_stats: Record<string, ColumnStats>;
  categorical_stats: Record<string, CategoricalStats>;
  datetime_stats: Record<string, any>;
  correlation_matrix: Record<string, Record<string, number>>;
  top_correlations: Array<{
    feature1: string;
    feature2: string;
    correlation: number;
    strength: string;
    direction: string;
  }>;
  inferred_domain: string;
  primary_metric: string | null;
  primary_dimension: string | null;
  executive_kpis: ExecutiveKPI[];
  preview_data: Record<string, any>[];
}

export interface AutoChart {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'area';
  x_axis: string;
  y_axis: string;
  aggregation?: string;
  data: any[];
  description: string;
}

export interface ComparisonResult {
  dimension: string;
  entity1: string;
  entity2: string;
  rows_entity1: number;
  rows_entity2: number;
  comparisons: Array<{
    metric: string;
    val1_sum: number;
    val2_sum: number;
    diff_sum: number;
    pct_change_sum: number;
    val1_mean: number;
    val2_mean: number;
    diff_mean: number;
    pct_change_mean: number;
    leader: string;
  }>;
  chart_data: any[];
  overall_winner: string;
  conclusion: string;
}

export interface TrendAnalysis {
  has_temporal_trends: boolean;
  primary_metric: string;
  periodic_chart: Array<{
    period: string;
    metric_value: number;
    growth_rate_pct: number;
  }>;
  findings: Array<{
    type: string;
    title: string;
    metric: string;
    value: number;
    description: string;
  }>;
  seasonality_insights: string[];
  category_momentum: Array<{
    category: string;
    h1_total: number;
    h2_total: number;
    growth_pct: number;
    status: string;
  }>;
}

export interface AnomalyItem {
  row_index: number;
  type: string;
  severity: 'Critical' | 'Warning';
  primary_feature: string;
  value: number;
  z_score: number;
  explanation: string;
  row_data: Record<string, any>;
}

export interface AnomalyAnalysis {
  total_anomalies_found: number;
  summary: string;
  anomalies: AnomalyItem[];
}

export interface ForecastResult {
  is_eligible: boolean;
  message?: string;
  target_date_column?: string;
  target_metric_column?: string;
  frequency?: string;
  horizon_periods?: number;
  historical_data?: Array<{ date: string; actual: number; is_forecast: boolean }>;
  forecast_data?: Array<{ date: string; forecast: number; lower_bound: number; upper_bound: number; is_forecast: boolean }>;
  combined_chart_data?: any[];
  metrics?: {
    recent_historical_avg: number;
    projected_avg: number;
    projected_growth_rate_pct: number;
    trend_direction: string;
    confidence_interval: string;
  };
  recommendation?: string;
}

export interface ExecutiveIntelligence {
  executive_summary_title: string;
  health_score: number;
  key_findings: Array<{
    title: string;
    evidence: string;
    impact: string;
  }>;
  major_risks: Array<{
    category: string;
    severity: string;
    title: string;
    description: string;
  }>;
  strategic_opportunities: Array<{
    category: string;
    title: string;
    description: string;
  }>;
  actionable_recommendations: Array<{
    area: string;
    finding: string;
    action: string;
    expected_impact: string;
  }>;
  final_conclusion: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  query_executed?: string;
  data_table?: any[];
  chart_spec?: any;
  suggested_followups?: string[];
  timestamp: string;
}
