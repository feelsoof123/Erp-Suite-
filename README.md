<div align="center">

# 🏢 Enterprise Business Document ERP Suite

**A complete, offline-first, A4-perfect Business Document Generation System**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-feelsoof123.github.io-174a83?style=for-the-badge)](https://feelsoof123.github.io/Erp-Suite-/)
[![Version](https://img.shields.io/badge/Version-2.2.0--multipage-059669?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/License-All_Rights_Reserved-dc2626?style=for-the-badge)](#)
[![No Dependencies](https://img.shields.io/badge/Dependencies-Zero_(Vanilla_JS)-f59e0b?style=for-the-badge)](#)

> **Created & Maintained by:** [Shaiekh Fielsouf Ansari](https://github.com/feelsoof123) · `feelsoof123`

</div>

---

## 📋 Overview

A complete, responsive, enterprise-grade **15-in-1 Commercial Business Document, HR & Management ERP System** built with pure HTML5, CSS3, and modern Vanilla JavaScript — zero frameworks, zero dependencies.

| ✅ Feature | Detail |
|---|---|
| 🖥️ Works Offline | 100% client-side, no server required |
| 💾 Auto-Save | All data saved in `localStorage` automatically |
| 🖨️ A4 Print Perfect | Single-page guaranteed, no cutoffs |
| 📱 Fully Responsive | Desktop, Tablet & Mobile optimized |
| 🔒 Private | No data ever sent to any server |
| ⚡ Fast | Instant load, no build step needed |

---

## 📁 Project File Tree

```
Erp-Suite-/
│
├── 📄 index.html               ← Dashboard / Main Hub (all modules linked here)
├── 📄 quotation.html           ← Quotation / Price Estimate Maker
├── 📄 invoice.html             ← Tax / Sales Invoice Generator
├── 📄 proforma-invoice.html    ← Proforma Invoice (International Trade)
├── 📄 purchase-order.html      ← Purchase Order (PO) for Vendors
├── 📄 delivery-challan.html    ← Delivery Challan / Dispatch Note
├── 📄 fbr-invoice.html         ← FBR Tax Invoice (Pakistan NTN/STRN)
│
├── 📄 production.html          ← Production / Job Card Management
├── 📄 inventory.html           ← Inventory / Stock Management
├── 📄 crm.html                 ← CRM / Leads & Customer Pipeline
├── 📄 accounts.html            ← Accounts / Payment Ledger
├── 📄 salary-slip.html         ← Employee Salary Slip & Payroll
├── 📄 expense-voucher.html     ← Business Expense Voucher & Approval
├── 📄 cash-receipt.html        ← Cash Receipt / Payment Raseed
├── 📄 cheque-print.html        ← Bank Cheque Printing & Counterfoil
├── 📄 attendance-sheet.html    ← Monthly Staff Attendance Register
│
├── 🎨 erp-style.css            ← Global Stylesheet (A4, Print, Responsive)
├── ⚙️  erp-core.js              ← Core Engine (all logic, rendering, state)
│
├── 🖼️  favicon.ico              ← Browser Tab Icon (ICO format, all sizes)
├── 🖼️  favicon.png              ← High-res PNG Favicon (64×64)
├── 🖼️  apple-touch-icon.png     ← iOS Home Screen Icon (180×180)
├── 🖼️  og-image.png             ← Open Graph / Social Share Preview (1200×630)
│
├── 📄 404.html                 ← GitHub Pages Custom 404 Error Page
├── 📄 .nojekyll                ← Disables Jekyll (required for GitHub Pages)
└── 📄 README.md                ← This file
```

---

## 🌟 Modules & Features

### 📄 1. Quotation Maker (`quotation.html`)
- Commercial estimate generation with auto-numbering (`QT-001`, `QT-002` …)
- Validity date tracking, client contact directory, and itemized line items
- **📎 Attachment Engine:** Attach images, drawings, and spec sheets — prints as a professional Annexure page (only when attachments exist — no blank extra page)
- **⚡ 1-Click Convert to Tax Invoice** — promotes approved quotation instantly

### 🧾 2. Tax / Sales Invoice (`invoice.html`)
- Official Tax / Commercial invoice with auto-numbering (`INV-001`)
- **Payment Badges:** `UNPAID` 🔴 · `PARTIAL` 🟡 · `PAID` 🟢
- Advance tracking, balance due auto-calculation, bank wire instructions (IBAN)
- **⚡ 1-Click Convert to Delivery Challan**

### 📋 3. Proforma Invoice (`proforma-invoice.html`)
- International trade / pre-shipment invoice (`PI-001`)
- Expiry date, country of origin, trade terms (FOB / CIF / Ex-Works)
- SWIFT code + IBAN for international wire payments
- **⚡ 1-Click Convert to Final Tax Invoice**

### 📦 4. Purchase Order (`purchase-order.html`)
- Formal vendor PO with auto-numbering (`PO-001`)
- Supplier directory integration, delivery deadline, ship-to warehouse routing
- Dual approval signatures: *Prepared By* & *Approved / Authorized By*

### 🚚 5. Delivery Challan / Dispatch Note (`delivery-challan.html`)
- Dispatch management with auto-numbering (`DC-001`)
- Vehicle number, driver contact, carrier / bilty tracking number
- Toggle to show/hide monetary values on dispatch copies
- Dual signatures: *Dispatched By (Warehouse)* & *Received In Good Condition (Consignee)*

### 🧾 6. FBR Tax Invoice (`fbr-invoice.html`)
- Pakistan Federal Board of Revenue compliant invoice
- NTN / STRN fields, Sales Tax (17%) auto-calculation
- FBR QR placeholder for POS integration

### 🏭 7. Production / Job Card (`production.html`)
- Job Card management with Kanban-style stage tracking
- Stages: Queued → Material Prep → In Production → Quality Check → Completed
- Bill of Materials (BOM), supervisor assignment, priority levels

### 📊 8. Management Modules
| Module | File | Description |
|---|---|---|
| 📦 Inventory | `inventory.html` | Stock levels, SKU, reorder alerts, in/out logs |
| 👥 CRM | `crm.html` | Leads pipeline, follow-up dates, deal values, stage tracking |
| 💰 Accounts | `accounts.html` | Payment receipts, payment ledger, party-wise history |

### 👔 9. HR & Finance Modules
| Module | File | Description |
|---|---|---|
| 👨‍💼 Salary Slip | `salary-slip.html` | Employee payroll slip with earnings, deductions & net pay |
| 🧾 Expense Voucher | `expense-voucher.html` | Business expense tracking with approval status & line items |
| 💵 Cash Receipt | `cash-receipt.html` | Payment raseed with amount in words & balance tracking |
| 🏦 Cheque Printing | `cheque-print.html` | Pakistani bank cheque printing with A/C Payee & counterfoil |
| 📅 Attendance Sheet | `attendance-sheet.html` | Monthly staff attendance, leave, late & overtime register |

---

## 🔧 Advanced Calculation Engines

### 📐 Area Calculation Mode (Width × Height)
Perfect for glass, marble, woodwork, doors, windows, construction:
- **Units Supported:** Inches (`in`) · Feet (`ft`) · Millimeters (`mm`)
- Auto-converts to **Square Feet (Sq. Ft.)**
- Formula: `1-piece area × number of pieces × rate = line total`

### 🏷️ Dual Pricing Mode
- **Manual Mode:** `Unit Qty × Item Qty = Total Qty`
- **Auto-calculate:** Subtotal → Discount → Tax → Total

---

## 🖨️ Print System — Technical Notes

| Feature | Detail |
|---|---|
| Page Size | A4 Portrait — `@page { size: A4 portrait; margin: 8mm 10mm; }` |
| Color Accuracy | `-webkit-print-color-adjust: exact` — colors print true |
| Single Page Fit | Auto-compact mode triggers when items overflow |
| Attachment Page | Only prints when attachments exist (blank 2nd page bug fixed ✅) |
| FBR / Multi-copy | Specific modules support multi-copy print layouts |

---

## 🌐 How to Deploy on GitHub Pages

> This project is designed for GitHub Pages — zero build step, upload and go.

### Step 1 — Create Repository
1. Go to [github.com/new](https://github.com/new)
2. Name it `Erp-Suite-` (to match the live URL)
3. Set visibility to **Public**
4. **Do NOT** initialize with README (you already have one)

### Step 2 — Upload All Files
Upload every file from this folder. **Critical files that must be present:**

| File | Why It's Required |
|---|---|
| `.nojekyll` | Without this, GitHub Pages ignores files starting with `_` |
| `favicon.ico` | Browser tab icon — must be in root |
| `favicon.png` | High-res PNG fallback favicon |
| `apple-touch-icon.png` | iPhone/iPad home screen icon |
| `og-image.png` | WhatsApp / social media share preview image |
| `404.html` | Custom error page for broken links |
| `erp-core.js` | The entire application logic lives here |
| `erp-style.css` | All styling — missing this = broken layout |

### Step 3 — Enable GitHub Pages
1. Go to **Settings** → **Pages** (left sidebar under *Code and automation*)
2. Under **Build and deployment** → **Source** → select **Deploy from a branch**
3. Under **Branch** → select `main` → folder `/ (root)` → click **Save**

### Step 4 — Live! 🎉
Within **1–2 minutes** your site is live at:
```
https://feelsoof123.github.io/Erp-Suite-/
```

---

## 📱 Responsive Design

| Device | Behavior |
|---|---|
| 🖥️ Desktop / Laptop | Side-by-side: Editor Panel (left) + Live A4 Preview (right) |
| 📱 Mobile / Tablet | Sticky switcher: `✏️ Edit Details` / `👁️ Document Preview` |
| 📱 Fit-to-Screen | `📱 Fit to Screen` button zooms document to screen width |
| 🍎 iOS Safari | Font-size 16px on inputs — prevents auto-zoom on focus |

---

## 🔐 Data Privacy & Security

- **Zero Server Communication** — All data stays in your browser's `localStorage`
- **No Analytics, No Trackers** — Pure static HTML, no external requests
- **Backup / Restore** — Export your data as a JSON backup file anytime
- **Share Link** — Encode your document state in URL for one-click sharing

---

## 👤 Developer & Contact

<div align="center">

**Shaiekh Fielsouf Ansari**
Creator & Owner

[![GitHub](https://img.shields.io/badge/GitHub-feelsoof123-181717?style=flat-square&logo=github)](https://github.com/feelsoof123)

| Contact | Detail |
|---|---|
| 📞 Phone 1 | `0333-1255512` |
| 📞 Phone 2 / WhatsApp | `0311-1855512` |
| 💚 JazzCash | `0300-0210419` |

</div>

---

<div align="center">

*© 2026 Shaiekh Fielsouf Ansari (feelsoof123). All Rights Reserved.*

**🌐 [Live Demo](https://feelsoof123.github.io/Erp-Suite-/) · 👤 [GitHub Profile](https://github.com/feelsoof123)**

</div>
