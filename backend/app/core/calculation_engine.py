import ast
import math
from typing import Dict, Any, List, Optional, Union
import pandas as pd
import numpy as np

class SafeASTValidator(ast.NodeVisitor):
    FORBIDDEN_NAMES = {
        "__import__", "eval", "exec", "open", "compile", "globals", "locals", "vars",
        "input", "getattr", "setattr", "delattr", "hasattr", "breakpoint",
        "subprocess", "os", "sys", "shutil", "socket", "http", "urllib", "requests"
    }
    
    def __init__(self):
        self.is_safe = True
        self.violation = ""

    def visit_Import(self, node):
        self.is_safe = False
        self.violation = "Imports are not permitted inside query execution sandbox."

    def visit_ImportFrom(self, node):
        self.is_safe = False
        self.violation = "Imports are not permitted inside query execution sandbox."

    def visit_Name(self, node):
        if node.id in self.FORBIDDEN_NAMES:
            self.is_safe = False
            self.violation = f"Access to '{node.id}' is forbidden for security."
        self.generic_visit(node)

    def visit_Attribute(self, node):
        if node.attr.startswith("__"):
            self.is_safe = False
            self.violation = f"Dunder attribute '{node.attr}' access is forbidden."
        self.generic_visit(node)


class CalculationEngine:
    """Safe calculations engine guaranteeing ground-truth numbers with zero hallucinations."""

    @staticmethod
    def aggregate_by(
        df: pd.DataFrame,
        dimension: str,
        metric: str,
        agg: str = "sum",
        top_n: int = 10,
        sort_desc: bool = True
    ) -> Dict[str, Any]:
        if dimension not in df.columns or metric not in df.columns:
            return {"error": f"Columns {dimension} or {metric} not found in dataset"}

        clean_df = df.dropna(subset=[dimension, metric])
        grouped = clean_df.groupby(dimension)[metric]

        # Determine smart aggregation if set to auto or sum for non-summable metrics
        actual_agg = agg
        m_low = metric.lower()
        has_currency = any(c in m_low for c in ["($)", "usd", "dollar", "amount ($)"])
        has_rate_word = any(r in m_low for r in ["rate", "pct", "%", "ratio"])
        is_rate = has_rate_word or (not has_currency and any(k in m_low for k in ["margin", "discount", "attainment", "satisfaction", "rating", "score", "price", "cac", "arpu", "lead time", "tenure"]))
        
        if (agg == "auto" or agg == "sum") and is_rate:
            actual_agg = "mean"

        if actual_agg == "sum":
            res = grouped.sum()
        elif actual_agg in ["mean", "avg"]:
            res = grouped.mean()
        elif actual_agg == "count":
            res = grouped.count()
        elif actual_agg == "min":
            res = grouped.min()
        elif actual_agg == "max":
            res = grouped.max()
        elif actual_agg == "median":
            res = grouped.median()
        else:
            res = grouped.sum()

        res = res.sort_values(ascending=not sort_desc)
        total_sum = float(clean_df[metric].sum()) if actual_agg in ["sum", "count"] else None
        overall_mean = float(clean_df[metric].mean()) if actual_agg == "mean" and len(clean_df[metric]) > 0 else None

        records = []
        for name, val in res.head(top_n).items():
            f_val = float(val) if not pd.isna(val) else 0.0
            item = {
                "category": str(name),
                "value": round(f_val, 2),
            }
            if total_sum and total_sum > 0 and actual_agg == "sum":
                item["share_percentage"] = round((f_val / total_sum) * 100, 2)
            elif overall_mean and overall_mean > 0 and actual_agg == "mean":
                item["vs_overall_avg"] = round(((f_val - overall_mean) / overall_mean) * 100, 1)
            records.append(item)

        return {
            "dimension": dimension,
            "metric": metric,
            "aggregation": actual_agg,
            "is_rate": is_rate,
            "total_groups": int(len(res)),
            "data": records
        }

    @staticmethod
    def compare_groups(
        df: pd.DataFrame,
        dimension: str,
        val1: Any,
        val2: Any,
        metrics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        if dimension not in df.columns:
            return {"error": f"Dimension '{dimension}' not found."}

        # Filter subsets
        group_a = df[df[dimension].astype(str) == str(val1)]
        group_b = df[df[dimension].astype(str) == str(val2)]

        if len(group_a) == 0 or len(group_b) == 0:
            return {
                "error": f"One or both entities have no records: '{val1}' ({len(group_a)} rows), '{val2}' ({len(group_b)} rows)."
            }

        # Select numeric metrics
        if not metrics:
            metrics = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])][:6]

        comparison_results = []
        for m in metrics:
            if m not in df.columns:
                continue
            sum_a = float(group_a[m].dropna().sum())
            sum_b = float(group_b[m].dropna().sum())
            mean_a = float(group_a[m].dropna().mean()) if len(group_a[m].dropna()) > 0 else 0.0
            mean_b = float(group_b[m].dropna().mean()) if len(group_b[m].dropna()) > 0 else 0.0

            # Compute difference based on sum
            diff_sum = round(sum_b - sum_a, 2)
            pct_change_sum = round(((sum_b - sum_a) / abs(sum_a)) * 100, 2) if sum_a != 0 else 0.0

            # Difference based on average
            diff_mean = round(mean_b - mean_a, 2)
            pct_change_mean = round(((mean_b - mean_a) / abs(mean_a)) * 100, 2) if mean_a != 0 else 0.0

            leader = str(val2) if sum_b > sum_a else (str(val1) if sum_a > sum_b else "Tied")

            comparison_results.append({
                "metric": m,
                "val1_sum": round(sum_a, 2),
                "val2_sum": round(sum_b, 2),
                "diff_sum": diff_sum,
                "pct_change_sum": pct_change_sum,
                "val1_mean": round(mean_a, 2),
                "val2_mean": round(mean_b, 2),
                "diff_mean": diff_mean,
                "pct_change_mean": pct_change_mean,
                "leader": leader
            })

        return {
            "dimension": dimension,
            "entity1": str(val1),
            "entity2": str(val2),
            "rows_entity1": int(len(group_a)),
            "rows_entity2": int(len(group_b)),
            "comparisons": comparison_results
        }

    @staticmethod
    def execute_safe_query(df: pd.DataFrame, code: str) -> Dict[str, Any]:
        """Validates and executes a sandboxed Python Pandas snippet on df."""
        try:
            tree = ast.parse(code)
            validator = SafeASTValidator()
            validator.visit(tree)
            if not validator.is_safe:
                return {"success": False, "error": validator.violation}

            # Safe execution sandbox
            safe_globals = {
                "pd": pd,
                "np": np,
                "math": math,
                "min": min,
                "max": max,
                "sum": sum,
                "len": len,
                "round": round,
                "sorted": sorted
            }
            safe_locals = {"df": df.copy(), "result": None}

            # If it's a single expression, capture it directly
            if len(tree.body) == 1 and isinstance(tree.body[0], ast.Expr):
                compiled = compile(ast.Expression(body=tree.body[0].value), "<string>", "eval")
                res = eval(compiled, safe_globals, safe_locals)
                safe_locals["result"] = res
            else:
                compiled = compile(tree, "<string>", "exec")
                exec(compiled, safe_globals, safe_locals)

            res = safe_locals.get("result")
            return CalculationEngine._format_result(res)
        except Exception as e:
            return {"success": False, "error": f"Execution error: {str(e)}"}

    @staticmethod
    def _format_result(res: Any) -> Dict[str, Any]:
        if res is None:
            return {"success": True, "type": "empty", "output": "Execution completed without a return value."}

        if isinstance(res, (int, float, str, bool)):
            return {"success": True, "type": "scalar", "output": res}

        if isinstance(res, pd.Series):
            df_res = res.reset_index()
            cols = [str(c) for c in df_res.columns]
            df_res.columns = cols
            return {
                "success": True,
                "type": "series",
                "columns": cols,
                "data": df_res.head(50).to_dict(orient="records"),
                "total_rows": len(df_res)
            }

        if isinstance(res, pd.DataFrame):
            df_clean = res.copy()
            df_clean.columns = [str(c) for c in df_clean.columns]
            # Convert timestamps
            for c in df_clean.columns:
                if pd.api.types.is_datetime64_any_dtype(df_clean[c]):
                    df_clean[c] = df_clean[c].dt.strftime("%Y-%m-%d")
            return {
                "success": True,
                "type": "dataframe",
                "columns": list(df_clean.columns),
                "data": df_clean.head(50).fillna("").to_dict(orient="records"),
                "total_rows": len(df_clean)
            }

        if isinstance(res, (list, tuple)):
            return {"success": True, "type": "list", "output": list(res)[:50]}

        if isinstance(res, dict):
            # Clean dict for JSON serialization
            cleaned = {}
            for k, v in res.items():
                if isinstance(v, (np.integer, int)):
                    cleaned[str(k)] = int(v)
                elif isinstance(v, (np.floating, float)):
                    cleaned[str(k)] = round(float(v), 2)
                else:
                    cleaned[str(k)] = str(v)
            return {"success": True, "type": "dict", "output": cleaned}

        return {"success": True, "type": "str", "output": str(res)}
