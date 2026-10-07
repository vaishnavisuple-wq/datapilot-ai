# ⚡ DataPilot AI — Autonomous AI Data Analyst & Business Intelligence

> **Turn raw spreadsheets into executive intelligence, zero-hallucination calculations, interactive visualizations, and evidence-based strategic roadmaps.**

[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📖 Overview

**DataPilot AI** is a complete, enterprise-grade AI Data Analyst web application. Users can upload any Excel (`.xlsx`, `.xls`) or CSV dataset, and the application immediately:
1. Profiles data health, distributions, correlations, and outliers.
2. Formulates an **Executive Intelligence Briefing** (Key Findings, Operational Risks, Opportunities, and Recommendations).
3. Produces **adaptive interactive charts** (Bars, Lines, Donuts, Scatter plots, and Distributions).
4. Performs **Smart Comparative Benchmarking** across products, regions, categories, or time periods.
5. Decomposes **Trends and Seasonality** with historical velocity and category momentum.
6. Flags anomalies with **Machine Learning (Isolation Forest)** and parametric Z-score filters.
7. Computes predictive **Time-Series Forecasts** using Holt-Winters Exponential Smoothing with 95% Confidence Intervals.
8. Answers complex natural language questions with **verifiable data calculations** (zero hallucinated metrics).
9. Generates **downloadable executive reports** ready to print or save as PDF.

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **📂 Smart Data Upload** | Seamlessly ingests Excel (`.xlsx`, `.xls`) and CSV files. Features multi-sheet detection, delimiter autodetection, and robust date/currency parsing. |
| **🔍 Deep Profiling** | Instant analysis of dimensions, null percentages, duplicate detection, IQR statistical outliers, descriptive metrics, and Pearson correlation matrices. |
| **🤖 Zero-Hallucination AI Analyst** | Natural language queries are resolved through safe, sandboxed Pandas execution. Each response includes a verified **Calculation Proof** showing the exact computation. |
| **📊 Adaptive Visualizations** | Automatically configures appropriate visual representations (Recharts) adapted to your dataset's columns without manual setup. |
| **⚖️ Smart Comparisons** | Side-by-side benchmarking of any two groups or time periods with absolute variance, percentage differences, and dominant leader highlights. |
| **📈 Trend & Seasonality** | Evaluates historical momentum, peak/trough inflection points, calendar effects, and accelerating/declining segment momentum. |
| **🚨 Anomaly Detection** | Combines unsupervised **Isolation Forest** multivariate scoring with univariate Z-scores to pinpoint operational irregularities. |
| **🔮 Time-Series Forecasting** | Employs Holt-Winters models to project future trajectory with configurable horizons and 95% prediction intervals. |
| **💡 Actionable Recommendations** | Converts statistical findings into prioritized business initiatives with quantified rationale and expected impact. |
| **🧠 Conversational Memory** | Context-aware chat session allows seamless follow-up questions and drill-downs. |
| **📋 Executive Briefings** | Synthesizes complex tables into high-level C-suite summaries, health ratings, and risk matrices. |
| **📄 Exportable Reports** | 1-click printable and PDF-ready executive briefs plus raw JSON export. |
| **🔐 Enterprise Privacy** | 100% in-memory processing. Datasets are purged upon session expiry; API keys are never stored on the server. |

---

## 🏢 Adaptable Across Business Domains

DataPilot AI dynamically detects and adapts to diverse domain schemas:
- **🛒 E-Commerce & Retail:** Orders, regional margins, product categories, discounting strategies, and unit profitability.
- **📈 SaaS & Subscription:** Monthly Recurring Revenue (MRR), cohort churn rates, ARPU, Customer Acquisition Cost (CAC), and LTV.
- **🚚 Supply Chain & Inventory:** Warehouse stock levels, lead-time variances, defect rates, backorders, and holding costs.
- **👥 HR & Workforce:** Department compensation, tenure distribution, job satisfaction ratings, and employee attrition probabilities.
- **💼 Finance & Marketing:** Campaign conversions, expense distributions, and cash flow trajectories.

Four production-grade sample datasets are included in `sample_data/` for immediate 1-click testing.

---

## 🏗️ Architecture & Technology Stack

```
datapilot-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application & SPA static server
│   │   ├── api/                        # REST endpoint routers (upload, analysis, chat, etc.)
│   │   └── core/
│   │       ├── calculation_engine.py   # Sandboxed AST-safe Pandas execution engine
│   │       ├── data_profiler.py        # Schema inference & statistical profiler
│   │       ├── anomaly_engine.py       # Isolation Forest & Z-score detector
│   │       ├── forecasting_engine.py   # Holt-Winters & trend forecaster
│   │       ├── trend_engine.py         # Seasonality & momentum decomposition
│   │       ├── business_intelligence.py# Recommendations & executive briefings
│   │       └── llm_service.py          # Grounded AI analyst (offline/online)
│   └── tests/                          # Automated unit and E2E integration test suites
├── frontend/
│   ├── src/
│   │   ├── components/                 # Modern SaaS UI components (Recharts, Tailwind v4)
│   │   ├── services/api.ts             # Typed API client
│   │   └── App.tsx                     # Main state & workspace controller
│   ├── package.json
│   └── vite.config.ts
├── sample_data/                        # Preloaded benchmark CSV datasets
├── run.py                              # Unified 1-command server launcher
├── Dockerfile                          # Multi-stage production container
├── docker-compose.yml                  # Docker Compose orchestrator
├── requirements.txt                    # Python dependencies
└── .env.example                        # Configuration template
```

---

## ⚡ Quickstart & Setup

### Prerequisites
- **Python 3.12+**
- **Node.js 20+** and **npm** (only required if building frontend from source)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/datapilot-ai.git
cd datapilot-ai

# Install Python backend dependencies
pip install -r requirements.txt

# Install frontend dependencies and build assets
cd frontend
npm install
npm run build
cd ..
```

### 2. Configure Environment (Optional)

```bash
cp .env.example .env
```

> **Note:** DataPilot AI runs **100% out-of-the-box with zero API keys** using its built-in deterministic calculation engine! If you wish to use Google Gemini or OpenAI for freeform chat, add your keys to `.env` or set them in the in-app Settings modal.

### 3. Launch the Application

```bash
python run.py
```

Open your browser at:
- **Web Application:** [http://localhost:8000](http://localhost:8000)
- **Interactive API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
docker compose up --build
```
Access the application at `http://localhost:8000`.

### Using Standalone Docker

```bash
docker build -t datapilot-ai .
docker run -p 8000:8000 --env-file .env.example datapilot-ai
```

---

## 🌐 Public Cloud Deployment Guide

### Deploy to Render
1. Create a **New Web Service** connected to your GitHub repository.
2. Select **Docker** environment.
3. Render will automatically detect the root `Dockerfile`.
4. Set Port to `8000` (or leave default `PORT` environment variable).
5. Click **Deploy**.

### Deploy to Railway / Fly.io / GCP Cloud Run
DataPilot AI includes a containerized multi-stage `Dockerfile` with healthcheck hooks:
- **Railway:** Connect repo -> Railway auto-builds Dockerfile -> Expose port 8000.
- **Google Cloud Run:**
  ```bash
  gcloud run deploy datapilot-ai --source . --port 8000 --allow-unauthenticated
  ```

---

## 🧪 Verification & Testing

DataPilot AI includes automated end-to-end integration tests that exercise all 12 analytical engines and HTTP endpoints:

```bash
# Run unit & engine verification test
python -m backend.tests.test_backend

# Run live E2E pipeline integration test
python -m backend.tests.test_e2e_pipeline
```

---

## 🔐 Security & Privacy

- **No Permanent Data Storage:** Uploaded files and in-memory session frames are stored temporarily with automated TTL cleanup.
- **Sandboxed Execution:** Calculations submitted by users or generated by LLMs pass through an Abstract Syntax Tree (AST) validator that prohibits dangerous imports (`os`, `sys`, `subprocess`, file writing, or network access).
- **Client-Side Key Protection:** API keys entered via the web interface remain strictly within `localStorage` and are never persisted in backend databases.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
