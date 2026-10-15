# InventoryXAI 📦🤖

An intelligent, AI-powered inventory and supply chain management system featuring predictive analytics, real-time tracking, explainable AI insights, and multi-location network management.

## 🌟 Key Features

- **🤖 AI Insights & Analytics**: Real-time inventory intelligence, demand forecasting, stock anomaly detection, and automated recommendations.
- **🗺️ City Network (GIS Mapping)**: Interactive geographic mapping of multi-store networks and warehouse nodes with live metrics.
- **📦 Inventory & Stock Control**: Real-time stock level monitoring, reorder alerts, batch tracking, and movement logs.
- **🛒 Orders & Purchase Management**: Streamlined purchase orders, supplier management, and automated stock replenishment RPCs.
- **📈 Sales & Reporting**: Deep analytical dashboards with Recharts, revenue forecasting, and exportable reports.
- **⚡ Modern Tech Stack**: Fast frontend built with React 19, Vite, and Tailwind CSS, backed by Supabase (PostgreSQL with custom stored procedures and RLS security).
- **🔔 Telegram Alerts**: Automated notifications for stockouts, low inventory, and system triggers.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Recharts, React-Leaflet
- **Backend & Database**: Supabase (PostgreSQL), Stored Procedures (RPCs), Row Level Security (RLS)
- **AI Engine**: OpenRouter API / LLM-driven analytics
- **Notifications**: Telegram Bot API

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/vivekmothukuri9/InventoryXAI.git
cd InventoryXAI
```

### 2. Configure Environment Variables
Copy the `.env.example` templates and update them with your credentials:

**Root `.env`**:
```bash
cp .env.example .env
```
Fill in your Supabase credentials, RapidAPI, and Telegram keys.

**Dashboard `.env`**:
```bash
cd dashboard
cp .env.example .env
```
Fill in your `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_OPENROUTER_API_KEY`.

### 3. Setup Database Schema
Execute the SQL files in the Supabase SQL editor in order:
1. `schema.sql` (Core tables, triggers, and relations)
2. `update-rpc-security.sql` & related RPC updates
3. `mock-data.sql` / `seed-shops.sql` (Optional seed data)

### 4. Run the Dashboard
```bash
cd dashboard
npm install
npm run dev
```

The application will be live at `http://localhost:5173`.
