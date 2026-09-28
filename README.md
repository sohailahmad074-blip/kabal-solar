# ☀️ SolarCraft ERP - Solar Shop Management System

[![Deploy to GitHub Pages](https://github.com/actions/workflows/deploy.yml/badge.svg)](https://github.com)
[![React 19](https://img.shields.io/badge/React-19.0.1-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2.3-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> An all-in-one Enterprise Resource Planning (ERP) and Point of Sale (POS) system engineered specifically for Solar Energy shops, installers, and renewable distributors.

---

## 🚀 Key Features

- **⚡ 1-Second Laptop & Mobile Real-Time Sync**: Instant cross-device live synchronization. Updates made on your laptop reflect on mobile workers' devices in real time with zero delay.
- **📄 Invoicing & Quotations**: Generate professional solar invoices, estimates, and formal proforma quotations.
- **🖨️ Multi-Format Printing**: One-click thermal POS receipt (80mm / 58mm) and crisp formal A4 company letterhead PDF layouts with tax, discount, and bank details.
- **📦 Solar Inventory & Barcode Scanning**: Track Solar PV Panels, Inverters, Lithium/Tubular Batteries, Wires, and Balance of System (BOS) components with real-time stock alerts.
- **🧮 Built-in Solar PV Sizing Calculator**: Calculate daily wattage, required panel capacity, solar inverter sizing, battery backup hours, and cable specs directly inside the ERP.
- **👥 Customer & Supplier Management**: Full CRM with balance tracking, ledger histories, and 1-click WhatsApp invoice dispatch.
- **💰 Multi-Currency & Localization**: Out-of-the-box support for PKR (₨), USD ($), EUR (€), GBP (£), AED, SAR, and customized tax rates.
- **🔒 Offline-First & Resilient**: Local storage persistence coupled with server relay and Firebase cloud synchronization so your business never stops.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti
- **Build Tool**: Vite 6
- **Server / Relay**: Node.js, Express, TSX
- **Database / Cloud Sync**: Dual-engine (High-Speed Local/Server Relay + Firebase Firestore)
- **Deployment**: GitHub Actions, GitHub Pages, Vercel, Netlify, Docker

---

## 📦 Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/solarcraft-erp.git
cd solarcraft-erp
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start local development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploy to GitHub Pages (Automatic CI/CD)

This repository includes a pre-configured GitHub Actions workflow in `.github/workflows/deploy.yml`.

### Step 1: Push code to your GitHub repository
```bash
git remote add origin https://github.com/<your-username>/solarcraft-erp.git
git branch -M main
git push -u origin main
```

### Step 2: Enable GitHub Pages in your Repository Settings
1. Go to your repository on GitHub.
2. Click **Settings** ➔ **Pages** (under the "Code and automation" section).
3. Under **Build and deployment** ➔ **Source**, select **GitHub Actions**.
4. That's it! GitHub Actions will automatically build and publish your site at:
   `https://<your-username>.github.io/solarcraft-erp/`

---

## 🚢 Alternative 1-Click Deployments

### Vercel
1. Import your GitHub repository in [Vercel](https://vercel.com).
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Click **Deploy**.

### Netlify
1. Import your GitHub repository in [Netlify](https://netlify.com).
2. Build Command: `npm run build`
3. Publish Directory: `dist`
4. Click **Deploy Site**.

---

## 📁 Project Structure

```text
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated GitHub Pages CI/CD workflow
├── src/
│   ├── components/
│   │   ├── billing/            # Invoicing, thermal receipts, quotation generator
│   │   ├── customers/          # CRM, client ledger, contact profiles
│   │   ├── inventory/          # Solar panels, inverters, stock movements
│   │   ├── purchasing/         # Purchase orders & supplier bills
│   │   ├── solar-calculator/   # Solar PV load calculator & sizing estimator
│   │   └── sync/               # 1-second real-time cross-device sync modal & QR pairing
│   ├── services/               # Cloud sync, relay client, export/import utilities
│   ├── types.ts                # TypeScript domain models
│   ├── App.tsx                 # Core ERP workspace & layout
│   └── main.tsx                # Entry point
├── server.ts                   # Express server & sub-second live sync relay
├── vite.config.ts              # Vite bundling configuration with relative base path
└── package.json                # Project dependencies & scripts
```

---

## 📄 License

This project is licensed under the MIT License - feel free to use and customize for your business.
