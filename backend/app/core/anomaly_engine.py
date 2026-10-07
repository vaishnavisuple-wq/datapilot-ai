import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from sklearn.ensemble import IsolationForest

class AnomalyEngine:
    """Detects statistical outliers, multivariate anomalies, and sudden drops/spikes."""

    @staticmethod
    def detect_anomalies(df: pd.DataFrame, max_anomalies: int = 50) -> Dict[str, Any]:
        num_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        if not num_cols or len(df) < 5:
            return {"anomalies": [], "summary": "Insufficient numerical data for anomaly detection."}

        clean_df = df.copy()
        anomalies_list: List[Dict[str, Any]] = []

        # 1. Isolation Forest for multivariate anomaly score
        if len(num_cols) >= 2 and len(clean_df) >= 15:
            try:
                imputed = clean_df[num_cols].fillna(clean_df[num_cols].median())
                contamination = min(0.08, max(0.01, 10 / len(clean_df)))
                iso = IsolationForest(contamination=contamination, random_state=42)
                preds = iso.fit_predict(imputed)
                scores = iso.decision_function(imputed)

                outlier_indices = np.where(preds == -1)[0]
                for idx in outlier_indices[:max_anomalies]:
                    row = clean_df.iloc[idx]
                    anomaly_score = round(float(scores[idx]), 3)

                    # Find the primary culprit column
                    worst_col = num_cols[0]
                    max_z = 0.0
                    for c in num_cols:
                        mean_c = imputed[c].mean()
                        std_c = imputed[c].std()
                        if std_c > 0:
                            z = abs((row[c] - mean_c) / std_c)
                            if z > max_z:
                                max_z = z
                                worst_col = c

                    row_desc = {}
                    for col in clean_df.columns[:5]:
                        val = row[col]
                        if isinstance(val, (np.floating, float)):
                            row_desc[col] = round(float(val), 2)
                        elif isinstance(val, pd.Timestamp):
                            row_desc[col] = val.strftime("%Y-%m-%d")
                        else:
                            row_desc[col] = str(val)

                    anomalies_list.append({
                        "row_index": int(idx),
                        "type": "Multivariate Pattern",
                        "severity": "Critical" if anomaly_score < -0.15 or max_z > 3.5 else "Warning",
                        "primary_feature": worst_col,
                        "value": round(float(row[worst_col]), 2) if pd.notna(row[worst_col]) else 0,
                        "z_score": round(float(max_z), 2),
                        "explanation": f"Unusual combination across features. {worst_col} differs significantly ({round(float(max_z), 1)}σ from normal).",
                        "row_data": row_desc
                    })
            except Exception:
                pass

        # 2. Univariate Extreme Z-Scores / IQR
        for c in num_cols[:4]:
            s = clean_df[c].dropna()
            if len(s) < 5:
                continue
            mean_val = s.mean()
            std_val = s.std()
            if std_val == 0:
                continue

            z_scores = (s - mean_val) / std_val
            extreme_mask = z_scores.abs() > 3.0
            extreme_indices = s[extreme_mask].index

            for idx in extreme_indices[:5]:
                # Avoid duplicate row logging if already in list
                if any(a["row_index"] == int(idx) and a["primary_feature"] == c for a in anomalies_list):
                    continue
                val = float(clean_df.loc[idx, c])
                z = float(z_scores.loc[idx])
                direction = "abnormally high spike" if z > 0 else "unexpected sharp drop"

                row_desc = {}
                for col in clean_df.columns[:5]:
                    row_desc[col] = str(clean_df.loc[idx, col])

                anomalies_list.append({
                    "row_index": int(idx),
                    "type": "Statistical Outlier",
                    "severity": "Critical" if abs(z) > 4.0 else "Warning",
                    "primary_feature": c,
                    "value": round(val, 2),
                    "z_score": round(z, 2),
                    "explanation": f"Feature '{c}' exhibited an {direction} ({round(abs(z), 1)} standard deviations from mean {round(mean_val, 1)}).",
                    "row_data": row_desc
                })

        # 3. Sort by severity and z-score
        anomalies_list.sort(key=lambda x: (x["severity"] == "Critical", abs(x.get("z_score", 0))), reverse=True)

        summary_text = (
            f"Detected {len(anomalies_list)} notable anomalies across {len(num_cols)} numerical dimensions. "
            f"{sum(1 for a in anomalies_list if a['severity'] == 'Critical')} flagged as high-priority critical deviations."
        )

        return {
            "total_anomalies_found": len(anomalies_list),
            "summary": summary_text,
            "anomalies": anomalies_list[:max_anomalies]
        }
