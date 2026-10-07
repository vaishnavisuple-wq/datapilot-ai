import io
import re
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np

class DataProfiler:
    """Deep data profiling, type inference, statistics, and quality analysis."""

    @staticmethod
    def load_dataset(file_path: Path, file_type: str, sheet_name: Optional[str] = None) -> Tuple[pd.DataFrame, List[str], str]:
        sheet_names = []
        active_sheet = ""
        
        if file_type == "excel" or file_path.suffix.lower() in [".xlsx", ".xls"]:
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names
            active_sheet = sheet_name if sheet_name and sheet_name in sheet_names else sheet_names[0]
            df = pd.read_excel(file_path, sheet_name=active_sheet)
        else:
            # CSV with flexible delimiter detection
            try:
                df = pd.read_csv(file_path)
            except Exception:
                try:
                    df = pd.read_csv(file_path, sep=";", encoding="utf-8-sig")
                except Exception:
                    df = pd.read_csv(file_path, sep="\t")
            sheet_names = ["Sheet1"]
            active_sheet = "Sheet1"

        # Standardize columns
        df.columns = [str(c).strip() for c in df.columns]
        
        # Clean currency/percentage strings in columns that are mostly numeric
        for col in df.columns:
            if df[col].dtype == object:
                sample = df[col].dropna().astype(str).str.strip()
                if len(sample) > 0:
                    # Check if looks like currency or percentage e.g. "$1,234.50" or "45%"
                    cleaned = sample.str.replace("$", "", regex=False).str.replace(",", "", regex=False).str.replace("%", "", regex=False)
                    converted = pd.to_numeric(cleaned, errors="coerce")
                    if converted.notna().sum() / len(sample) >= 0.85:
                        df[col] = pd.to_numeric(
                            df[col].astype(str).str.replace("$", "", regex=False).str.replace(",", "", regex=False).str.replace("%", "", regex=False),
                            errors="coerce"
                        )
                        
            # Auto-detect datetime columns
            col_lower = str(col).lower()
            if any(term in col_lower for term in ["date", "time", "month", "year", "day", "week", "timestamp", "period"]):
                if pd.api.types.is_object_dtype(df[col]) or pd.api.types.is_string_dtype(df[col]) or pd.api.types.is_datetime64_any_dtype(df[col]):
                    try:
                        parsed = pd.to_datetime(df[col], errors="coerce")
                        if parsed.notna().sum() / max(1, len(df[col].dropna())) >= 0.70:
                            df[col] = parsed
                    except Exception:
                        pass

        return df, sheet_names, active_sheet

    @staticmethod
    def profile_dataframe(df: pd.DataFrame, filename: str, active_sheet: str) -> Dict[str, Any]:
        total_rows = int(len(df))
        total_cols = int(len(df.columns))
        
        numeric_cols = []
        categorical_cols = []
        datetime_cols = []
        id_cols = []
        
        col_types: Dict[str, str] = {}
        missing_counts: Dict[str, int] = {}
        missing_percentages: Dict[str, float] = {}
        unique_counts: Dict[str, int] = {}
        
        for col in df.columns:
            series = df[col]
            n_missing = int(series.isna().sum())
            missing_counts[col] = n_missing
            missing_percentages[col] = round((n_missing / max(1, total_rows)) * 100, 2)
            n_unique = int(series.nunique(dropna=True))
            unique_counts[col] = n_unique
            
            # Determine type
            if pd.api.types.is_datetime64_any_dtype(series):
                col_types[col] = "datetime"
                datetime_cols.append(col)
            elif pd.api.types.is_numeric_dtype(series):
                # Check if it's an ID column (e.g. integer with 100% unique or name contains id/code)
                if ("id" in col.lower() or "code" in col.lower() or "key" in col.lower()) and n_unique == total_rows and total_rows > 10:
                    col_types[col] = "id"
                    id_cols.append(col)
                else:
                    col_types[col] = "numeric"
                    numeric_cols.append(col)
            else:
                if ("id" in col.lower() or "code" in col.lower() or "uuid" in col.lower()) and n_unique > total_rows * 0.9:
                    col_types[col] = "id"
                    id_cols.append(col)
                elif n_unique < max(50, total_rows * 0.5):
                    col_types[col] = "categorical"
                    categorical_cols.append(col)
                else:
                    col_types[col] = "text"
                    categorical_cols.append(col)

        # Duplicate analysis
        duplicate_rows_count = int(df.duplicated().sum())
        duplicate_percentage = round((duplicate_rows_count / max(1, total_rows)) * 100, 2)
        
        # Missing values overall
        total_cells = total_rows * total_cols
        total_missing_cells = sum(missing_counts.values())
        data_health_score = max(0, min(100, round(100 - (total_missing_cells / max(1, total_cells) * 100 * 2) - (duplicate_percentage * 1.5), 1)))

        # Descriptive statistics for numeric columns
        numeric_stats: Dict[str, Any] = {}
        outlier_counts: Dict[str, int] = {}
        total_outliers = 0
        
        for col in numeric_cols:
            s = df[col].dropna()
            if len(s) == 0:
                continue
            q1 = float(s.quantile(0.25))
            q3 = float(s.quantile(0.75))
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outlier_mask = (s < lower_bound) | (s > upper_bound)
            n_outliers = int(outlier_mask.sum())
            outlier_counts[col] = n_outliers
            total_outliers += n_outliers
            
            mean_val = float(s.mean())
            std_val = float(s.std()) if len(s) > 1 else 0.0
            
            numeric_stats[col] = {
                "count": int(len(s)),
                "mean": round(mean_val, 2),
                "std": round(std_val, 2),
                "min": round(float(s.min()), 2),
                "q25": round(q1, 2),
                "median": round(float(s.median()), 2),
                "q75": round(q3, 2),
                "max": round(float(s.max()), 2),
                "sum": round(float(s.sum()), 2),
                "skew": round(float(s.skew()), 2) if len(s) > 2 and not pd.isna(s.skew()) else 0.0,
                "outliers_count": n_outliers,
                "outliers_percentage": round((n_outliers / len(s)) * 100, 2)
            }

        # Categorical statistics
        categorical_stats: Dict[str, Any] = {}
        for col in categorical_cols:
            s = df[col].dropna().astype(str)
            if len(s) == 0:
                continue
            val_counts = s.value_counts()
            top_5 = [{"category": str(k), "count": int(v), "percentage": round((v / len(s)) * 100, 1)} for k, v in val_counts.head(5).items()]
            categorical_stats[col] = {
                "unique_count": int(len(val_counts)),
                "top_value": str(val_counts.index[0]) if len(val_counts) > 0 else "None",
                "top_frequency": int(val_counts.iloc[0]) if len(val_counts) > 0 else 0,
                "top_categories": top_5
            }

        # Datetime statistics
        datetime_stats: Dict[str, Any] = {}
        for col in datetime_cols:
            s = df[col].dropna()
            if len(s) == 0:
                continue
            min_date = s.min()
            max_date = s.max()
            span_days = int((max_date - min_date).days) if pd.notna(min_date) and pd.notna(max_date) else 0
            datetime_stats[col] = {
                "min_date": min_date.strftime("%Y-%m-%d") if pd.notna(min_date) else None,
                "max_date": max_date.strftime("%Y-%m-%d") if pd.notna(max_date) else None,
                "span_days": span_days,
                "total_points": int(len(s))
            }

        # Correlation Matrix
        correlation_matrix: Dict[str, Dict[str, float]] = {}
        top_correlations: List[Dict[str, Any]] = []
        
        if len(numeric_cols) >= 2:
            try:
                corr_df = df[numeric_cols].corr(method="pearson").round(3)
                for c1 in numeric_cols:
                    correlation_matrix[c1] = {}
                    for c2 in numeric_cols:
                        val = corr_df.loc[c1, c2]
                        correlation_matrix[c1][c2] = float(val) if not pd.isna(val) else 0.0

                # Extract significant relationships
                pairs_seen = set()
                for c1 in numeric_cols:
                    for c2 in numeric_cols:
                        if c1 != c2:
                            pair = tuple(sorted([c1, c2]))
                            if pair not in pairs_seen:
                                pairs_seen.add(pair)
                                r = correlation_matrix[c1][c2]
                                if abs(r) >= 0.35:
                                    top_correlations.append({
                                        "feature1": c1,
                                        "feature2": c2,
                                        "correlation": r,
                                        "strength": "Strong" if abs(r) >= 0.7 else "Moderate",
                                        "direction": "Positive" if r > 0 else "Negative"
                                    })
                top_correlations.sort(key=lambda x: abs(x["correlation"]), reverse=True)
            except Exception:
                pass

        # Inferred Business Domain & Primary Metrics
        domain, primary_metric, primary_dimension = DataProfiler._infer_domain_and_kpis(df.columns, numeric_cols, categorical_cols)
        
        # Quick executive KPIs based on primary metrics
        executive_kpis = []
        for col in numeric_cols[:4]:
            stats = numeric_stats.get(col, {})
            executive_kpis.append({
                "label": col,
                "total": stats.get("sum", 0),
                "average": stats.get("mean", 0),
                "min": stats.get("min", 0),
                "max": stats.get("max", 0),
                "is_primary": col == primary_metric
            })

        # Preview rows (first 50)
        preview_df = df.head(50).copy()
        for col in preview_df.columns:
            if pd.api.types.is_datetime64_any_dtype(preview_df[col]):
                preview_df[col] = preview_df[col].dt.strftime("%Y-%m-%d %H:%M:%S").replace(" 00:00:00", "")
        preview_records = preview_df.fillna("").to_dict(orient="records")

        return {
            "filename": filename,
            "active_sheet": active_sheet,
            "total_rows": total_rows,
            "total_columns": total_cols,
            "column_types": col_types,
            "numeric_columns": numeric_cols,
            "categorical_columns": categorical_cols,
            "datetime_columns": datetime_cols,
            "id_columns": id_cols,
            "missing_counts": missing_counts,
            "missing_percentages": missing_percentages,
            "duplicate_rows_count": duplicate_rows_count,
            "duplicate_percentage": duplicate_percentage,
            "data_health_score": data_health_score,
            "total_outliers": total_outliers,
            "numeric_stats": numeric_stats,
            "categorical_stats": categorical_stats,
            "datetime_stats": datetime_stats,
            "correlation_matrix": correlation_matrix,
            "top_correlations": top_correlations[:10],
            "inferred_domain": domain,
            "primary_metric": primary_metric,
            "primary_dimension": primary_dimension,
            "executive_kpis": executive_kpis,
            "preview_data": preview_records
        }

    @staticmethod
    def _infer_domain_and_kpis(all_cols, numeric_cols, categorical_cols) -> Tuple[str, Optional[str], Optional[str]]:
        cols_str = " ".join([str(c).lower() for c in all_cols])
        
        # Domain detection
        if any(w in cols_str for w in ["sales", "order", "product", "discount", "customer", "profit", "store"]):
            domain = "E-Commerce & Retail"
        elif any(w in cols_str for w in ["mrr", "churn", "arr", "subscription", "cac", "ltv", "active users"]):
            domain = "SaaS & Subscriptions"
        elif any(w in cols_str for w in ["warehouse", "stock", "lead time", "inventory", "defect", "supply"]):
            domain = "Supply Chain & Logistics"
        elif any(w in cols_str for w in ["salary", "attrition", "department", "employee", "tenure", "hr", "performance"]):
            domain = "HR & Workforce Analytics"
        elif any(w in cols_str for w in ["revenue", "expense", "ebitda", "margin", "asset", "liability", "tax"]):
            domain = "Finance & Corporate Performance"
        elif any(w in cols_str for w in ["campaign", "clicks", "impressions", "ctr", "cpc", "conversion"]):
            domain = "Marketing & Growth Analytics"
        else:
            domain = "Cross-Functional Business Dataset"

        # Best primary metric
        primary_metric = None
        priority_metrics = ["sales", "revenue", "mrr", "profit", "stock level", "salary", "units fulfilled", "amount", "total", "cost"]
        for p in priority_metrics:
            for num in numeric_cols:
                if p in num.lower():
                    primary_metric = num
                    break
            if primary_metric:
                break
        if not primary_metric and numeric_cols:
            primary_metric = numeric_cols[0]

        # Best primary dimension
        primary_dim = None
        priority_dims = ["category", "product name", "product", "region", "department", "warehouse", "plan", "segment", "country"]
        for p in priority_dims:
            for cat in categorical_cols:
                if p in cat.lower():
                    primary_dim = cat
                    break
            if primary_dim:
                break
        if not primary_dim and categorical_cols:
            primary_dim = categorical_cols[0]

        return domain, primary_metric, primary_dim
