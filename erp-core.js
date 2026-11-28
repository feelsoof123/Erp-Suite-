const $ = id => document.getElementById(id);

const APP_CONFIG = {
  name: "Enterprise Business Document ERP Suite",
  version: "2.3.0-pwa-idb",
  storageKey: "business_document_suite_v2",
  countersKey: "biz_counters_v2",
  dbName: "ErpSuiteDB",
  storeName: "kv",
  recycleKey: "erp_recycle_bin_v1",
  lastBackupKey: "erp_last_backup_at",
  saveCountKey: "erp_save_count_v1"
};

let recycleBin = [];
let deferredInstallPrompt = null;

// Active page module is set via window.ACTIVE_MODULE (e.g., "quotation", "invoice", etc.)
const currentModule = window.ACTIVE_MODULE || "quotation";
let activeDirectoryType = "customer";

// SHARED ASSETS & COMPANY PROFILE STATE
let logoData = "";
let watermarkData = "";
let stampData = "";
let signatureData = "";
let companyState = {
  name: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  brandColor: "#174a83",
  logoData: "",
  stampData: "",
  signatureData: "",
  watermarkData: "",
  watermarkOn: true,
  watermarkMode: "image",
  watermarkText: "",
  watermarkTextColor: "#999999",
  watermarkTextSize: 55,
  watermarkOpacity: 7,
  stampOn: true,
  signatureOn: true
};

// MASTER DIRECTORIES
let customers = [];
let suppliers = [];

// MANAGEMENT MODULES STATE (SHARED IN SAME BACKUP & LOCALSTORAGE)
const PRODUCTION_STAGES = ["Queued", "Material Prep", "In Production", "Quality Check", "Completed"];
function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}
function createDefaultManagementData() {
  const today = getTodayIso();
  return {
    inventory: [
      { id: "inv_1", sku: "SKU-001", name: "Standard Commercial Product A", category: "General", unit: "Pcs", qty: 45, reorderLevel: 10, costPrice: 1200, sellPrice: 1800, warehouse: "Main Warehouse" },
      { id: "inv_2", sku: "SKU-002", name: "Heavy Duty Packaging Carton", category: "Supplies", unit: "Carton", qty: 6, reorderLevel: 10, costPrice: 350, sellPrice: 500, warehouse: "Store Room" }
    ],
    inventoryLogs: [],
    docHistory: [],
    accounts: [
      { id: "acc_1", date: today, type: "receipt", partyType: "customer", partyName: "Valued Customer", method: "Bank Transfer", refNo: "INV-001", amount: 25000, notes: "Sample advance payment receipt" }
    ],
    crmLeads: [
      { id: "crm_1", name: "Al-Noor Enterprises", phone: "0300-1234567", email: "", city: "Lahore", dealTitle: "Annual Supply Quotation", value: 120000, stage: "Quotation Sent", followUpDate: today, notes: "Initial inquiry received; quotation shared." }
    ],
    productionJobs: [
      {
        id: "job_1",
        jobNumber: "JC-001",
        startDate: today,
        targetDate: "",
        refNo: "QT-001",
        clientName: "Valued Customer",
        clientPhone: "",
        productName: "Custom Commercial Order Batch",
        orderQty: 10,
        orderUnit: "Pcs",
        priority: "Normal",
        stage: "In Production",
        supervisor: "Production Supervisor",
        notes: "1. Verify raw material quality before cutting.\n2. Inspect finished dimensions against approved drawing.",
        bom: [
          { material: "Primary Raw Material", qty: 10, unit: "Units", cost: 850 },
          { material: "Finishing & Packaging Material", qty: 10, unit: "Pcs", cost: 150 }
        ]
      }
    ],
    activeProductionId: "job_1"
  };
}
let managementData = createDefaultManagementData();

// PER-MODULE DEFAULT DATA
const moduleData = {
  quotation: {
    number: "",
    date: "",
    validUntil: "",
    clientName: "Valued Customer",
    attachments: [],
    clientPhone: "",
    clientAddress: "",
    items: [{ description: "High Quality Business Solution / Service", unit: "Pcs", unitQty: 1, itemQty: 1, calcMode: "manual", rate: 15000 }],
    discount: 0,
    tax: 0,
    terms: "1. Prices are valid for 15 days from quote date.\n2. 50% advance payment upon confirmation.\n3. Delivery within agreed timeline."
  },
  invoice: {
    number: "",
    date: "",
    dueDate: "",
    refNo: "",
    poNumber: "",
    status: "UNPAID",
    amountPaid: 0,
    clientName: "Valued Customer",
    clientPhone: "",
    clientAddress: "",
    bankDetails: "Bank: Meezan Bank Ltd\nAccount Title: Your Business Name\nIBAN / A/C: PK00MEZN00001234567890",
    items: [{ description: "Commercial Products / Delivery Services", unit: "Pcs", unitQty: 1, itemQty: 1, calcMode: "manual", rate: 25000 }],
    discount: 0,
    tax: 0,
    terms: "1. Payment is due within 15 days of invoice date.\n2. Please mention invoice number in wire transfer.\n3. Thank you for your business!"
  },
  fbr: {
    number: "",
    date: "",
    dueDate: "",
    fiscalNumber: "110045-261126-0001",
    posId: "110045",
    sellerNtn: "1234567-8",
    sellerStrn: "32-77-8761-001-11",
    invoiceType: "Sales Tax Invoice",
    paymentMode: "Cash / Bank Transfer",
    clientName: "Valued Customer",
    clientPhone: "",
    buyerNtn: "",
    clientAddress: "",
    posFee: 1,
    items: [{ description: "Taxable Commercial Goods / Services", unit: "Pcs", unitQty: 1, itemQty: 1, calcMode: "manual", rate: 25000 }],
    discount: 0,
    tax: 18,
    furtherTax: 0,
    terms: "1. Formatted for FBR POS / Digital Sales Tax Invoicing.\n2. Sales Tax & Further Tax calculated as per applicable rate.\n3. Scan the QR code to verify fiscal invoice metadata."
  },
  purchaseOrder: {
    number: "",
    date: "",
    deliveryDate: "",
    paymentTerms: "Net 30 Days",
    supplierName: "Vendor / Supplier Partner",
    supplierPhone: "",
    supplierAddress: "",
    shipTo: "Company Main Warehouse / Office Address",
    items: [{ description: "Raw Material / Office Supplies / Equipment", unit: "Units", unitQty: 1, itemQty: 5, calcMode: "manual", rate: 4500 }],
    discount: 0,
    tax: 0,
    terms: "1. Goods must be delivered in pristine condition.\n2. Packing slip & PO reference required with delivery.\n3. Defective items will be returned immediately."
  },
  deliveryChallan: {
    number: "",
    date: "",
    refNo: "INV-001",
    clientName: "Consignee / Customer Name",
    clientPhone: "",
    clientAddress: "Delivery Destination / Site Address",
    vehicleNo: "LES-24-9840",
    driverInfo: "Muhammad Aslam (0300-1122334)",
    biltyNo: "TCS / Leopard # 984512",
    showPrices: false,
    items: [{ description: "Dispatched Commercial Consignment", unit: "Carton", unitQty: 1, itemQty: 10, calcMode: "manual", rate: 2500 }],
    terms: "1. Goods received in sound condition and exact quantity.\n2. Any discrepancy must be reported within 24 hours of receipt."
  },
  proformaInvoice: {
    number: "",
    date: "",
    expiryDate: "",
    tradeTerms: "Ex-Works / 100% Advance",
    origin: "Pakistan",
    clientName: "International / Corporate Buyer",
    clientPhone: "",
    clientAddress: "",
    bankDetails: "Bank: Standard Chartered / Meezan Bank\nSWIFT: SCBLPKKA\nIBAN: PK36SCBL0000001234567801\nBeneficiary: Your Business Name",
    items: [{ description: "Export / Wholesale Consignment", unit: "Lot", unitQty: 1, itemQty: 1, calcMode: "manual", rate: 50000 }],
    discount: 0,
    tax: 0,
    terms: "1. This proforma invoice is valid for 20 days.\n2. Production will commence upon confirmation of wire transfer.\n3. Freight & customs duties as per trade terms."
  },
  // ===== SALARY SLIP MODULE =====
  salary: {
    number: "",
    month: "",
    payDate: "",
    empName: "Muhammad Ali",
    empId: "EMP-001",
    designation: "Staff",
    dept: "General",
    doj: "",
    bankAc: "",
    basic: 30000,
    hra: 0,
    conveyance: 0,
    medical: 0,
    special: 0,
    overtime: 0,
    taxDeduct: 0,
    eobi: 0,
    pessi: 0,
    advance: 0,
    otherDeduct: 0,
    payMethod: "Bank Transfer",
    items: [],
    discount: 0,
    tax: 0,
    terms: "This salary slip is a confidential document. Please retain for your records."
  },
  // ===== EXPENSE VOUCHER MODULE =====
  expense: {
    number: "",
    date: "",
    refNo: "",
    status: "APPROVED",
    empName: "Muhammad Usman",
    empId: "EMP-004",
    dept: "Admin",
    costCenter: "Head Office",
    payMethod: "Cash",
    paidTo: "",
    approvedBy: "",
    items: [{ description: "Office Stationery & Supplies", unit: "Lot", unitQty: 1, itemQty: 1, calcMode: "manual", rate: 2500 }],
    discount: 0,
    tax: 0,
    terms: "Expenses incurred for official business purposes. All receipts attached."
  },
  // ===== CASH RECEIPT / RASEED MODULE =====
  receipt: {
    number: "",
    date: "",
    mode: "Cash",
    ref: "",
    from: "Walk-in Customer / Party",
    phone: "",
    address: "",
    amount: 10000,
    balance: 0,
    purpose: "Payment received against goods / services.",
    receivedBy: "Cashier",
    items: [],
    discount: 0,
    tax: 0,
    terms: "Thank you for your business. Please keep this receipt for your records."
  },
  // ===== CHEQUE PRINTING MODULE =====
  cheque: {
    number: "",
    date: "",
    bank: "HBL (Habib Bank Limited)",
    payee: "Al-Noor Traders",
    amount: 50000,
    acPayee: true,
    blankMode: false,
    accountNo: "",
    items: [],
    discount: 0,
    tax: 0,
    terms: "Payment against supplier invoice / order."
  },
  // ===== ATTENDANCE SHEET MODULE =====
  attendance: {
    number: "",
    month: "",
    dept: "All Staff",
    workDays: 26,
    supervisor: "HR Manager",
    staff: [
      { name: "Muhammad Ali", designation: "Accountant", present: 25, absent: 1, leave: 0, late: 1, ot: 4 },
      { name: "Usman Tariq", designation: "Sales Executive", present: 24, absent: 0, leave: 2, late: 0, ot: 2 },
      { name: "Bilal Ahmed", designation: "Technician", present: 26, absent: 0, leave: 0, late: 2, ot: 8 }
    ],
    items: [],
    discount: 0,
    tax: 0,
    terms: "Monthly attendance verified for payroll processing."
  }
};


// QUOTATION ATTACHMENTS ENGINE
function getQuotationAttachments() {
  const q = moduleData.quotation;
  if (!q) return [];
  if (!Array.isArray(q.attachments)) q.attachments = [];
  return q.attachments;
}

function renderQuotationAttachmentsEditor() {
  const host = $("quoteAttachmentsList");
  if (!host) return;
  const list = getQuotationAttachments();
  if (!list.length) {
    host.innerHTML = "<p style='font-size:11.5px;color:#64748b;margin:8px 0 0;'>No attachments added yet. Attach images (PNG/JPG/WEBP) or reference files to include with this quotation.</p>";
    return;
  }
  host.innerHTML = list.map((att, idx) => {
    const isImg = att.dataUrl && att.dataUrl.startsWith("data:image/");
    const sizeKb = att.size ? (att.size / 1024).toFixed(1) + " KB" : "";
    return `
      <div class="item-editor" style="margin-top:8px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div style="min-width:0;">
            <div style="font-size:12px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📎 ${safeText(att.name || "Attachment " + (idx + 1))}</div>
            <div style="font-size:10.5px;color:#64748b;">${safeText(att.type || "File")} ${sizeKb ? "• " + sizeKb : ""}</div>
          </div>
          <button type="button" class="btn-danger" data-remove-att="${idx}" style="margin-top:0;padding:5px 10px;font-size:11px;">Remove</button>
        </div>
        ${isImg ? `<div style="margin-top:8px;"><img src="${att.dataUrl}" alt="${safeText(att.name)}" style="max-width:100%;max-height:95px;border-radius:4px;border:1px solid #cbd5e1;object-fit:contain;background:#fff;"></div>` : `<div style="margin-top:6px;font-size:11px;color:#475569;">Non-image file attached (listed in quotation annexure).</div>`}
        <label style="margin-top:6px;">Caption / Note (Optional)</label>
        <input type="text" data-att-caption="${idx}" value="${safeText(att.caption || "")}" placeholder="e.g. Layout / Spec sheet / Reference">
      </div>
    `;
  }).join("");
}

function ensureAttachmentPagePrintStyles() {
  if ($("quoteAttachmentPageStyle")) return;
  const st = document.createElement("style");
  st.id = "quoteAttachmentPageStyle";
  st.textContent = `
    .attachment-sheet {
      width: 100%;
      max-width: 820px;
      min-height: 1060px;
      margin: 22px auto 0;
      padding: 34px 40px;
      background: #ffffff;
      box-shadow: 0 4px 22px rgba(0,0,0,0.08);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    @media (max-width: 991px) {
      .attachment-sheet { min-width: 760px; }
    }
    @media print {
      .paper-viewport {
        display: block !important;
      }
      /* ✅ FIX: Sirf tab print-page show ho jab attachment-sheet:not(:empty) ho.
         display:flex !important hata diya — ab DOM se remove hone ke baad
         koi blank 2nd page nahi aayegi. */
      .attachment-sheet:not(:empty) {
        display: flex !important;
        visibility: visible !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        min-height: calc(297mm - 24mm) !important;
        margin: 0 auto !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        break-before: page !important;
        page-break-before: always !important;
      }
      .attachment-sheet:empty {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        page-break-before: avoid !important;
        break-before: avoid !important;
      }
    }
  `;
  document.head.appendChild(st);
}

function renderQuotationAttachmentsPreview() {
  ensureAttachmentPagePrintStyles();
  const q = moduleData.quotation;
  const list = (currentModule === "quotation" && q && Array.isArray(q.attachments)) ? q.attachments : [];
  const vp = $("paperViewport");
  if (vp) {
    vp.style.flexDirection = "column";
    vp.style.alignItems = "center";
  }

  let sheet = $("pQuoteAttachmentsPage");

  // ✅ FIX: Agar koi attachment nahi, to sheet DOM se poori tarah hata do.
  // display:none kafi nahi — print CSS mein !important se flex show ho jata tha,
  // jis se blank 2nd page print hoti thi.
  if (!list.length) {
    if (sheet) {
      sheet.innerHTML = "";
      sheet.remove();
    }
    return;
  }

  if (!sheet && vp) {
    sheet = document.createElement("div");
    sheet.id = "pQuoteAttachmentsPage";
    sheet.className = "attachment-sheet";
    vp.appendChild(sheet);
  }
  if (!sheet) return;

  sheet.style.display = "flex";
  const quoteNo = safeText((q && q.number) || "QT-001");
  const quoteDate = safeText((q && q.date) || "");
  const clientName = safeText((q && q.clientName) || "Valued Customer");
  const companyName = safeText(($("companyName") && $("companyName").value.trim()) || "YOUR COMPANY NAME");

  const cards = list.map((att, idx) => {
    const isImg = att.dataUrl && att.dataUrl.startsWith("data:image/");
    return `
      <div style="border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:#f8fafc;break-inside:avoid;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
          <div style="font-size:12px;font-weight:700;color:#0f172a;">📎 ${idx + 1}. ${safeText(att.name || "Attachment")}</div>
          <span style="font-size:10px;color:#64748b;background:#e2e8f0;padding:2px 8px;border-radius:999px;">Annexure ${idx + 1}</span>
        </div>
        ${att.caption ? `<div style="font-size:11.5px;color:#334155;margin-bottom:8px;">${safeText(att.caption)}</div>` : ""}
        ${isImg
          ? `<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center;"><img src="${att.dataUrl}" alt="${safeText(att.name)}" style="max-width:100%;max-height:360px;object-fit:contain;"></div>`
          : `<div style="font-size:11px;color:#475569;padding:12px;background:#ffffff;border:1px dashed #cbd5e1;border-radius:6px;">Attached Reference Document: <strong>${safeText(att.name)}</strong> (${safeText(att.type || "Document")})</div>`
        }
      </div>
    `;
  }).join("");

  sheet.innerHTML = `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2.5px solid var(--primary);padding-bottom:12px;margin-bottom:16px;gap:12px;">
        <div>
          <div style="font-size:18px;font-weight:800;color:var(--primary);">${companyName}</div>
          <div style="font-size:11.5px;color:#64748b;margin-top:2px;">Prepared For: <strong>${clientName}</strong></div>
        </div>
        <div style="text-align:right;">
          <span style="background:var(--primary);color:#fff;font-size:12px;font-weight:800;letter-spacing:1.4px;padding:4px 12px;border-radius:4px;display:inline-block;">QUOTATION ANNEXURE</span>
          <div style="font-size:11px;color:#475569;margin-top:5px;">Ref Quote #: <strong>${quoteNo}</strong> ${quoteDate ? `| Date: <strong>${quoteDate}</strong>` : ""}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${cards}
      </div>
    </div>
    <div style="border-top:1px dashed #cbd5e1;padding-top:8px;margin-top:16px;display:flex;justify-content:space-between;font-size:10px;color:#64748b;">
      <span>Attachment Page — Reference for Quotation ${quoteNo}</span>
      <span>Page 2 (Annexure)</span>
    </div>
  `;
}

function ensureQuotationAttachmentUI() {
  if (currentModule !== "quotation" || !$("panel-financials")) return;
  if ($("panel-quote-attachments")) return;
  const sec = document.createElement("section");
  sec.className = "panel";
  sec.id = "panel-quote-attachments";
  sec.innerHTML = `
    <h3>
      <span>Quotation Attachments</span>
      <span style="font-size:10.5px;color:#64748b;font-weight:600;">Included in Preview & Print</span>
    </h3>
    <label>Attach Files (Images / Drawings / Specs)</label>
    <input type="file" id="quoteAttachmentFiles" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt">
    <div id="quoteAttachmentsList"></div>
  `;
  $("panel-financials").parentNode.insertBefore(sec, $("panel-financials").nextSibling);

  const fileInput = $("quoteAttachmentFiles");
  fileInput.addEventListener("change", e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const list = getQuotationAttachments();
    files.forEach(file => {
      if (file.size > 1500 * 1024) {
        alert(`"${file.name}" is larger than 1.5 MB and was skipped.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        list.push({
          id: Date.now().toString() + "_" + Math.random().toString(36).slice(2, 7),
          name: file.name,
          type: file.type || "File",
          size: file.size,
          caption: "",
          dataUrl: reader.result
        });
        renderQuotationAttachmentsEditor();
        renderQuotationAttachmentsPreview();
        saveData();
      };
      reader.readAsDataURL(file);
    });
    fileInput.value = "";
  });

  const listHost = $("quoteAttachmentsList");
  listHost.addEventListener("input", e => {
    const idx = e.target.dataset.attCaption;
    if (idx === undefined) return;
    const list = getQuotationAttachments();
    if (list[Number(idx)]) {
      list[Number(idx)].caption = e.target.value;
      renderQuotationAttachmentsPreview();
      saveData();
    }
  });

  listHost.addEventListener("click", e => {
    const idx = e.target.dataset.removeAtt;
    if (idx === undefined) return;
    const list = getQuotationAttachments();
    list.splice(Number(idx), 1);
    renderQuotationAttachmentsEditor();
    renderQuotationAttachmentsPreview();
    saveData();
  });

  renderQuotationAttachmentsEditor();
}

function money(value) {
  return Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function safeText(value) {
  return String(value || "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",
    '"':"&quot;","'":"&#39;"
  })[c]);
}

function getSequenceNumber(prefix) {
  let counters = {};
  try {
    counters = JSON.parse(localStorage.getItem(APP_CONFIG.countersKey) || "{}");
  } catch(e) { counters = {}; }
  let val = (Number(counters[prefix]) || 0) + 1;
  counters[prefix] = val;
  localStorage.setItem(APP_CONFIG.countersKey, JSON.stringify(counters));
  return prefix + "-" + String(val).padStart(3, "0");
}

function initCounters() {
  if (!moduleData.quotation.number) moduleData.quotation.number = getSequenceNumber("QT");
  if (!moduleData.invoice.number) moduleData.invoice.number = getSequenceNumber("INV");
  if (!moduleData.fbr.number) moduleData.fbr.number = getSequenceNumber("FBR");
  if (!moduleData.purchaseOrder.number) moduleData.purchaseOrder.number = getSequenceNumber("PO");
  if (!moduleData.deliveryChallan.number) moduleData.deliveryChallan.number = getSequenceNumber("DC");
  if (!moduleData.proformaInvoice.number) moduleData.proformaInvoice.number = getSequenceNumber("PI");
  if (moduleData.salary && !moduleData.salary.number) moduleData.salary.number = getSequenceNumber("SAL");
  if (moduleData.expense && !moduleData.expense.number) moduleData.expense.number = getSequenceNumber("EXP");
  if (moduleData.receipt && !moduleData.receipt.number) moduleData.receipt.number = getSequenceNumber("REC");
  if (moduleData.cheque && !moduleData.cheque.number) moduleData.cheque.number = getSequenceNumber("CHQ");
  if (moduleData.attendance && !moduleData.attendance.number) moduleData.attendance.number = getSequenceNumber("ATT");
}

function numberToWordsPKR(num) {
  const n = Math.floor(Number(num) || 0);
  if (n <= 0) return "Zero Rupees Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function twoDigits(v) {
    if (v < 20) return ones[v];
    return tens[Math.floor(v / 10)] + (v % 10 ? " " + ones[v % 10] : "");
  }
  function threeDigits(v) {
    if (v === 0) return "";
    if (v < 100) return twoDigits(v);
    return ones[Math.floor(v / 100)] + " Hundred" + (v % 100 ? " " + twoDigits(v % 100) : "");
  }
  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lac");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (rest) parts.push(threeDigits(rest));
  return parts.join(" ") + " Rupees Only";
}

function renderAttendanceEditors() {
  const m = moduleData.attendance;
  const wrap = $("attStaffEditors");
  if (!m || !wrap) return;
  if (!Array.isArray(m.staff)) m.staff = [];
  if ($("attStaffCount")) $("attStaffCount").textContent = `(${m.staff.length} Staff)`;
  wrap.innerHTML = m.staff.map((s, i) => `
    <div class="item-editor" style="padding:10px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <strong style="font-size:12px;color:var(--primary);">Staff #${i + 1}</strong>
        <button type="button" class="btn-danger" data-att-remove="${i}" style="padding:2px 8px;font-size:11px;width:auto;margin:0;">✕ Remove</button>
      </div>
      <div style="display:flex;gap:8px;">
        <div style="flex:1;"><label>Name</label><input type="text" data-att-i="${i}" data-att-key="name" value="${safeText(s.name || "")}"></div>
        <div style="flex:1;"><label>Designation</label><input type="text" data-att-i="${i}" data-att-key="designation" value="${safeText(s.designation || "")}"></div>
      </div>
      <div style="display:flex;gap:6px;margin-top:4px;">
        <div style="flex:1;"><label>Present</label><input type="number" min="0" max="31" data-att-i="${i}" data-att-key="present" value="${Number(s.present) || 0}"></div>
        <div style="flex:1;"><label>Absent</label><input type="number" min="0" max="31" data-att-i="${i}" data-att-key="absent" value="${Number(s.absent) || 0}"></div>
        <div style="flex:1;"><label>Leave</label><input type="number" min="0" max="31" data-att-i="${i}" data-att-key="leave" value="${Number(s.leave) || 0}"></div>
        <div style="flex:1;"><label>Late</label><input type="number" min="0" max="31" data-att-i="${i}" data-att-key="late" value="${Number(s.late) || 0}"></div>
        <div style="flex:1;"><label>OT (Hrs)</label><input type="number" min="0" step="any" data-att-i="${i}" data-att-key="ot" value="${Number(s.ot) || 0}"></div>
      </div>
    </div>
  `).join("");
}

// SYNC FORM INPUTS WITH ACTIVE MODULE
function syncModuleInputsToState() {
  if (currentModule === "production") {
    syncProductionInputsFromState();
    return;
  }
  const m = moduleData[currentModule];
  if (!m) return;

  if (currentModule === "quotation") {
    if ($("quoteNumber")) $("quoteNumber").value = m.number || "";
    if ($("quoteDate")) $("quoteDate").value = m.date || new Date().toISOString().slice(0, 10);
    if ($("validUntil")) $("validUntil").value = m.validUntil || "";
    if ($("quoteCustomerName")) $("quoteCustomerName").value = m.clientName || "";
    if ($("quoteCustomerPhone")) $("quoteCustomerPhone").value = m.clientPhone || "";
    if ($("quoteCustomerAddress")) $("quoteCustomerAddress").value = m.clientAddress || "";
  } else if (currentModule === "invoice") {
    if ($("invoiceNumber")) $("invoiceNumber").value = m.number || "";
    if ($("invoiceDate")) $("invoiceDate").value = m.date || new Date().toISOString().slice(0, 10);
    if ($("invoiceDueDate")) $("invoiceDueDate").value = m.dueDate || "";
    if ($("invoiceRefNo")) $("invoiceRefNo").value = m.refNo || "";
    if ($("invoicePoNumber")) $("invoicePoNumber").value = m.poNumber || "";
    if ($("invoicePaymentStatus")) $("invoicePaymentStatus").value = m.status || "UNPAID";
    if ($("invoiceAmountPaid")) $("invoiceAmountPaid").value = m.amountPaid || 0;
    if ($("invoiceCustomerName")) $("invoiceCustomerName").value = m.clientName || "";
    if ($("invoiceCustomerPhone")) $("invoiceCustomerPhone").value = m.clientPhone || "";
    if ($("invoiceCustomerAddress")) $("invoiceCustomerAddress").value = m.clientAddress || "";
    if ($("invoiceBankDetails")) $("invoiceBankDetails").value = m.bankDetails || "";
  } else if (currentModule === "fbr") {
    if ($("fbrNumber")) $("fbrNumber").value = m.number || "";
    if ($("fbrDate")) $("fbrDate").value = m.date || new Date().toISOString().slice(0, 10);
    if ($("fbrDueDate")) $("fbrDueDate").value = m.dueDate || "";
    if ($("fbrFiscalNumber")) $("fbrFiscalNumber").value = m.fiscalNumber || "";
    if ($("fbrPosId")) $("fbrPosId").value = m.posId || "";
    if ($("fbrSellerNtn")) $("fbrSellerNtn").value = m.sellerNtn || "";
    if ($("fbrSellerStrn")) $("fbrSellerStrn").value = m.sellerStrn || "";
    if ($("fbrInvoiceType")) $("fbrInvoiceType").value = m.invoiceType || "Sales Tax Invoice";
    if ($("fbrPaymentMode")) $("fbrPaymentMode").value = m.paymentMode || "Cash / Bank Transfer";
    if ($("fbrCustomerName")) $("fbrCustomerName").value = m.clientName || "";
    if ($("fbrCustomerPhone")) $("fbrCustomerPhone").value = m.clientPhone || "";
    if ($("fbrBuyerNtn")) $("fbrBuyerNtn").value = m.buyerNtn || "";
    if ($("fbrCustomerAddress")) $("fbrCustomerAddress").value = m.clientAddress || "";
    if ($("fbrFurtherTax")) $("fbrFurtherTax").value = m.furtherTax || 0;
    if ($("fbrPosFee")) $("fbrPosFee").value = m.posFee ?? 1;
  } else if (currentModule === "purchaseOrder") {
    if ($("poNumber")) $("poNumber").value = m.number || "";
    if ($("poDate")) $("poDate").value = m.date || new Date().toISOString().slice(0, 10);
    if ($("poDeliveryDate")) $("poDeliveryDate").value = m.deliveryDate || "";
    if ($("poPaymentTerms")) $("poPaymentTerms").value = m.paymentTerms || "";
    if ($("poSupplierName")) $("poSupplierName").value = m.supplierName || "";
    if ($("poSupplierPhone")) $("poSupplierPhone").value = m.supplierPhone || "";
    if ($("poSupplierAddress")) $("poSupplierAddress").value = m.supplierAddress || "";
    if ($("poShipTo")) $("poShipTo").value = m.shipTo || "";
  } else if (currentModule === "deliveryChallan") {
    if ($("challanNumber")) $("challanNumber").value = m.number || "";
    if ($("challanDate")) $("challanDate").value = m.date || new Date().toISOString().slice(0, 10);
    if ($("challanRefNo")) $("challanRefNo").value = m.refNo || "";
    if ($("challanCustomerName")) $("challanCustomerName").value = m.clientName || "";
    if ($("challanCustomerPhone")) $("challanCustomerPhone").value = m.clientPhone || "";
    if ($("challanCustomerAddress")) $("challanCustomerAddress").value = m.clientAddress || "";
    if ($("challanVehicleNo")) $("challanVehicleNo").value = m.vehicleNo || "";
    if ($("challanDriverInfo")) $("challanDriverInfo").value = m.driverInfo || "";
    if ($("challanBiltyNo")) $("challanBiltyNo").value = m.biltyNo || "";
    if ($("challanShowPrices")) $("challanShowPrices").checked = Boolean(m.showPrices);
  } else if (currentModule === "proformaInvoice") {
    if ($("proformaNumber")) $("proformaNumber").value = m.number || "";
    if ($("proformaDate")) $("proformaDate").value = m.date || new Date().toISOString().slice(0, 10);
    if ($("proformaExpiryDate")) $("proformaExpiryDate").value = m.expiryDate || "";
    if ($("proformaTradeTerms")) $("proformaTradeTerms").value = m.tradeTerms || "";
    if ($("proformaOrigin")) $("proformaOrigin").value = m.origin || "Pakistan";
    if ($("proformaCustomerName")) $("proformaCustomerName").value = m.clientName || "";
    if ($("proformaCustomerPhone")) $("proformaCustomerPhone").value = m.clientPhone || "";
    if ($("proformaCustomerAddress")) $("proformaCustomerAddress").value = m.clientAddress || "";
    if ($("proformaBankDetails")) $("proformaBankDetails").value = m.bankDetails || "";
  } else if (currentModule === "salary") {
    if ($("salarySlipNumber")) $("salarySlipNumber").value = m.number || "";
    if ($("salaryMonth")) $("salaryMonth").value = m.month || "";
    if ($("salaryPayDate")) $("salaryPayDate").value = m.payDate || new Date().toISOString().slice(0, 10);
    if ($("salaryEmpName")) $("salaryEmpName").value = m.empName || "";
    if ($("salaryEmpId")) $("salaryEmpId").value = m.empId || "";
    if ($("salaryDesignation")) $("salaryDesignation").value = m.designation || "";
    if ($("salaryDept")) $("salaryDept").value = m.dept || "";
    if ($("salaryDoj")) $("salaryDoj").value = m.doj || "";
    if ($("salaryBankAc")) $("salaryBankAc").value = m.bankAc || "";
    if ($("salaryBasic")) $("salaryBasic").value = m.basic ?? 30000;
    if ($("salaryHra")) $("salaryHra").value = m.hra || 0;
    if ($("salaryConveyance")) $("salaryConveyance").value = m.conveyance || 0;
    if ($("salaryMedical")) $("salaryMedical").value = m.medical || 0;
    if ($("salarySpecial")) $("salarySpecial").value = m.special || 0;
    if ($("salaryOvertime")) $("salaryOvertime").value = m.overtime || 0;
    if ($("salaryTaxD")) $("salaryTaxD").value = m.taxDeduct || 0;
    if ($("salaryEobi")) $("salaryEobi").value = m.eobi || 0;
    if ($("salaryPessi")) $("salaryPessi").value = m.pessi || 0;
    if ($("salaryAdvance")) $("salaryAdvance").value = m.advance || 0;
    if ($("salaryOtherDeduct")) $("salaryOtherDeduct").value = m.otherDeduct || 0;
    if ($("salaryPayMethod")) $("salaryPayMethod").value = m.payMethod || "Bank Transfer";
    if ($("salaryNotes")) $("salaryNotes").value = m.terms || "";
  } else if (currentModule === "expense") {
    if ($("expVoucherNumber")) $("expVoucherNumber").value = m.number || "";
    if ($("expDate")) $("expDate").value = m.date || new Date().toISOString().slice(0, 10);
    if ($("expRefNo")) $("expRefNo").value = m.refNo || "";
    if ($("expStatus")) $("expStatus").value = m.status || "APPROVED";
    if ($("expEmpName")) $("expEmpName").value = m.empName || "";
    if ($("expEmpId")) $("expEmpId").value = m.empId || "";
    if ($("expDept")) $("expDept").value = m.dept || "";
    if ($("expCostCenter")) $("expCostCenter").value = m.costCenter || "";
    if ($("expPayMethod")) $("expPayMethod").value = m.payMethod || "Cash";
    if ($("expPaidTo")) $("expPaidTo").value = m.paidTo || "";
    if ($("expApprovedBy")) $("expApprovedBy").value = m.approvedBy || "";
  } else if (currentModule === "receipt") {
    if ($("recNumber")) $("recNumber").value = m.number || "";
    if ($("recDate")) $("recDate").value = m.date || new Date().toISOString().slice(0, 10);
    if ($("recMode")) $("recMode").value = m.mode || "Cash";
    if ($("recRef")) $("recRef").value = m.ref || "";
    if ($("recFrom")) $("recFrom").value = m.from || "";
    if ($("recPhone")) $("recPhone").value = m.phone || "";
    if ($("recAddress")) $("recAddress").value = m.address || "";
    if ($("recAmount")) $("recAmount").value = m.amount ?? 10000;
    if ($("recBalance")) $("recBalance").value = m.balance || 0;
    if ($("recPurpose")) $("recPurpose").value = m.purpose || "";
    if ($("recReceivedBy")) $("recReceivedBy").value = m.receivedBy || "";
    if ($("recNotes")) $("recNotes").value = m.terms || "";
  } else if (currentModule === "cheque") {
    if ($("chqNumber")) $("chqNumber").value = m.number || "";
    if ($("chqDate")) $("chqDate").value = m.date || new Date().toISOString().slice(0, 10);
    if ($("chqBank")) $("chqBank").value = m.bank || "HBL (Habib Bank Limited)";
    if ($("chqPayee")) $("chqPayee").value = m.payee || "";
    if ($("chqAmount")) $("chqAmount").value = m.amount ?? 50000;
    if ($("chqAcPayee")) $("chqAcPayee").checked = m.acPayee !== false;
    if ($("chqBlankMode")) $("chqBlankMode").checked = !!m.blankMode;
    if ($("chqAccountNo")) $("chqAccountNo").value = m.accountNo || "";
    if ($("chqMemo")) $("chqMemo").value = m.terms || "";
  } else if (currentModule === "attendance") {
    if ($("attNumber")) $("attNumber").value = m.number || "";
    if ($("attMonth")) $("attMonth").value = m.month || new Date().toISOString().slice(0, 7);
    if ($("attDept")) $("attDept").value = m.dept || "";
    if ($("attWorkDays")) $("attWorkDays").value = m.workDays ?? 26;
    if ($("attSupervisor")) $("attSupervisor").value = m.supervisor || "";
    if ($("attNotes")) $("attNotes").value = m.terms || "";
    renderAttendanceEditors();
  }

  if ($("discount")) $("discount").value = m.discount || 0;
  if ($("tax")) $("tax").value = m.tax || 0;
  if ($("terms")) $("terms").value = m.terms || "";
}

function syncStateFromInputs() {
  if (currentModule === "production") {
    syncProductionStateFromInputs();
    return;
  }
  const m = moduleData[currentModule];
  if (!m) return;

  if (currentModule === "quotation") {
    m.number = $("quoteNumber").value;
    m.date = $("quoteDate").value;
    m.validUntil = $("validUntil").value;
    m.clientName = $("quoteCustomerName").value;
    m.clientPhone = $("quoteCustomerPhone").value;
    m.clientAddress = $("quoteCustomerAddress").value;
  } else if (currentModule === "invoice") {
    m.number = $("invoiceNumber").value;
    m.date = $("invoiceDate").value;
    m.dueDate = $("invoiceDueDate").value;
    m.refNo = $("invoiceRefNo").value;
    m.poNumber = $("invoicePoNumber") ? $("invoicePoNumber").value : (m.poNumber || "");
    m.status = $("invoicePaymentStatus").value;
    m.amountPaid = Number($("invoiceAmountPaid").value) || 0;
    m.clientName = $("invoiceCustomerName").value;
    m.clientPhone = $("invoiceCustomerPhone").value;
    m.clientAddress = $("invoiceCustomerAddress").value;
    m.bankDetails = $("invoiceBankDetails").value;
  } else if (currentModule === "fbr") {
    m.number = $("fbrNumber").value;
    m.date = $("fbrDate").value;
    m.dueDate = $("fbrDueDate").value;
    m.fiscalNumber = $("fbrFiscalNumber").value;
    m.posId = $("fbrPosId").value;
    m.sellerNtn = $("fbrSellerNtn").value;
    m.sellerStrn = $("fbrSellerStrn").value;
    m.invoiceType = $("fbrInvoiceType").value;
    m.paymentMode = $("fbrPaymentMode").value;
    m.clientName = $("fbrCustomerName").value;
    m.clientPhone = $("fbrCustomerPhone").value;
    m.buyerNtn = $("fbrBuyerNtn").value;
    m.clientAddress = $("fbrCustomerAddress").value;
    m.furtherTax = Math.max(0, Number($("fbrFurtherTax").value) || 0);
    m.posFee = Math.max(0, Number($("fbrPosFee").value) || 0);
  } else if (currentModule === "purchaseOrder") {
    m.number = $("poNumber").value;
    m.date = $("poDate").value;
    m.deliveryDate = $("poDeliveryDate").value;
    m.paymentTerms = $("poPaymentTerms").value;
    m.supplierName = $("poSupplierName").value;
    m.supplierPhone = $("poSupplierPhone").value;
    m.supplierAddress = $("poSupplierAddress").value;
    m.shipTo = $("poShipTo").value;
  } else if (currentModule === "deliveryChallan") {
    m.number = $("challanNumber").value;
    m.date = $("challanDate").value;
    m.refNo = $("challanRefNo").value;
    m.clientName = $("challanCustomerName").value;
    m.clientPhone = $("challanCustomerPhone").value;
    m.clientAddress = $("challanCustomerAddress").value;
    m.vehicleNo = $("challanVehicleNo").value;
    m.driverInfo = $("challanDriverInfo").value;
    m.biltyNo = $("challanBiltyNo").value;
    m.showPrices = $("challanShowPrices").checked;
  } else if (currentModule === "proformaInvoice") {
    m.number = $("proformaNumber").value;
    m.date = $("proformaDate").value;
    m.expiryDate = $("proformaExpiryDate").value;
    m.tradeTerms = $("proformaTradeTerms").value;
    m.origin = $("proformaOrigin").value;
    m.clientName = $("proformaCustomerName").value;
    m.clientPhone = $("proformaCustomerPhone").value;
    m.clientAddress = $("proformaCustomerAddress").value;
    m.bankDetails = $("proformaBankDetails").value;
  } else if (currentModule === "salary") {
    m.number = $("salarySlipNumber") ? $("salarySlipNumber").value : (m.number || "");
    m.month = $("salaryMonth") ? $("salaryMonth").value : (m.month || "");
    m.payDate = $("salaryPayDate") ? $("salaryPayDate").value : (m.payDate || "");
    m.empName = $("salaryEmpName") ? $("salaryEmpName").value : (m.empName || "");
    m.empId = $("salaryEmpId") ? $("salaryEmpId").value : (m.empId || "");
    m.designation = $("salaryDesignation") ? $("salaryDesignation").value : (m.designation || "");
    m.dept = $("salaryDept") ? $("salaryDept").value : (m.dept || "");
    m.doj = $("salaryDoj") ? $("salaryDoj").value : (m.doj || "");
    m.bankAc = $("salaryBankAc") ? $("salaryBankAc").value : (m.bankAc || "");
    m.basic = Math.max(0, Number($("salaryBasic") ? $("salaryBasic").value : 0) || 0);
    m.hra = Math.max(0, Number($("salaryHra") ? $("salaryHra").value : 0) || 0);
    m.conveyance = Math.max(0, Number($("salaryConveyance") ? $("salaryConveyance").value : 0) || 0);
    m.medical = Math.max(0, Number($("salaryMedical") ? $("salaryMedical").value : 0) || 0);
    m.special = Math.max(0, Number($("salarySpecial") ? $("salarySpecial").value : 0) || 0);
    m.overtime = Math.max(0, Number($("salaryOvertime") ? $("salaryOvertime").value : 0) || 0);
    m.taxDeduct = Math.max(0, Number($("salaryTaxD") ? $("salaryTaxD").value : 0) || 0);
    m.eobi = Math.max(0, Number($("salaryEobi") ? $("salaryEobi").value : 0) || 0);
    m.pessi = Math.max(0, Number($("salaryPessi") ? $("salaryPessi").value : 0) || 0);
    m.advance = Math.max(0, Number($("salaryAdvance") ? $("salaryAdvance").value : 0) || 0);
    m.otherDeduct = Math.max(0, Number($("salaryOtherDeduct") ? $("salaryOtherDeduct").value : 0) || 0);
    m.payMethod = $("salaryPayMethod") ? $("salaryPayMethod").value : (m.payMethod || "Bank Transfer");
    m.terms = $("salaryNotes") ? $("salaryNotes").value : (m.terms || "");
  } else if (currentModule === "expense") {
    m.number = $("expVoucherNumber") ? $("expVoucherNumber").value : (m.number || "");
    m.date = $("expDate") ? $("expDate").value : (m.date || "");
    m.refNo = $("expRefNo") ? $("expRefNo").value : (m.refNo || "");
    m.status = $("expStatus") ? $("expStatus").value : (m.status || "APPROVED");
    m.empName = $("expEmpName") ? $("expEmpName").value : (m.empName || "");
    m.empId = $("expEmpId") ? $("expEmpId").value : (m.empId || "");
    m.dept = $("expDept") ? $("expDept").value : (m.dept || "");
    m.costCenter = $("expCostCenter") ? $("expCostCenter").value : (m.costCenter || "");
    m.payMethod = $("expPayMethod") ? $("expPayMethod").value : (m.payMethod || "Cash");
    m.paidTo = $("expPaidTo") ? $("expPaidTo").value : (m.paidTo || "");
    m.approvedBy = $("expApprovedBy") ? $("expApprovedBy").value : (m.approvedBy || "");
  } else if (currentModule === "receipt") {
    m.number = $("recNumber") ? $("recNumber").value : (m.number || "");
    m.date = $("recDate") ? $("recDate").value : (m.date || "");
    m.mode = $("recMode") ? $("recMode").value : (m.mode || "Cash");
    m.ref = $("recRef") ? $("recRef").value : (m.ref || "");
    m.from = $("recFrom") ? $("recFrom").value : (m.from || "");
    m.phone = $("recPhone") ? $("recPhone").value : (m.phone || "");
    m.address = $("recAddress") ? $("recAddress").value : (m.address || "");
    m.amount = Math.max(0, Number($("recAmount") ? $("recAmount").value : 0) || 0);
    m.balance = Math.max(0, Number($("recBalance") ? $("recBalance").value : 0) || 0);
    m.purpose = $("recPurpose") ? $("recPurpose").value : (m.purpose || "");
    m.receivedBy = $("recReceivedBy") ? $("recReceivedBy").value : (m.receivedBy || "");
    m.terms = $("recNotes") ? $("recNotes").value : (m.terms || "");
  } else if (currentModule === "cheque") {
    m.number = $("chqNumber") ? $("chqNumber").value : (m.number || "");
    m.date = $("chqDate") ? $("chqDate").value : (m.date || "");
    m.bank = $("chqBank") ? $("chqBank").value : (m.bank || "HBL (Habib Bank Limited)");
    m.payee = $("chqPayee") ? $("chqPayee").value : (m.payee || "");
    m.amount = Math.max(0, Number($("chqAmount") ? $("chqAmount").value : 0) || 0);
    m.acPayee = $("chqAcPayee") ? $("chqAcPayee").checked : true;
    m.blankMode = $("chqBlankMode") ? $("chqBlankMode").checked : false;
    m.accountNo = $("chqAccountNo") ? $("chqAccountNo").value : (m.accountNo || "");
    m.terms = $("chqMemo") ? $("chqMemo").value : (m.terms || "");
  } else if (currentModule === "attendance") {
    m.number = $("attNumber") ? $("attNumber").value : (m.number || "");
    m.month = $("attMonth") ? $("attMonth").value : (m.month || "");
    m.dept = $("attDept") ? $("attDept").value : (m.dept || "");
    m.workDays = Math.max(1, Number($("attWorkDays") ? $("attWorkDays").value : 26) || 26);
    m.supervisor = $("attSupervisor") ? $("attSupervisor").value : (m.supervisor || "");
    m.terms = $("attNotes") ? $("attNotes").value : (m.terms || "");
  }

  if ($("discount")) m.discount = Number($("discount").value) || 0;
  if ($("tax")) m.tax = Number($("tax").value) || 0;
  if ($("terms")) m.terms = $("terms").value;
}

// LINE ITEMS ENGINE
const UNIT_OPTIONS = ["Sq. Ft.", "Sq. M.", "Rft", "Cft", "Nos", "Pcs", "Set", "Pair", "Kg", "Ton", "Ltr", "Carton", "Box", "Bag", "Lot", "Lump Sum", "Units"];

function fmtQty(n) {
  return Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
}

function normalizeItem(item) {
  if (item.itemQty === undefined) item.itemQty = Number(item.qty ?? 1);
  if (item.unitQty === undefined) item.unitQty = 1;
  if (!item.unit) item.unit = "Nos";
  if (!item.calcMode) item.calcMode = "manual";
  delete item.qty;
  return item;
}

function normalizeAllItems() {
  Object.values(moduleData).forEach(m => {
    if (m && Array.isArray(m.items)) m.items.forEach(normalizeItem);
  });
}

function unitOptionsHtml(selected, customMode) {
  const isCustom = customMode || !UNIT_OPTIONS.includes(selected);
  const options = UNIT_OPTIONS.map(u =>
    `<option value="${safeText(u)}" ${!isCustom && u === selected ? "selected" : ""}>${safeText(u)}</option>`
  ).join("");
  return options + `<option value="__custom__" ${isCustom ? "selected" : ""}>Custom</option>`;
}

function renderItems() {
  const m = moduleData[currentModule];
  if (!m || !Array.isArray(m.items) || !$("itemEditors")) return;

  $("itemCountBadge").textContent = `(${m.items.length} ${m.items.length === 1 ? 'Item' : 'Items'})`;

  $("itemEditors").innerHTML = m.items.map((item, i) => {
    normalizeItem(item);
    const customUnitMode = item.customUnitMode || !UNIT_OPTIONS.includes(item.unit);
    const areaMode = item.calcMode === "area";
    const c = getItemCalculation(item);
    return `
    <div class="item-editor">
      <label>Item ${i+1} Description</label>
      <textarea data-i="${i}" data-key="description" rows="2">${safeText(item.description)}</textarea>
      <label>Unit Qty Calculation</label>
      <select data-i="${i}" data-key="calcMode">
        <option value="manual" ${!areaMode ? "selected" : ""}>Manual Unit Qty</option>
        <option value="area" ${areaMode ? "selected" : ""}>Calculate Area (Width × Height)</option>
      </select>
      ${areaMode ? `
        <div style="display:flex;gap:8px;">
          <div style="flex:1;"><label>Width</label><input type="number" min="0" step="any" data-i="${i}" data-key="width" value="${Number(item.width) || 0}"></div>
          <div style="flex:1;"><label>Height</label><input type="number" min="0" step="any" data-i="${i}" data-key="height" value="${Number(item.height) || 0}"></div>
          <div style="flex:1;"><label>Dimension Unit</label>
            <select data-i="${i}" data-key="dimensionUnit">
              <option value="in" ${(item.dimensionUnit || "in") === "in" ? "selected" : ""}>Inches</option>
              <option value="ft" ${item.dimensionUnit === "ft" ? "selected" : ""}>Feet</option>
              <option value="mm" ${item.dimensionUnit === "mm" ? "selected" : ""}>Millimetres</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="flex:1;"><label>Unit Qty (Sq. Ft.)</label><input data-role="unitQtyView" value="${c.unitQty.toFixed(2)} Sq. Ft." readonly></div>
          <div style="flex:1;"><label>Item Qty (Pieces)</label><input type="number" min="0" step="any" data-i="${i}" data-key="itemQty" value="${item.itemQty}"></div>
        </div>
      ` : `
        <div style="display:flex;gap:8px;">
          <div style="flex:1;min-width:0;">
            <label>Unit</label>
            <div style="display:flex;gap:5px;">
              <select style="flex:1;min-width:0;" data-i="${i}" data-key="unit">
                ${unitOptionsHtml(item.unit, customUnitMode)}
              </select>
              ${customUnitMode ? `
                <input style="flex:1;min-width:0;" data-i="${i}" data-key="customUnit"
                value="${safeText(item.unit)}" placeholder="Enter unit">
              ` : ""}
            </div>
          </div>
          <div style="flex:1;"><label>Unit Qty</label><input type="number" min="0" step="any" data-i="${i}" data-key="unitQty" value="${item.unitQty}"></div>
          <div style="flex:1;"><label>Item Qty</label><input type="number" min="0" step="any" data-i="${i}" data-key="itemQty" value="${item.itemQty}"></div>
        </div>
      `}
      <label>Total Qty (Unit Qty × Item Qty)</label>
      <input data-role="totalQtyView" value="${fmtQty(c.qty)} ${safeText(c.unit)}" readonly>
      <label>Rate (Rs.) per ${safeText(c.unit)}</label>
      <input type="number" min="0" step="any" data-i="${i}" data-key="rate" value="${item.rate}">
      <button type="button" class="removeItem btn-danger" data-remove="${i}">Remove Item</button>
    </div>`;
  }).join("");
}

function getItemCalculation(item) {
  const itemQty = Math.max(0, Number(item.itemQty ?? item.qty ?? 1) || 0);
  let unitQty, unit;
  if (item.calcMode === "area") {
    const width = Math.max(0, Number(item.width) || 0);
    const height = Math.max(0, Number(item.height) || 0);
    const dimensionUnit = item.dimensionUnit || "in";
    const toFeet = dimensionUnit === "ft" ? 1 : (dimensionUnit === "mm" ? 1 / 304.8 : 1 / 12);
    unitQty = width * toFeet * height * toFeet;
    unit = "Sq. Ft.";
  } else {
    unitQty = Math.max(0, Number(item.unitQty ?? 1) || 0);
    unit = item.unit || "Nos";
  }
  return { unitQty, itemQty, qty: unitQty * itemQty, unit };
}

function refreshItemViews(editor, item) {
  if (!editor) return;
  const c = getItemCalculation(item);
  const u = editor.querySelector('[data-role="unitQtyView"]');
  if (u) u.value = c.unitQty.toFixed(2) + " " + c.unit;
  const t = editor.querySelector('[data-role="totalQtyView"]');
  if (t) t.value = fmtQty(c.qty) + " " + c.unit;
}

// UPDATE DOCUMENT PREVIEW CANVAS
function updatePreview() {
  if (!$("paper")) return;
  syncStateFromInputs();
  if (typeof checkDuplicateDocNumber === "function") checkDuplicateDocNumber();
  const m = moduleData[currentModule];
  const primaryColor = $("brandColor").value || "#174a83";
  document.documentElement.style.setProperty("--primary", primaryColor);

  const paper = $("paper");
  // ✅ FIX: Production module ka moduleData nahi hota (m = undefined hota hai),
  // isliye m.items.length crash karta tha — logo/stamp/watermark apply nahi hote the.
  // Optional chaining se safe kar diya.
  if ((m?.items?.length ?? 0) >= 6) {
    paper.classList.add("auto-compact");
  } else {
    paper.classList.remove("auto-compact");
  }

  $("pCompanyName").textContent = $("companyName").value.trim() || "YOUR COMPANY NAME";
  $("previewLogo").src = logoData || "";
  $("previewLogo").onerror = () => { $("previewLogo").style.display = "none"; };
  $("previewLogo").onload = () => { $("previewLogo").style.display = "block"; };
  $("previewLogo").style.display = logoData ? "block" : "none";

  const addr = $("companyAddress").value.trim();
  const phone = $("companyPhone").value.trim();
  const email = $("companyEmail").value.trim();
  const website = $("companyWebsite").value.trim();

  $("pAddress").textContent = addr;
  $("fAddrWrap").style.display = addr ? "inline-flex" : "none";
  $("pContact").textContent = phone;
  $("fPhoneWrap").style.display = phone ? "inline-flex" : "none";
  $("pEmail").textContent = email;
  $("fEmailWrap").style.display = email ? "inline-flex" : "none";
  $("pWebsite").textContent = website;
  $("fWebsiteWrap").style.display = website ? "inline-flex" : "none";

  // Watermark
  const watermarkMode = $("watermarkMode").value;
  const watermarkEnabled = $("watermarkOn").checked;
  const watermarkOpacity = Number($("watermarkOpacity").value) / 100;
  $("watermarkImage").src = watermarkData || "";
  $("watermarkImage").onerror = () => { $("watermarkImage").style.display = "none"; };
  $("watermarkImage").style.display = (watermarkMode === "image" && watermarkData) ? "block" : "none";
  $("watermarkTextPreview").textContent = $("watermarkText").value;
  $("watermarkTextPreview").style.display = (watermarkMode === "text" && $("watermarkText").value.trim()) ? "block" : "none";
  $("watermarkTextPreview").style.color = $("watermarkTextColor").value;
  $("watermarkTextPreview").style.fontSize = (Number($("watermarkTextSize").value) || 55) + "px";
  $("watermarkImage").style.opacity = watermarkOpacity;
  $("watermarkTextPreview").style.opacity = watermarkOpacity;
  const hasWatermark = watermarkMode === "image" ? Boolean(watermarkData) : Boolean($("watermarkText").value.trim());
  $("watermark").style.display = (watermarkEnabled && hasWatermark) ? "flex" : "none";
  $("watermarkImageSettings").style.display = watermarkMode === "image" ? "block" : "none";
  $("watermarkTextSettings").style.display = watermarkMode === "text" ? "block" : "none";

  // Stamp & Signature
  const showStamp = Boolean(stampData && $("stampOn").checked);
  $("pStamp").src = stampData || "";
  $("pStamp").onerror = () => { $("stampBlock").style.visibility = "hidden"; };
  $("stampBlock").style.visibility = showStamp ? "visible" : "hidden";

  const showSig = Boolean(signatureData && $("signatureOn").checked);
  $("pSignature").src = signatureData || "";
  $("pSignature").onerror = () => { $("signatureBlock").style.visibility = "hidden"; };
  $("signatureBlock").style.visibility = showSig ? "visible" : "hidden";

  if (currentModule === "production") {
    renderProductionPreview();
    return;
  }

  let badgeText = "QUOTATION";
  let metaHtml = "";
  let statusHtml = "";
  let clientHeader = "Quotation Prepared For";
  let clientName = m.clientName || "Valued Customer";
  let clientPhone = m.clientPhone ? "Contact: " + safeText(m.clientPhone) : "";
  let clientAddress = m.clientAddress ? "Address: " + safeText(m.clientAddress) : "";
  let bottomType = "Computer Generated Official Quotation";
  let stampLabel = "Company Stamp";
  let signatureLabel = "Authorized Signature";
  let extraInfoHtml = "";

  if (currentModule === "quotation") {
    badgeText = "QUOTATION";
    metaHtml = `
      <div><span>Quote #:</span> <strong>${safeText(m.number || "QT-001")}</strong></div>
      <div><span>Date:</span> <strong>${safeText(m.date || "")}</strong></div>
      <div><span>Valid Until:</span> <strong>${safeText(m.validUntil || "")}</strong></div>
    `;
    clientHeader = "Quotation Prepared For";
    bottomType = "Official Quotation Document";
  } else if (currentModule === "invoice") {
    badgeText = "TAX INVOICE";
    metaHtml = `
      <div><span>Invoice #:</span> <strong>${safeText(m.number || "INV-001")}</strong></div>
      <div><span>Date:</span> <strong>${safeText(m.date || "")}</strong></div>
      <div><span>Due Date:</span> <strong>${safeText(m.dueDate || "")}</strong></div>
      ${m.refNo ? `<div><span>Ref #:</span> <strong>${safeText(m.refNo)}</strong></div>` : ''}
      ${m.poNumber ? `<div><span>PO #:</span> <strong>${safeText(m.poNumber)}</strong></div>` : ''}
    `;
    let statusClass = m.status === "PAID" ? "status-paid" : (m.status === "PARTIAL" ? "status-partial" : "status-unpaid");
    statusHtml = `<span class="status-stamp-tag ${statusClass}">STATUS: ${safeText(m.status)}</span>`;
    clientHeader = "Invoice Billed To";
    bottomType = "Commercial Sales & Tax Invoice";
    if (m.bankDetails) {
      extraInfoHtml = `
        <div class="bank-info-box">
          <strong>Wire Transfer / Bank Payment Details:</strong>
          ${safeText(m.bankDetails).replace(/\n/g, '<br>')}
        </div>`;
    }
  } else if (currentModule === "fbr") {
    badgeText = m.invoiceType ? String(m.invoiceType).toUpperCase() : "FBR DIGITAL INVOICE";
    metaHtml = `
      <div><span>Invoice #:</span> <strong>${safeText(m.number || "FBR-001")}</strong></div>
      <div><span>Date:</span> <strong>${safeText(m.date || "")}</strong></div>
      ${m.dueDate ? `<div><span>Due Date:</span> <strong>${safeText(m.dueDate)}</strong></div>` : ''}
      ${m.posId ? `<div><span>POS ID:</span> <strong>${safeText(m.posId)}</strong></div>` : ''}
      ${m.sellerNtn ? `<div><span>Seller NTN:</span> <strong>${safeText(m.sellerNtn)}</strong></div>` : ''}
      ${m.sellerStrn ? `<div><span>STRN:</span> <strong>${safeText(m.sellerStrn)}</strong></div>` : ''}
    `;
    statusHtml = `<span class="status-stamp-tag status-paid">FBR USIN: ${safeText(m.fiscalNumber || "PENDING")}</span>`;
    clientHeader = "Buyer / Customer Details";
    if (m.buyerNtn) {
      clientPhone = (clientPhone ? clientPhone + " | " : "") + "NTN/CNIC: " + safeText(m.buyerNtn);
    }
    bottomType = "FBR POS / Digital Sales Tax Invoice";
  } else if (currentModule === "purchaseOrder") {
    badgeText = "PURCHASE ORDER";
    metaHtml = `
      <div><span>PO #:</span> <strong>${safeText(m.number || "PO-001")}</strong></div>
      <div><span>Date:</span> <strong>${safeText(m.date || "")}</strong></div>
      <div><span>Delivery:</span> <strong>${safeText(m.deliveryDate || "")}</strong></div>
      ${m.paymentTerms ? `<div><span>Terms:</span> <strong>${safeText(m.paymentTerms)}</strong></div>` : ''}
    `;
    clientHeader = "Vendor / Supplier Partner";
    clientName = m.supplierName || "Supplier Name";
    clientPhone = m.supplierPhone ? "Phone: " + safeText(m.supplierPhone) : "";
    clientAddress = m.supplierAddress ? "Address: " + safeText(m.supplierAddress) : "";
    if (m.shipTo) {
      clientAddress += `<br><span style="font-weight:700;color:var(--primary);">Ship To:</span> ${safeText(m.shipTo)}`;
    }
    bottomType = "Official Commercial Purchase Order";
    stampLabel = "Prepared By";
    signatureLabel = "Approved / Authorized By";
  } else if (currentModule === "deliveryChallan") {
    badgeText = "DELIVERY CHALLAN";
    metaHtml = `
      <div><span>Challan #:</span> <strong>${safeText(m.number || "DC-001")}</strong></div>
      <div><span>Dispatch Date:</span> <strong>${safeText(m.date || "")}</strong></div>
      ${m.refNo ? `<div><span>Ref Inv/PO:</span> <strong>${safeText(m.refNo)}</strong></div>` : ''}
    `;
    clientHeader = "Consignee / Deliver To";
    bottomType = "Goods Delivery & Dispatch Note";
    stampLabel = "Dispatched By (Warehouse)";
    signatureLabel = "Received In Good Condition";

    let transportDetails = [];
    if (m.vehicleNo) transportDetails.push(`Vehicle: <b>${safeText(m.vehicleNo)}</b>`);
    if (m.driverInfo) transportDetails.push(`Driver: <b>${safeText(m.driverInfo)}</b>`);
    if (m.biltyNo) transportDetails.push(`Bilty/Tracking: <b>${safeText(m.biltyNo)}</b>`);
    if (transportDetails.length) {
      extraInfoHtml = `
        <div class="bank-info-box" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534;">
          <strong>Logistics & Carrier Details:</strong>
          ${transportDetails.join(' | ')}
        </div>`;
    }
  } else if (currentModule === "proformaInvoice") {
    badgeText = "PROFORMA INVOICE";
    metaHtml = `
      <div><span>Proforma #:</span> <strong>${safeText(m.number || "PI-001")}</strong></div>
      <div><span>Date:</span> <strong>${safeText(m.date || "")}</strong></div>
      <div><span>Valid Until:</span> <strong>${safeText(m.expiryDate || "")}</strong></div>
      ${m.tradeTerms ? `<div><span>Terms:</span> <strong>${safeText(m.tradeTerms)}</strong></div>` : ''}
      ${m.origin ? `<div><span>Origin:</span> <strong>${safeText(m.origin)}</strong></div>` : ''}
    `;
    clientHeader = "Proforma Billed To";
    bottomType = "Preliminary Proforma Invoice";
    if (m.bankDetails) {
      extraInfoHtml = `
        <div class="bank-info-box">
          <strong>International Wire Transfer (SWIFT / IBAN):</strong>
          ${safeText(m.bankDetails).replace(/\n/g, '<br>')}
        </div>`;
    }
  } else if (currentModule === "salary") {
    // ===== SALARY SLIP RENDER =====
    const gross = (m.basic||0)+(m.hra||0)+(m.conveyance||0)+(m.medical||0)+(m.special||0)+(m.overtime||0);
    const totalDeduct = (m.taxDeduct||0)+(m.eobi||0)+(m.pessi||0)+(m.advance||0)+(m.otherDeduct||0);
    const netPay = Math.max(0, gross - totalDeduct);

    badgeText = "SALARY SLIP";
    metaHtml = `
      <div><span>Slip #:</span> <strong>${safeText(m.number || "SAL-001")}</strong></div>
      <div><span>Month:</span> <strong>${safeText(m.month || "")}</strong></div>
      <div><span>Pay Date:</span> <strong>${safeText(m.payDate || "")}</strong></div>
    `;
    clientHeader = "Employee Details";
    clientName = m.empName || "Employee Name";
    clientPhone = `ID: <b>${safeText(m.empId||"")}</b>${m.designation ? ` &nbsp;|&nbsp; Designation: <b>${safeText(m.designation)}</b>` : ""}`;
    clientAddress = `${m.dept ? `Dept: <b>${safeText(m.dept)}</b>` : ""}${m.doj ? ` &nbsp;|&nbsp; DOJ: <b>${safeText(m.doj)}</b>` : ""}`;
    bottomType = "Confidential — Employee Copy";
    stampLabel = "Company Stamp";
    signatureLabel = "Authorized by HR / Management";

    // Earnings & Deductions Table
    $("previewTitle").textContent = "Live Salary Slip Preview";
    $("pDocBadge").textContent = badgeText;
    $("pDocMetaList").innerHTML = metaHtml;
    $("pStatusContainer").innerHTML = "";
    $("pClientHeader").textContent = clientHeader;
    $("pCustomerName").textContent = clientName;
    $("pCustomerPhone").innerHTML = clientPhone;
    $("pCustomerAddress").innerHTML = clientAddress;
    $("pDocBottomType").textContent = bottomType;
    $("pStampLabel").textContent = stampLabel;
    $("pSignatureLabel").textContent = signatureLabel;
    $("pTermsTitle") && ($("pTermsTitle").textContent = "Remarks & Payment Info");
    $("pTerms").textContent = m.terms || "";
    renderQuotationAttachmentsPreview();

    $("previewTableHead").innerHTML = `
      <tr>
        <th style="width:50%;">Earnings</th>
        <th style="width:20%;text-align:right;">Amount (Rs.)</th>
        <th style="width:50%;border-left:2px solid #e2e8f0;">Deductions</th>
        <th style="text-align:right;">Amount (Rs.)</th>
      </tr>`;
    const earningRows = [
      ["Basic Salary", m.basic||0],
      ["House Rent Allowance (HRA)", m.hra||0],
      ["Conveyance / Transport", m.conveyance||0],
      ["Medical Allowance", m.medical||0],
      ["Performance / Special", m.special||0],
      ["Overtime", m.overtime||0],
    ].filter(r => r[1] > 0);
    const deductRows = [
      ["Income Tax / WHT", m.taxDeduct||0],
      ["EOBI", m.eobi||0],
      ["PESSI / Social Security", m.pessi||0],
      ["Advance Recovery", m.advance||0],
      ["Other Deduction", m.otherDeduct||0],
    ].filter(r => r[1] > 0);
    const maxRows = Math.max(earningRows.length, deductRows.length, 1);
    let tableRows = "";
    for (let i = 0; i < maxRows; i++) {
      const e = earningRows[i] || ["", ""];
      const d = deductRows[i] || ["", ""];
      tableRows += `<tr>
        <td>${safeText(e[0])}</td>
        <td style="text-align:right;font-weight:600;">${e[1] !== "" ? "Rs. "+money(e[1]) : ""}</td>
        <td style="border-left:2px solid #e2e8f0;color:#b91c1c;">${safeText(d[0])}</td>
        <td style="text-align:right;font-weight:600;color:#b91c1c;">${d[1] !== "" ? "Rs. "+money(d[1]) : ""}</td>
      </tr>`;
    }
    tableRows += `<tr style="background:#f1f5f9;font-weight:800;border-top:2px solid #cbd5e1;">
      <td>Total Gross Earnings</td>
      <td style="text-align:right;">Rs. ${money(gross)}</td>
      <td style="border-left:2px solid #e2e8f0;">Total Deductions</td>
      <td style="text-align:right;color:#b91c1c;">Rs. ${money(totalDeduct)}</td>
    </tr>`;
    $("previewItems").innerHTML = tableRows;
    $("pTotalsContainer").style.display = "block";
    $("pSubtotal").textContent = "Rs. " + money(gross);
    $("pDiscount").textContent = "Rs. " + money(totalDeduct);
    $("pTax") && ($("pTax").textContent = "");
    $("pGrandTotal").textContent = "Rs. " + money(netPay);
    $("pInvoiceBalanceRows").classList && $("pInvoiceBalanceRows").classList.remove("hidden");
    $("pAmountPaid").textContent = m.payMethod || "Bank Transfer";
    $("pBalanceDue").textContent = m.bankAc ? safeText(m.bankAc) : "—";

    // Net Pay highlight box
    $("pExtraInfoBox").innerHTML = `
      <div style="background:var(--primary);color:#fff;border-radius:6px;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;margin:10px 0;break-inside:avoid;page-break-inside:avoid;">
        <div>
          <div style="font-size:13px;font-weight:700;opacity:0.9;">💵 NET PAY THIS MONTH</div>
          ${m.payMethod ? `<div style="font-size:10.5px;opacity:0.7;margin-top:3px;">Payment via ${safeText(m.payMethod)}</div>` : ""}
        </div>
        <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;">Rs. ${money(netPay)}</div>
      </div>`;
    return;

  } else if (currentModule === "expense") {
    // ===== EXPENSE VOUCHER RENDER =====
    badgeText = "EXPENSE VOUCHER";
    const statusColors = { APPROVED: "status-paid", PENDING: "status-partial", REJECTED: "status-unpaid" };
    const statusLabels = { APPROVED: "✅ APPROVED", PENDING: "⏳ PENDING", REJECTED: "❌ REJECTED" };
    statusHtml = `<span class="status-stamp-tag ${statusColors[m.status] || "status-paid"}">${statusLabels[m.status] || m.status}</span>`;
    metaHtml = `
      <div><span>Voucher #:</span> <strong>${safeText(m.number || "EXP-001")}</strong></div>
      <div><span>Date:</span> <strong>${safeText(m.date || "")}</strong></div>
      ${m.refNo ? `<div><span>Ref #:</span> <strong>${safeText(m.refNo)}</strong></div>` : ""}
    `;
    clientHeader = "Submitted By";
    clientName = m.empName || "Employee Name";
    clientPhone = `ID: <b>${safeText(m.empId||"")}</b>${m.dept ? ` &nbsp;|&nbsp; Dept: <b>${safeText(m.dept)}</b>` : ""}`;
    clientAddress = m.costCenter ? `Cost Center: <b>${safeText(m.costCenter)}</b>` : "";
    bottomType = "Official Finance Record";
    stampLabel = "Submitted By";
    signatureLabel = "Approved By";

    if (m.approvedBy || m.payMethod || m.paidTo) {
      extraInfoHtml = `
        <div class="bank-info-box" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534;">
          ${m.payMethod ? `<div><strong>Payment Method:</strong> ${safeText(m.payMethod)}</div>` : ""}
          ${m.paidTo ? `<div><strong>Paid To:</strong> ${safeText(m.paidTo)}</div>` : ""}
          ${m.approvedBy ? `<div><strong>Approved By:</strong> ${safeText(m.approvedBy)}</div>` : ""}
        </div>`;
    }
    $("pInvoiceBalanceRows") && $("pInvoiceBalanceRows").classList.remove("hidden");
    // set after main block below
  } else if (currentModule === "receipt") {
    // ===== CASH RECEIPT / RASEED RENDER =====
    const amt = Number(m.amount || 0);
    const bal = Number(m.balance || 0);
    $("previewTitle").textContent = "Live Cash Receipt Preview";
    $("pDocBadge").textContent = "CASH RECEIPT";
    $("pDocMetaList").innerHTML = `
      <div><span>Receipt #:</span> <strong>${safeText(m.number || "REC-001")}</strong></div>
      <div><span>Date:</span> <strong>${safeText(m.date || "")}</strong></div>
      ${m.ref ? `<div><span>Ref #:</span> <strong>${safeText(m.ref)}</strong></div>` : ""}
    `;
    $("pStatusContainer").innerHTML = `<span class="status-stamp-tag status-paid">✅ RECEIVED</span>`;
    $("pClientHeader").textContent = "Received With Thanks From";
    $("pCustomerName").textContent = m.from || "Customer Name";
    $("pCustomerPhone").innerHTML = m.phone ? `Phone: <b>${safeText(m.phone)}</b>` : "";
    $("pCustomerAddress").innerHTML = m.address ? safeText(m.address) : "";
    $("pDocBottomType").textContent = "Customer Payment Receipt";
    $("pStampLabel").textContent = "Payer Signature";
    $("pSignatureLabel").textContent = "Received By / Authorized Signature";
    $("pTermsTitle") && ($("pTermsTitle").textContent = "Remarks & Receipt Note");
    $("pTerms").textContent = m.terms || "";
    renderQuotationAttachmentsPreview();

    $("previewTableHead").innerHTML = `
      <tr>
        <th style="width:40%;">Particulars / On Account Of</th>
        <th style="width:20%;">Payment Mode</th>
        <th style="width:20%;">Reference #</th>
        <th style="width:20%;text-align:right;">Amount (Rs.)</th>
      </tr>`;
    $("previewItems").innerHTML = `
      <tr>
        <td>${safeText(m.purpose || "Payment received against goods / services.")}</td>
        <td>${safeText(m.mode || "Cash")}</td>
        <td>${safeText(m.ref || "—")}</td>
        <td style="text-align:right;font-weight:800;color:#059669;">Rs. ${money(amt)}</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td colspan="4" style="font-size:12px;"><strong>Amount in Words:</strong> ${safeText(numberToWordsPKR(amt))}</td>
      </tr>`;

    $("pExtraInfoBox").innerHTML = `
      <div style="background:var(--primary);color:#fff;border-radius:6px;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;margin:10px 0;break-inside:avoid;page-break-inside:avoid;">
        <div>
          <div style="font-size:13px;font-weight:700;opacity:0.9;">💵 AMOUNT RECEIVED</div>
          <div style="font-size:10.5px;opacity:0.8;margin-top:3px;">${safeText(numberToWordsPKR(amt))}</div>
        </div>
        <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;">Rs. ${money(amt)}</div>
      </div>`;

    $("pSubtotal").textContent = "Rs. " + money(amt);
    $("pDiscount").textContent = "Rs. " + money(bal);
    $("pGrandTotal").textContent = "Rs. " + money(amt);
    $("pInvoiceBalanceRows") && $("pInvoiceBalanceRows").classList.remove("hidden");
    $("pAmountPaid").textContent = m.mode || "Cash";
    $("pBalanceDue").textContent = m.receivedBy || "Cashier";
    return;

  } else if (currentModule === "cheque") {
    // ===== CHEQUE PRINTING RENDER =====
    const amt = Number(m.amount || 0);
    const words = numberToWordsPKR(amt);
    const fmtDate = (m.date || new Date().toISOString().slice(0, 10)).split("-").reverse().join(" / ");
    $("previewTitle").textContent = "Live Cheque Printing Preview";
    $("pDocBadge").textContent = "CHEQUE VOUCHER";
    $("pDocMetaList").innerHTML = `
      <div><span>Cheque #:</span> <strong>${safeText(m.number || "CHQ-001")}</strong></div>
      <div><span>Date:</span> <strong>${safeText(m.date || "")}</strong></div>
      <div><span>Bank:</span> <strong>${safeText(m.bank || "")}</strong></div>
    `;
    $("pStatusContainer").innerHTML = m.acPayee ? `<span class="status-stamp-tag status-paid">A/C PAYEE ONLY</span>` : `<span class="status-stamp-tag status-partial">BEARER / OPEN</span>`;
    $("pClientHeader").textContent = "Cheque Counterfoil & Office Record";
    $("pCustomerName").textContent = m.payee || "Payee Name";
    $("pCustomerPhone").innerHTML = `Bank: <b>${safeText(m.bank || "")}</b>${m.accountNo ? ` &nbsp;|&nbsp; A/C: <b>${safeText(m.accountNo)}</b>` : ""}`;
    $("pCustomerAddress").innerHTML = `Amount in Words: <b>${safeText(words)}</b>`;
    $("pDocBottomType").textContent = "Bank Cheque Record";
    $("pStampLabel").textContent = "Prepared By";
    $("pSignatureLabel").textContent = "Authorized Signatory";
    $("pTermsTitle") && ($("pTermsTitle").textContent = "Cheque Memo / Purpose");
    $("pTerms").textContent = m.terms || "";
    renderQuotationAttachmentsPreview();

    if ($("chequeLeafContainer")) {
      $("chequeLeafContainer").innerHTML = `
        <div class="cheque-leaf ${m.blankMode ? "blank-print" : ""}">
          ${m.acPayee ? `<div class="chq-ac-payee">A/C PAYEE ONLY</div>` : ""}
          <div class="chq-top-row">
            <div class="chq-bank-title chq-guide">${safeText(m.bank || "PAKISTAN BANK")}</div>
            <div class="chq-date-box">${safeText(fmtDate)}</div>
          </div>
          <div class="chq-row">
            <span class="chq-label chq-guide">Pay</span>
            <div class="chq-value-line">${safeText(m.payee || "Payee Name")}</div>
          </div>
          <div class="chq-amount-row">
            <div class="chq-words-box">
              <span class="chq-label chq-guide" style="margin-right:6px;">Rupees</span>
              ${safeText(words)}
            </div>
            <div class="chq-figure-box">PKR ${money(amt)}/-</div>
          </div>
          <div class="chq-bottom-row">
            <div class="chq-micr chq-guide">⑈ ${safeText(m.number || "000001")} ⑈ &nbsp; ${safeText(m.accountNo || "0000-0000000-01")}</div>
            <div class="chq-sign-line chq-guide">Authorized Signature(s)</div>
          </div>
        </div>`;
    }
    $("pExtraInfoBox").innerHTML = "";
    $("pSubtotal").textContent = "Rs. " + money(amt);
    $("pDiscount").textContent = m.acPayee ? "A/C Payee" : "Bearer";
    $("pGrandTotal").textContent = "Rs. " + money(amt);
    return;

  } else if (currentModule === "attendance") {
    // ===== ATTENDANCE SHEET RENDER =====
    const staff = Array.isArray(m.staff) ? m.staff : [];
    const workDays = Math.max(1, Number(m.workDays || 26));
    let monthLabel = m.month || "";
    if (monthLabel && monthLabel.includes("-")) {
      const [yr, mo] = monthLabel.split("-");
      const mn = ["January","February","March","April","May","June","July","August","September","October","November","December"][Number(mo) - 1] || mo;
      monthLabel = `${mn} ${yr}`;
    }
    $("previewTitle").textContent = "Live Attendance Sheet Preview";
    $("pDocBadge").textContent = "ATTENDANCE SHEET";
    $("pDocMetaList").innerHTML = `
      <div><span>Sheet #:</span> <strong>${safeText(m.number || "ATT-001")}</strong></div>
      <div><span>Month:</span> <strong>${safeText(monthLabel || "Current Month")}</strong></div>
      <div><span>Working Days:</span> <strong>${workDays} Days</strong></div>
    `;
    $("pStatusContainer").innerHTML = `<span class="status-stamp-tag status-paid">HR REGISTER</span>`;
    $("pClientHeader").textContent = "Register Details";
    $("pCustomerName").textContent = m.dept || "All Staff";
    $("pCustomerPhone").innerHTML = m.supervisor ? `Supervisor / HR: <b>${safeText(m.supervisor)}</b>` : "";
    $("pCustomerAddress").innerHTML = `Total Staff Listed: <b>${staff.length}</b>`;
    $("pDocBottomType").textContent = "HR Attendance Register";
    $("pStampLabel").textContent = "Prepared By (Timekeeper / HR)";
    $("pSignatureLabel").textContent = "Approved By (Manager)";
    $("pTermsTitle") && ($("pTermsTitle").textContent = "HR Remarks");
    $("pTerms").textContent = m.terms || "";
    renderQuotationAttachmentsPreview();

    $("previewTableHead").innerHTML = `
      <tr>
        <th style="width:32px;text-align:center;">#</th>
        <th>Employee Name</th>
        <th>Designation</th>
        <th style="text-align:center;">Present</th>
        <th style="text-align:center;">Absent</th>
        <th style="text-align:center;">Leave</th>
        <th style="text-align:center;">Late</th>
        <th style="text-align:center;">OT (Hrs)</th>
        <th style="text-align:right;">Att. %</th>
      </tr>`;

    let totalPct = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalOt = 0;
    $("previewItems").innerHTML = staff.length ? staff.map((s, idx) => {
      const p = Number(s.present || 0);
      const a = Number(s.absent || 0);
      const l = Number(s.leave || 0);
      const lt = Number(s.late || 0);
      const ot = Number(s.ot || 0);
      const pct = Math.min(100, Math.round((p / workDays) * 100));
      totalPct += pct;
      totalPresent += p;
      totalAbsent += a;
      totalOt += ot;
      return `<tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="font-weight:700;">${safeText(s.name || "Staff")}</td>
        <td>${safeText(s.designation || "-")}</td>
        <td style="text-align:center;color:#059669;font-weight:700;">${p}</td>
        <td style="text-align:center;color:#dc2626;font-weight:700;">${a}</td>
        <td style="text-align:center;">${l}</td>
        <td style="text-align:center;">${lt}</td>
        <td style="text-align:center;">${ot}</td>
        <td style="text-align:right;font-weight:800;">${pct}%</td>
      </tr>`;
    }).join("") : `<tr><td colspan="9" style="text-align:center;color:#64748b;">No staff added yet.</td></tr>`;

    const avgPct = staff.length ? Math.round(totalPct / staff.length) : 0;
    $("pExtraInfoBox").innerHTML = `
      <div class="bank-info-box" style="background:#f8fafc;border-color:#cbd5e1;color:#0f172a;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div><strong>Total Present Days:</strong> ${totalPresent}</div>
        <div><strong>Total Absent Days:</strong> ${totalAbsent}</div>
        <div><strong>Total Overtime:</strong> ${totalOt} Hrs</div>
        <div><strong>Average Attendance:</strong> ${avgPct}%</div>
      </div>`;

    $("pSubtotal").textContent = String(staff.length);
    $("pDiscount").textContent = workDays + " Days";
    $("pGrandTotal").textContent = avgPct + "%";
    return;
  }

  $("previewTitle").textContent = "Live " + badgeText.toLowerCase().replace(/\b\w/g, c=>c.toUpperCase()) + " Preview";
  $("pDocBadge").textContent = badgeText;
  $("pDocMetaList").innerHTML = metaHtml;
  $("pStatusContainer").innerHTML = statusHtml;
  $("pClientHeader").textContent = clientHeader;
  $("pCustomerName").textContent = clientName;
  $("pCustomerPhone").innerHTML = clientPhone;
  $("pCustomerAddress").innerHTML = clientAddress;
  $("pDocBottomType").textContent = bottomType;
  $("pStampLabel").textContent = stampLabel;
  $("pSignatureLabel").textContent = signatureLabel;
  $("pExtraInfoBox").innerHTML = extraInfoHtml;
  $("pTerms").textContent = m.terms || "";
  renderQuotationAttachmentsPreview();

  // Table Columns
  let subtotal = 0;
  const isChallanNoPrices = (currentModule === "deliveryChallan" && !m.showPrices);

  if (isChallanNoPrices) {
    $("previewTableHead").innerHTML = `
      <tr>
        <th style="width: 32px; text-align: center;">#</th>
        <th>Item Description & Specifications</th>
        <th style="width: 62px; text-align: center;">Unit</th>
        <th style="width: 78px; text-align: center;">Unit Qty</th>
        <th style="width: 78px; text-align: center;">Item Qty</th>
        <th style="width: 90px; text-align: center;">Total Qty</th>
      </tr>`;
    $("previewItems").innerHTML = m.items.map((item, i) => {
      const c = getItemCalculation(item);
      return `
      <tr>
        <td style="text-align:center;font-weight:600;">${i+1}</td>
        <td style="white-space: pre-line;">${safeText(item.description)}</td>
        <td style="text-align:center;font-size:10px;color:#64748b;">${safeText(c.unit)}</td>
        <td style="text-align:center;">${fmtQty(c.unitQty)}</td>
        <td style="text-align:center;">${fmtQty(c.itemQty)}</td>
        <td style="text-align:center;font-weight:700;">${fmtQty(c.qty)}</td>
      </tr>`;
    }).join("");
    $("pTotalsContainer").style.display = "none";
  } else {
    $("previewTableHead").innerHTML = `
      <tr>
        <th style="width: 32px; text-align: center;">#</th>
        <th>Description</th>
        <th style="width: 62px; text-align: center;">Unit</th>
        <th style="width: 72px; text-align: center;">Unit Qty</th>
        <th style="width: 70px; text-align: center;">Item Qty</th>
        <th style="width: 88px; text-align: right;">Rate (Rs.)</th>
        <th style="width: 105px; text-align: right;">Amount (Rs.)</th>
      </tr>`;
    $("previewItems").innerHTML = m.items.map((item, i) => {
      const c = getItemCalculation(item);
      const rate = Math.max(0, Number(item.rate) || 0);
      const amount = c.qty * rate;
      subtotal += amount;
      return `
        <tr>
          <td style="text-align:center;font-weight:600;">${i+1}</td>
          <td style="white-space: pre-line;">${safeText(item.description)}</td>
          <td style="text-align:center;font-size:10px;color:#64748b;">${safeText(c.unit)}</td>
          <td style="text-align:center;">${fmtQty(c.unitQty)}</td>
          <td style="text-align:center;">${fmtQty(c.itemQty)}</td>
          <td style="text-align:right;">${money(rate)}</td>
          <td style="text-align:right;font-weight:600;">${money(amount)}</td>
        </tr>`;
    }).join("");
    $("pTotalsContainer").style.display = "block";
  }

  const discountPercent = Math.min(100, Math.max(0, Number(m.discount) || 0));
  const discount = subtotal * discountPercent / 100;
  const taxable = Math.max(0, subtotal - discount);
  const taxPercent = Math.max(0, Number(m.tax) || 0);
  const tax = taxable * taxPercent / 100;
  const furtherTaxPercent = currentModule === "fbr" ? Math.max(0, Number(m.furtherTax) || 0) : 0;
  const furtherTax = taxable * furtherTaxPercent / 100;
  const posFee = currentModule === "fbr" ? Math.max(0, Number(m.posFee) || 0) : 0;
  const grandTotal = taxable + tax + furtherTax + posFee;

  $("pSubtotal").textContent = "Rs. " + money(subtotal);
  $("pDiscount").textContent = "Rs. " + money(discount) + (discountPercent ? ` (${discountPercent}%)` : "");
  $("pTax").textContent = "Rs. " + money(tax) + (taxPercent ? ` (${taxPercent}%)` : "");
  $("pGrandTotal").textContent = "Rs. " + money(grandTotal);

  if (currentModule === "fbr") {
    if ($("pFbrFurtherTax")) $("pFbrFurtherTax").textContent = "Rs. " + money(furtherTax) + (furtherTaxPercent ? ` (${furtherTaxPercent}%)` : "");
    if ($("pFbrPosFee")) $("pFbrPosFee").textContent = "Rs. " + money(posFee);
    if ($("pFbrExtraTotals")) $("pFbrExtraTotals").classList.remove("hidden");

    const qrPayload = `FBR|USIN:${m.fiscalNumber || m.number || "FBR-001"}|POS:${m.posId || "-"}|NTN:${m.sellerNtn || "-"}|DT:${m.date || getTodayIso()}|TOT:${grandTotal.toFixed(2)}`;
    const qrSvg = generateQrSvg(qrPayload, 86);
    $("pExtraInfoBox").innerHTML = `
      <div class="fbr-qr-box">
        <div class="fbr-qr-svg">${qrSvg}</div>
        <div class="fbr-qr-meta">
          <strong style="color:var(--primary);display:block;margin-bottom:2px;">FBR Fiscal Verification QR</strong>
          <div><b>Fiscal #:</b> ${safeText(m.fiscalNumber || "PENDING")}</div>
          <div><b>POS ID:</b> ${safeText(m.posId || "-")} | <b>Mode:</b> ${safeText(m.paymentMode || "Cash")}</div>
          <div><b>Total Payable:</b> Rs. ${money(grandTotal)}</div>
        </div>
      </div>`;
  } else if ($("pFbrExtraTotals")) {
    $("pFbrExtraTotals").classList.add("hidden");
  }

  if (currentModule === "invoice") {
    $("pInvoiceBalanceRows").classList.remove("hidden");
    const amountPaid = Number(m.amountPaid) || 0;
    const balanceDue = Math.max(0, grandTotal - amountPaid);
    $("pAmountPaid").textContent = "Rs. " + money(amountPaid);
    $("pBalanceDue").textContent = "Rs. " + money(balanceDue);
  } else if (currentModule === "expense") {
    $("pInvoiceBalanceRows").classList.remove("hidden");
    $("pAmountPaid").textContent = safeText(m.payMethod || "Cash");
    $("pBalanceDue").textContent = safeText(m.paidTo || "—");
  } else {
    $("pInvoiceBalanceRows").classList.add("hidden");
  }
}

// CROSS-PAGE 1-CLICK CONVERSIONS & DOCUMENT HISTORY
function calcDocGrandTotal(m) {
  if (!m) return 0;
  if (Array.isArray(m.items) && m.items.length) {
    let sub = 0;
    m.items.forEach(it => {
      if (typeof getItemCalculation === "function") sub += getItemCalculation(it).total;
    });
    const disc = Number(m.discount || 0);
    const afterDisc = Math.max(0, sub - disc);
    const taxAmt = (afterDisc * Number(m.tax || 0)) / 100;
    return afterDisc + taxAmt;
  }
  return Number(m.amount || 0);
}

function recordDocumentHistory(modName) {
  const targetMod = typeof modName === "string" ? modName : currentModule;
  const m = moduleData[targetMod];
  if (!m || !m.number) return;
  if (!Array.isArray(managementData.docHistory)) managementData.docHistory = [];
  const num = String(m.number).trim();
  if (!num) return;
  const date = m.date || m.payDate || getTodayIso();
  const party = m.clientName || m.supplierName || m.empName || m.from || m.payee || m.dept || "";
  const total = calcDocGrandTotal(m);
  const existing = managementData.docHistory.find(d => d.module === targetMod && d.number.toLowerCase() === num.toLowerCase());
  if (existing) {
    existing.date = date;
    existing.party = party;
    existing.total = total;
    existing.updatedAt = Date.now();
  } else {
    managementData.docHistory.unshift({
      id: "doc_" + Date.now(),
      module: targetMod,
      number: num,
      date,
      party,
      total,
      updatedAt: Date.now()
    });
    if (managementData.docHistory.length > 250) managementData.docHistory.length = 250;
  }
  writeStorageState();
}

function checkDuplicateDocNumber() {
  const m = moduleData[currentModule];
  const existingWarn = $("erpDupDocWarn");
  if (!m || !m.number) {
    if (existingWarn) existingWarn.remove();
    return;
  }
  const num = String(m.number).trim().toLowerCase();
  const party = String(m.clientName || m.supplierName || m.empName || m.from || m.payee || "").trim().toLowerCase();
  const date = m.date || m.payDate || "";
  const hist = Array.isArray(managementData.docHistory) ? managementData.docHistory : [];
  const dup = hist.find(d =>
    d.module === currentModule &&
    String(d.number || "").trim().toLowerCase() === num &&
    (String(d.party || "").trim().toLowerCase() !== party || (d.date && date && d.date !== date))
  );
  const tools = document.querySelector(".preview-tools");
  if (!dup) {
    if (existingWarn) existingWarn.remove();
    return;
  }
  if (!existingWarn && tools) {
    const warn = document.createElement("div");
    warn.id = "erpDupDocWarn";
    warn.className = "no-print";
    warn.style.cssText = "background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:8px 12px;border-radius:8px;margin-bottom:10px;font-size:12px;font-weight:700;";
    warn.textContent = `⚠️ Duplicate Document # "${m.number}" already exists in history (${dup.party || "Previous record"}, ${dup.date || ""}). Consider using the next sequence number.`;
    tools.insertAdjacentElement("afterend", warn);
  } else if (existingWarn) {
    existingWarn.textContent = `⚠️ Duplicate Document # "${m.number}" already exists in history (${dup.party || "Previous record"}, ${dup.date || ""}). Consider using the next sequence number.`;
  }
}

function convertQuotationToProforma() {
  syncStateFromInputs();
  recordDocumentHistory("quotation");
  const q = moduleData.quotation;
  const pi = moduleData.proformaInvoice;
  if (!pi.number) pi.number = getSequenceNumber("PI");
  pi.refNo = q.number || "QT-001";
  pi.date = getTodayIso();
  pi.clientName = q.clientName;
  pi.clientPhone = q.clientPhone;
  pi.clientAddress = q.clientAddress;
  pi.items = JSON.parse(JSON.stringify(q.items));
  pi.discount = q.discount;
  pi.tax = q.tax;
  saveData();
  window.location.href = "proforma-invoice.html";
}

function convertQuotationToInvoice() {
  syncStateFromInputs();
  recordDocumentHistory("quotation");
  const q = moduleData.quotation;
  const inv = moduleData.invoice;
  if (!inv.number) inv.number = getSequenceNumber("INV");
  inv.refNo = q.number || "QT-001";
  inv.date = getTodayIso();
  inv.clientName = q.clientName;
  inv.clientPhone = q.clientPhone;
  inv.clientAddress = q.clientAddress;
  inv.items = JSON.parse(JSON.stringify(q.items));
  inv.discount = q.discount;
  inv.tax = q.tax;
  saveData();
  window.location.href = "invoice.html";
}

function convertInvoiceToChallan() {
  syncStateFromInputs();
  recordDocumentHistory("invoice");
  const inv = moduleData.invoice;
  const dc = moduleData.deliveryChallan;
  if (!dc.number) dc.number = getSequenceNumber("DC");
  dc.refNo = inv.number || "INV-001";
  dc.date = getTodayIso();
  dc.clientName = inv.clientName;
  dc.clientPhone = inv.clientPhone;
  dc.clientAddress = inv.clientAddress;
  dc.items = JSON.parse(JSON.stringify(inv.items));
  saveData();
  window.location.href = "delivery-challan.html";
}

function convertInvoiceToReceipt() {
  syncStateFromInputs();
  recordDocumentHistory("invoice");
  const inv = moduleData.invoice;
  const rec = moduleData.receipt;
  const grandTotal = calcDocGrandTotal(inv);
  const paid = Number(inv.amountPaid || 0);
  const payNow = paid > 0 ? paid : grandTotal;
  const bal = Math.max(0, grandTotal - payNow);

  rec.number = getSequenceNumber("REC");
  rec.date = getTodayIso();
  rec.ref = inv.number || "INV-001";
  rec.from = inv.clientName || "Customer";
  rec.phone = inv.clientPhone || "";
  rec.address = inv.clientAddress || "";
  rec.amount = payNow;
  rec.balance = bal;
  rec.purpose = `Payment received against Tax Invoice # ${inv.number || "INV-001"}`;
  saveData();
  window.location.href = "cash-receipt.html";
}

function convertProformaToInvoice() {
  syncStateFromInputs();
  recordDocumentHistory("proformaInvoice");
  const pi = moduleData.proformaInvoice;
  const inv = moduleData.invoice;
  if (!inv.number) inv.number = getSequenceNumber("INV");
  inv.refNo = pi.number || "PI-001";
  inv.date = getTodayIso();
  inv.clientName = pi.clientName;
  inv.clientPhone = pi.clientPhone;
  inv.clientAddress = pi.clientAddress;
  inv.items = JSON.parse(JSON.stringify(pi.items));
  inv.discount = pi.discount;
  inv.tax = pi.tax;
  saveData();
  window.location.href = "invoice.html";
}

// DIRECTORY (CUSTOMERS & SUPPLIERS)
function toggleDirectory(type) {
  activeDirectoryType = type;
  if (type === "customer") {
    $("tabCustomerBtn").style.background = "var(--primary)";
    $("tabSupplierBtn").style.background = "#64748b";
    $("contactTypeLabel").textContent = "Customer Name";
  } else {
    $("tabCustomerBtn").style.background = "#64748b";
    $("tabSupplierBtn").style.background = "var(--primary)";
    $("contactTypeLabel").textContent = "Supplier / Vendor Name";
  }
  clearContactForm();
  renderDirectory();
}

function saveContact() {
  const name = $("recordContactName").value.trim();
  if (!name) {
    alert("Please enter a name.");
    $("recordContactName").focus();
    return;
  }
  const editId = $("editingContactId").value;
  const list = activeDirectoryType === "customer" ? customers : suppliers;
  const contactObj = {
    id: editId || Date.now().toString(),
    name,
    phone: $("recordContactPhone").value.trim(),
    email: $("recordContactEmail").value.trim(),
    address: $("recordContactAddress").value.trim()
  };

  if (editId) {
    const idx = list.findIndex(c => c.id === editId);
    if (idx !== -1) list[idx] = contactObj;
  } else {
    list.push(contactObj);
  }

  saveData();
  renderDirectory();
  populateDropdowns();
  clearContactForm();
}

function clearContactForm() {
  if (!$("editingContactId")) return;
  $("editingContactId").value = "";
  $("recordContactName").value = "";
  $("recordContactPhone").value = "";
  $("recordContactEmail").value = "";
  $("recordContactAddress").value = "";
  $("saveContactBtn").textContent = "+ Save to Directory";
  $("cancelContactEdit").classList.add("hidden");
}

function editContact(id) {
  const list = activeDirectoryType === "customer" ? customers : suppliers;
  const c = list.find(x => x.id === id);
  if (!c) return;
  $("editingContactId").value = c.id;
  $("recordContactName").value = c.name || "";
  $("recordContactPhone").value = c.phone || "";
  $("recordContactEmail").value = c.email || "";
  $("recordContactAddress").value = c.address || "";
  $("saveContactBtn").textContent = "Update Contact";
  $("cancelContactEdit").classList.remove("hidden");
  $("recordContactName").focus();
}

function deleteContact(id) {
  const list = activeDirectoryType === "customer" ? customers : suppliers;
  const c = list.find(x => x.id === id);
  if (!c || !confirm("Delete " + c.name + "?")) return;
  if (activeDirectoryType === "customer") {
    customers = customers.filter(x => x.id !== id);
  } else {
    suppliers = suppliers.filter(x => x.id !== id);
  }
  saveData();
  renderDirectory();
  populateDropdowns();
  if ($("editingContactId").value === id) clearContactForm();
}

function renderDirectory() {
  if (!$("directoryList")) return;
  const search = $("directorySearch").value.toLowerCase().trim();
  const list = activeDirectoryType === "customer" ? customers : suppliers;
  const filtered = list.filter(c =>
    [c.name, c.phone, c.email, c.address].some(v => String(v || "").toLowerCase().includes(search))
  );

  $("directoryList").innerHTML = filtered.length
    ? filtered.map(c => `
        <div class="item-editor" style="margin-bottom:6px;">
          <div style="font-weight:700;color:#1e293b;">${safeText(c.name)}</div>
          <div style="font-size:11px;color:#64748b;">${safeText(c.phone || "")} ${c.email ? '| ' + safeText(c.email) : ''}</div>
          <div style="font-size:11px;color:#64748b;">${safeText(c.address || "")}</div>
          <div style="margin-top:6px;display:flex;gap:6px;">
            <button type="button" onclick="editContact('${safeText(c.id)}')">Edit</button>
            <button type="button" class="btn-danger" onclick="deleteContact('${safeText(c.id)}')">Delete</button>
          </div>
        </div>
      `).join("")
    : "<p style='font-size:12px;color:#94a3b8;'>No contacts found.</p>";
}

function populateDropdowns() {
  const custOptions = '<option value="">-- Choose Customer --</option>' +
    customers.map(c => `<option value="${safeText(c.id)}">${safeText(c.name)}</option>`).join("");
  const suppOptions = '<option value="">-- Select Supplier --</option>' +
    suppliers.map(c => `<option value="${safeText(c.id)}">${safeText(c.name)}</option>`).join("");

  ["quoteCustomerSelect", "invoiceCustomerSelect", "fbrCustomerSelect", "challanCustomerSelect", "proformaCustomerSelect", "prodCustomerSelect"].forEach(id => {
    if ($(id)) $(id).innerHTML = custOptions;
  });
  if ($("poSupplierSelect")) $("poSupplierSelect").innerHTML = suppOptions;
}

function applySelectedCustomer(id) {
  if (!id) return;
  const c = customers.find(x => x.id === id);
  if (!c) return;

  if (currentModule === "quotation") {
    $("quoteCustomerName").value = c.name || "";
    $("quoteCustomerPhone").value = c.phone || "";
    $("quoteCustomerAddress").value = c.address || "";
  } else if (currentModule === "invoice") {
    $("invoiceCustomerName").value = c.name || "";
    $("invoiceCustomerPhone").value = c.phone || "";
    $("invoiceCustomerAddress").value = c.address || "";
  } else if (currentModule === "fbr") {
    $("fbrCustomerName").value = c.name || "";
    $("fbrCustomerPhone").value = c.phone || "";
    $("fbrCustomerAddress").value = c.address || "";
  } else if (currentModule === "deliveryChallan") {
    $("challanCustomerName").value = c.name || "";
    $("challanCustomerPhone").value = c.phone || "";
    $("challanCustomerAddress").value = c.address || "";
  } else if (currentModule === "proformaInvoice") {
    $("proformaCustomerName").value = c.name || "";
    $("proformaCustomerPhone").value = c.phone || "";
    $("proformaCustomerAddress").value = c.address || "";
  } else if (currentModule === "production") {
    if ($("prodClientName")) $("prodClientName").value = c.name || "";
    if ($("prodClientPhone")) $("prodClientPhone").value = c.phone || "";
  }
  updatePreview();
  saveData();
}

function applySelectedSupplier(id) {
  if (!id) return;
  const s = suppliers.find(x => x.id === id);
  if (!s) return;
  $("poSupplierName").value = s.name || "";
  $("poSupplierPhone").value = s.phone || "";
  $("poSupplierAddress").value = s.address || "";
  updatePreview();
  saveData();
}

// MOBILE VIEWPORT & ZOOM
function setMobileView(view) {
  const layout = $("mainLayout");
  if (!layout) return;
  const btnEdit = $("btnViewEditor");
  const btnPrev = $("btnViewPreview");
  if (view === "editor") {
    layout.classList.add("view-editor");
    layout.classList.remove("view-preview");
    if (btnEdit) btnEdit.classList.add("active");
    if (btnPrev) btnPrev.classList.remove("active");
  } else {
    layout.classList.remove("view-editor");
    layout.classList.add("view-preview");
    if (btnEdit) btnEdit.classList.remove("active");
    if (btnPrev) btnPrev.classList.add("active");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let isFitWidth = false;
function togglePaperFit() {
  const vp = $("paperViewport");
  const paper = $("paper");
  const btn = $("btnFitToggle");
  if (!vp || !paper) return;
  isFitWidth = !isFitWidth;
  if (isFitWidth) {
    const screenW = vp.clientWidth - 24;
    const scale = Math.min(1, Math.max(0.4, screenW / 820));
    paper.style.transform = `scale(${scale})`;
    paper.style.transformOrigin = "top center";
    paper.style.marginBottom = `-${Math.round((1 - scale) * paper.offsetHeight)}px`;
    if (btn) btn.textContent = "🔍 100% Size";
  } else {
    paper.style.transform = "none";
    paper.style.marginBottom = "0px";
    if (btn) btn.textContent = "📱 Fit to Screen";
  }
}

// PERSISTENCE (SHARED ACROSS ALL PAGES)
function syncCompanyStateFromDom() {
  if (!$("companyName")) return;
  companyState = {
    name: $("companyName").value,
    address: $("companyAddress").value,
    phone: $("companyPhone").value,
    email: $("companyEmail").value,
    website: $("companyWebsite").value,
    brandColor: $("brandColor").value,
    logoData,
    stampData,
    signatureData,
    watermarkData,
    watermarkOn: $("watermarkOn").checked,
    watermarkMode: $("watermarkMode").value,
    watermarkText: $("watermarkText").value,
    watermarkTextColor: $("watermarkTextColor").value,
    watermarkTextSize: $("watermarkTextSize").value,
    watermarkOpacity: $("watermarkOpacity").value,
    stampOn: $("stampOn").checked,
    signatureOn: $("signatureOn").checked
  };
}

function applyCompanyStateToDom() {
  if (!$("companyName")) return;
  $("companyName").value = companyState.name || "";
  $("companyAddress").value = companyState.address || "";
  $("companyPhone").value = companyState.phone || "";
  $("companyEmail").value = companyState.email || "";
  $("companyWebsite").value = companyState.website || "";
  if (companyState.brandColor) $("brandColor").value = companyState.brandColor;
  $("watermarkOn").checked = companyState.watermarkOn ?? true;
  $("watermarkMode").value = companyState.watermarkMode || "image";
  $("watermarkText").value = companyState.watermarkText || "";
  $("watermarkTextColor").value = companyState.watermarkTextColor || "#999999";
  $("watermarkTextSize").value = companyState.watermarkTextSize || 55;
  $("watermarkOpacity").value = companyState.watermarkOpacity || 7;
  $("stampOn").checked = companyState.stampOn ?? true;
  $("signatureOn").checked = companyState.signatureOn ?? true;
}

function openErpDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("No IndexedDB"));
    const req = indexedDB.open(APP_CONFIG.dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(APP_CONFIG.storeName)) {
        db.createObjectStore(APP_CONFIG.storeName);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  try {
    const db = await openErpDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(APP_CONFIG.storeName, "readonly");
      const req = tx.objectStore(APP_CONFIG.storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return undefined; }
}

async function idbSet(key, value) {
  try {
    const db = await openErpDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(APP_CONFIG.storeName, "readwrite");
      const req = tx.objectStore(APP_CONFIG.storeName).put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return false; }
}

function writeStorageState() {
  const dataToSave = {
    company: companyState,
    customers,
    suppliers,
    moduleData,
    managementData,
    recycleBin,
    updatedAt: Date.now()
  };
  try {
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(dataToSave));
  } catch (e) { /* IndexedDB handles large payloads beyond 5MB */ }
  idbSet(APP_CONFIG.storageKey, dataToSave);
}

function saveData() {
  try {
    if ($("companyName")) {
      syncStateFromInputs();
      syncCompanyStateFromDom();
    }
    writeStorageState();
    const sc = (Number(localStorage.getItem(APP_CONFIG.saveCountKey)) || 0) + 1;
    localStorage.setItem(APP_CONFIG.saveCountKey, String(sc));
    if ($("saveStatus")) $("saveStatus").textContent = "✓ Saved to IndexedDB & Local Backup";
  } catch(e) {
    if ($("saveStatus")) $("saveStatus").textContent = "Storage limit reached. Download backup.";
  }
}

function mergeManagementData(incoming) {
  if (!incoming || typeof incoming !== "object") return;
  if (Array.isArray(incoming.inventory)) managementData.inventory = incoming.inventory;
  if (Array.isArray(incoming.inventoryLogs)) managementData.inventoryLogs = incoming.inventoryLogs;
  if (Array.isArray(incoming.docHistory)) managementData.docHistory = incoming.docHistory;
  if (Array.isArray(incoming.accounts)) managementData.accounts = incoming.accounts;
  if (Array.isArray(incoming.crmLeads)) managementData.crmLeads = incoming.crmLeads;
  if (Array.isArray(incoming.productionJobs)) managementData.productionJobs = incoming.productionJobs;
  if (typeof incoming.activeProductionId === "string") managementData.activeProductionId = incoming.activeProductionId;
}

function applyParsedState(parsed) {
  if (!parsed || typeof parsed !== "object") return;
  if (parsed.company && typeof parsed.company === "object") {
    companyState = Object.assign({}, companyState, parsed.company);
    logoData = companyState.logoData || "";
    stampData = companyState.stampData || "";
    signatureData = companyState.signatureData || "";
    watermarkData = companyState.watermarkData || "";
    applyCompanyStateToDom();
  }
  if (Array.isArray(parsed.customers)) customers = parsed.customers;
  if (Array.isArray(parsed.suppliers)) suppliers = parsed.suppliers;
  if (parsed.moduleData) {
    Object.keys(parsed.moduleData).forEach(k => {
      if (moduleData[k] && parsed.moduleData[k]) {
        moduleData[k] = Object.assign({}, moduleData[k], parsed.moduleData[k]);
      } else {
        moduleData[k] = parsed.moduleData[k];
      }
    });
  }
  if (parsed.managementData) mergeManagementData(parsed.managementData);
  if (Array.isArray(parsed.recycleBin)) recycleBin = parsed.recycleBin;
}

function loadData() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) return;
    applyParsedState(JSON.parse(raw));
  } catch(e) {
    console.warn("Could not load previous session data.");
  }
}

function exportCompleteBackup() {
  try {
    if ($("companyName")) {
      syncStateFromInputs();
      syncCompanyStateFromDom();
    }
    let counters = {};
    try {
      counters = JSON.parse(localStorage.getItem(APP_CONFIG.countersKey) || "{}");
    } catch(e) { counters = {}; }
    const backup = {
      app: APP_CONFIG.name,
      version: APP_CONFIG.version,
      date: new Date().toISOString(),
      company: companyState,
      customers,
      suppliers,
      moduleData,
      managementData,
      recycleBin,
      counters
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `erp-suite-backup-${getTodayIso()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem(APP_CONFIG.lastBackupKey, String(Date.now()));
    idbSet(APP_CONFIG.lastBackupKey, Date.now());
    const toast = $("erpBackupToast");
    if (toast) toast.remove();
    if (typeof updateShellBadges === "function") updateShellBadges();
  } catch(e) {
    alert("Backup creation failed.");
  }
}

function restoreBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed !== "object" || (!parsed.moduleData && !parsed.company && !parsed.managementData && !parsed.customers)) {
        throw new Error("Invalid ERP Suite backup structure.");
      }
      const modCount = parsed.moduleData ? Object.keys(parsed.moduleData).length : 0;
      const invCount = parsed.managementData && Array.isArray(parsed.managementData.inventory) ? parsed.managementData.inventory.length : 0;
      const accCount = parsed.managementData && Array.isArray(parsed.managementData.accounts) ? parsed.managementData.accounts.length : 0;
      const custCount = Array.isArray(parsed.customers) ? parsed.customers.length : 0;
      const bDate = parsed.date ? String(parsed.date).slice(0, 10) : "Unknown date";
      const ok = confirm(
        `Restore Backup Confirmation:\n` +
        `• Backup Date: ${bDate}\n` +
        `• Document Modules: ${modCount}\n` +
        `• Customers: ${custCount} | Inventory Items: ${invCount} | Accounts: ${accCount}\n\n` +
        `Current unsaved data will be replaced. Continue?`
      );
      if (!ok) return;

      applyParsedState(parsed);
      if (parsed.counters && typeof parsed.counters === "object") {
        localStorage.setItem(APP_CONFIG.countersKey, JSON.stringify(parsed.counters));
      }
      writeStorageState();
      localStorage.setItem(APP_CONFIG.lastBackupKey, String(Date.now()));
      alert("Backup successfully validated & restored! Reloading...");
      location.reload();
    } catch(err) {
      alert("Invalid backup file! Please select a valid ERP Suite .json backup.");
    }
  };
  reader.readAsText(file);
}

function bindBackupControls(btnExportId, btnRestoreId, inputFileId) {
  if ($(btnExportId)) $(btnExportId).addEventListener("click", exportCompleteBackup);
  if ($(btnRestoreId) && $(inputFileId)) {
    $(btnRestoreId).addEventListener("click", () => $(inputFileId).click());
    $(inputFileId).addEventListener("change", e => {
      restoreBackupFile(e.target.files[0]);
      e.target.value = "";
    });
  }
}

function handleImage(input, setter) {
  const file = input && input.files && input.files[0];
  if (!file) return;

  // Validate the selected file before reading it.
  if (!file.type || !file.type.startsWith("image/")) {
    alert("Please select a valid image file (PNG, JPG, WEBP, GIF, etc.).");
    input.value = "";
    return;
  }
  const maxImageSize = 5 * 1024 * 1024;
  if (file.size > maxImageSize) {
    alert("Image is too large. Please select an image under 5 MB.");
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== "string" || !reader.result.startsWith("data:image/")) {
      alert("The selected image could not be read. Please try another image.");
      input.value = "";
      return;
    }
    try {
      setter(reader.result);
      updatePreview();
      saveData();
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Image could not be saved. Please try a smaller image.");
    } finally {
      // Allow selecting the same image again if needed.
      input.value = "";
    }
  };
  reader.onerror = () => {
    console.error("Could not read selected image:", reader.error);
    alert("Could not read this image. Please try another file.");
    input.value = "";
  };
  reader.onabort = () => {
    input.value = "";
  };
  reader.readAsDataURL(file);
}

// ABOUT MODAL
function showAbout() {
  const main = $("mainLayout") || $("dashboardMain");
  if (main) main.classList.add("hidden");
  const about = $("aboutSection");
  if (!about) return;
  about.classList.remove("hidden");
  about.style.cssText = `
    display: flex !important;
    position: fixed !important;
    inset: 0;
    width: 100%;
    min-height: 100vh;
    z-index: 999999;
    background: #ffffff;
    align-items: center;
    justify-content: center;
    overflow-y: auto;
    padding: 20px;
    box-sizing: border-box;
  `;
  window.scrollTo(0, 0);
}

function hideAbout() {
  const about = $("aboutSection");
  const main = $("mainLayout") || $("dashboardMain");
  if (about) {
    about.classList.add("hidden");
    about.style.display = "none";
  }
  if (main) {
    main.classList.remove("hidden");
    main.style.display = "";
  }
  document.body.style.overflow = "auto";
  window.scrollTo(0, 0);
}

window.closeOtherSuiteCategory = function(openCategory) {
  if (!openCategory.open) return;
  document.querySelectorAll('.suite-accordion').forEach(function(category) {
    if (category !== openCategory) category.open = false;
  });
};

// BIND EVENTS ON DOCUMENT PAGES
function bindEditorEvents() {
  if (!$("companyName")) return;

  if ($("logoFile")) $("logoFile").addEventListener("change", e => handleImage(e.target, v => logoData = v));
  if ($("stampFile")) $("stampFile").addEventListener("change", e => handleImage(e.target, v => stampData = v));
  if ($("signatureFile")) $("signatureFile").addEventListener("change", e => handleImage(e.target, v => signatureData = v));
  if ($("watermarkFile")) $("watermarkFile").addEventListener("change", e => handleImage(e.target, v => watermarkData = v));

  if ($("saveContactBtn")) $("saveContactBtn").addEventListener("click", saveContact);
  if ($("cancelContactEdit")) $("cancelContactEdit").addEventListener("click", clearContactForm);
  if ($("directorySearch")) $("directorySearch").addEventListener("input", renderDirectory);

  if ($("itemEditors")) {
    $("itemEditors").addEventListener("keydown", event => {
      if (event.target.dataset.key === "description" && event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
      }
    });

    $("itemEditors").addEventListener("input", event => {
      const i = event.target.dataset.i;
      const key = event.target.dataset.key;
      if (i === undefined || !key) return;
      const item = moduleData[currentModule].items[Number(i)];
      if (key === "customUnit") {
        item.unit = event.target.value;
        item.customUnitMode = true;
      } else if (["description", "unit", "calcMode", "dimensionUnit"].includes(key)) {
        item[key] = event.target.value;
      } else {
        item[key] = Math.max(0, Number(event.target.value) || 0);
      }
      refreshItemViews(event.target.closest(".item-editor"), item);
      updatePreview();
      saveData();
    });

    $("itemEditors").addEventListener("change", event => {
      const key = event.target.dataset.key;
      if (key === "unit") {
        const i = Number(event.target.dataset.i);
        const item = moduleData[currentModule].items[i];
        if (event.target.value === "__custom__") {
          item.customUnitMode = true;
          item.unit = "";
        } else {
          item.unit = event.target.value;
          item.customUnitMode = false;
        }
        renderItems();
        updatePreview();
        saveData();
      } else if (key === "calcMode") {
        renderItems();
        updatePreview();
        saveData();
      }
    });

    $("itemEditors").addEventListener("click", event => {
      const i = event.target.dataset.remove;
      if (i === undefined) return;
      moduleData[currentModule].items.splice(Number(i), 1);
      renderItems();
      updatePreview();
      saveData();
    });
  }

  if ($("addAttStaffBtn")) {
    $("addAttStaffBtn").addEventListener("click", () => {
      if (!moduleData.attendance) return;
      if (!Array.isArray(moduleData.attendance.staff)) moduleData.attendance.staff = [];
      moduleData.attendance.staff.push({ name: "New Staff", designation: "Staff", present: 26, absent: 0, leave: 0, late: 0, ot: 0 });
      renderAttendanceEditors();
      updatePreview();
      saveData();
    });
  }

  if ($("attStaffEditors")) {
    $("attStaffEditors").addEventListener("input", e => {
      const i = e.target.getAttribute("data-att-i");
      const k = e.target.getAttribute("data-att-key");
      if (i === null || !k || !moduleData.attendance) return;
      const row = moduleData.attendance.staff[Number(i)];
      if (!row) return;
      row[k] = (k === "name" || k === "designation") ? e.target.value : (Number(e.target.value) || 0);
      updatePreview();
      saveData();
    });
    $("attStaffEditors").addEventListener("click", e => {
      const rem = e.target.getAttribute("data-att-remove");
      if (rem === null || !moduleData.attendance) return;
      moduleData.attendance.staff.splice(Number(rem), 1);
      renderAttendanceEditors();
      updatePreview();
      saveData();
    });
  }

  if ($("addItem")) {
    $("addItem").addEventListener("click", () => {
      moduleData[currentModule].items.push({
        description: "New Product / Line Item",
        unit: "Nos",
        unitQty: 1,
        itemQty: 1,
        calcMode: "manual",
        width: 0,
        height: 0,
        dimensionUnit: "in",
        rate: 0
      });
      renderItems();
      updatePreview();
      saveData();
    });
  }

  if ($("addAttStaffBtn")) {
    $("addAttStaffBtn").addEventListener("click", () => {
      if (!moduleData.attendance) return;
      if (!Array.isArray(moduleData.attendance.staff)) moduleData.attendance.staff = [];
      moduleData.attendance.staff.push({ name: "New Staff", designation: "Staff", present: 26, absent: 0, leave: 0, late: 0, ot: 0 });
      renderAttendanceEditors();
      updatePreview();
      saveData();
    });
  }

  if ($("attStaffEditors")) {
    $("attStaffEditors").addEventListener("input", e => {
      const i = e.target.getAttribute("data-att-i");
      const k = e.target.getAttribute("data-att-key");
      if (i === null || !k || !moduleData.attendance) return;
      const row = moduleData.attendance.staff[Number(i)];
      if (!row) return;
      row[k] = (k === "name" || k === "designation") ? e.target.value : (Number(e.target.value) || 0);
      updatePreview();
      saveData();
    });
    $("attStaffEditors").addEventListener("click", e => {
      const rem = e.target.getAttribute("data-att-remove");
      if (rem === null || !moduleData.attendance) return;
      moduleData.attendance.staff.splice(Number(rem), 1);
      renderAttendanceEditors();
      updatePreview();
      saveData();
    });
  }

  document.querySelectorAll("input, textarea, select").forEach(el => {
    if (el.type === "file" || el.dataset.noAutosync === "true") return;
    el.addEventListener("input", () => { updatePreview(); saveData(); });
    el.addEventListener("change", () => { updatePreview(); saveData(); });
  });

  bindBackupControls("backupBtn", "restoreBtn", "restoreFile");

  if ($("resetCurrentDocBtn")) {
    $("resetCurrentDocBtn").addEventListener("click", () => {
      if (currentModule === "production") {
        if (confirm("Reset active Job Card BOM & notes?")) {
          const job = getActiveProductionJob();
          if (job) {
            job.bom = [{ material: "Primary Raw Material", qty: 1, unit: "Units", cost: 0 }];
            job.notes = "";
            syncProductionInputsFromState();
            renderBomEditors();
            updatePreview();
            saveData();
          }
        }
        return;
      }
      if (confirm(`Reset active ${currentModule} document data?`)) {
        moduleData[currentModule].items = [{ description: "Sample Product / Service", unit: "Nos", unitQty: 1, itemQty: 1, calcMode: "manual", rate: 1000 }];
        syncModuleInputsToState();
        renderItems();
        updatePreview();
        saveData();
      }
    });
  }

  if ($("factoryResetBtn")) {
    $("factoryResetBtn").addEventListener("click", async () => {
      const confirmation = prompt("Type RESET to permanently erase all ERP data from this browser:");
      if (confirmation !== "RESET") return;
      if (!confirm("FINAL WARNING: This will erase company details, uploaded logos/signatures, documents, customers, suppliers, inventory and all saved ERP records on this browser. Continue?")) return;

      const button = $("factoryResetBtn");
      if (button) {
        button.disabled = true;
        button.textContent = "Resetting...";
      }

      try {
        // Clear IndexedDB first: the ERP stores its primary saved state here.
        // Keep the database itself so open connections do not block deletion.
        const db = await openErpDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(APP_CONFIG.storeName, "readwrite");
          tx.objectStore(APP_CONFIG.storeName).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error || new Error("Could not clear ERP IndexedDB storage."));
          tx.onabort = () => reject(tx.error || new Error("ERP storage reset was cancelled."));
        });
        db.close();

        // Clear local settings, counters, backup timestamps and cached state.
        localStorage.clear();
        alert("Factory Reset completed. The ERP will now restart with fresh default data.");
        location.reload();
      } catch (error) {
        console.error("Factory Reset failed:", error);
        if (button) {
          button.disabled = false;
          button.textContent = "Factory Reset";
        }
        alert("Factory Reset could not finish. Please close other ERP tabs/windows and try again. Details: " + (error && error.message ? error.message : "Storage access error"));
      }
    });
  }
}

// =====================================
// OFFLINE ISO 18004 QR CODE SVG GENERATOR (FBR MODULE)
// =====================================
function generateQrSvg(text, sizePx = 92) {
  const bytes = Array.from(new TextEncoder().encode(String(text || "")));
  const SPECS = [
    [1, 21, 16, 10, 1, 16, 0, 0, []],
    [2, 25, 28, 16, 1, 28, 0, 0, [6, 18]],
    [3, 29, 44, 26, 1, 44, 0, 0, [6, 22]],
    [4, 33, 64, 18, 2, 32, 0, 0, [6, 26]],
    [5, 37, 86, 24, 2, 43, 0, 0, [6, 30]],
    [6, 41, 108, 16, 4, 27, 0, 0, [6, 34]],
    [7, 45, 124, 18, 4, 31, 0, 0, [6, 22, 38]],
    [8, 49, 154, 22, 2, 38, 2, 39, [6, 24, 42]]
  ];
  let spec = SPECS.find(s => (bytes.length + 2) <= s[2]);
  if (!spec) {
    spec = SPECS[SPECS.length - 1];
    bytes.length = spec[2] - 2;
  }
  const [ver, N, totalData, ecLen, g1Cnt, g1Data, g2Cnt, g2Data, align] = spec;
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11D : 0);
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const gfMul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
  function rsEncode(data, ecCount) {
    let poly = [1];
    for (let i = 0; i < ecCount; i++) {
      const next = new Array(poly.length + 1).fill(0);
      const factor = EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    const rem = new Uint8Array(ecCount);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ rem[0];
      for (let j = 0; j < ecCount - 1; j++) rem[j] = rem[j + 1];
      rem[ecCount - 1] = 0;
      for (let j = 0; j < ecCount; j++) rem[j] ^= gfMul(poly[j + 1], factor);
    }
    return rem;
  }
  const bits = [];
  const pushBits = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  for (const b of bytes) pushBits(b, 8);
  pushBits(0, Math.min(4, totalData * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const dataCodewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    dataCodewords.push(v);
  }
  const pads = [0xEC, 0x11];
  let pi = 0;
  while (dataCodewords.length < totalData) dataCodewords.push(pads[pi++ % 2]);
  const dataBlocks = [], ecBlocks = [];
  let offset = 0;
  for (let b = 0; b < g1Cnt; b++) {
    const blk = dataCodewords.slice(offset, offset + g1Data);
    offset += g1Data;
    dataBlocks.push(blk);
    ecBlocks.push(rsEncode(blk, ecLen));
  }
  for (let b = 0; b < g2Cnt; b++) {
    const blk = dataCodewords.slice(offset, offset + g2Data);
    offset += g2Data;
    dataBlocks.push(blk);
    ecBlocks.push(rsEncode(blk, ecLen));
  }
  const finalCodewords = [];
  const maxD = Math.max(g1Data, g2Data);
  for (let i = 0; i < maxD; i++) for (const blk of dataBlocks) if (i < blk.length) finalCodewords.push(blk[i]);
  for (let i = 0; i < ecLen; i++) for (const blk of ecBlocks) finalCodewords.push(blk[i]);

  const grid = Array.from({ length: N }, () => new Int8Array(N).fill(-1));
  const reserved = Array.from({ length: N }, () => new Uint8Array(N));
  const setMod = (r, c, val, isFunc = true) => {
    if (r < 0 || c < 0 || r >= N || c >= N) return;
    grid[r][c] = val ? 1 : 0;
    if (isFunc) reserved[r][c] = 1;
  };
  const placeFinder = (r0, c0) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = r0 + dr, c = c0 + dc;
        if (r < 0 || c < 0 || r >= N || c >= N) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onRing = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setMod(r, c, inOuter && (onRing || inCenter) ? 1 : 0, true);
      }
    }
  };
  placeFinder(0, 0); placeFinder(0, N - 7); placeFinder(N - 7, 0);
  for (const r of align) for (const c of align) {
    if (reserved[r][c]) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      setMod(r + dr, c + dc, (Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0)) ? 1 : 0, true);
    }
  }
  for (let i = 8; i < N - 8; i++) {
    if (!reserved[6][i]) setMod(6, i, i % 2 === 0 ? 1 : 0, true);
    if (!reserved[i][6]) setMod(i, 6, i % 2 === 0 ? 1 : 0, true);
  }
  setMod(N - 8, 8, 1, true);
  for (let i = 0; i < 9; i++) { reserved[8][i] = 1; reserved[i][8] = 1; }
  for (let i = N - 8; i < N; i++) { reserved[8][i] = 1; reserved[i][8] = 1; }
  if (ver >= 7) {
    let rem = ver << 12;
    for (let i = 17; i >= 12; i--) if ((rem >> i) & 1) rem ^= (0x1F25 << (i - 12));
    const verBits = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = (verBits >> i) & 1, a = Math.floor(i / 3), b = (i % 3) + N - 11;
      setMod(a, b, bit, true); setMod(b, a, bit, true);
    }
  }
  const bitStream = [];
  for (const cw of finalCodewords) for (let i = 7; i >= 0; i--) bitStream.push((cw >> i) & 1);
  let bi = 0, up = true;
  for (let c = N - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    for (let step = 0; step < N; step++) {
      const r = up ? (N - 1 - step) : step;
      for (const col of [c, c - 1]) if (!reserved[r][col]) grid[r][col] = bi < bitStream.length ? bitStream[bi++] : 0;
    }
    up = !up;
  }
  const MASKS = [
    (r, c) => (r + c) % 2 === 0, (r, c) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
  ];
  let best = null, bestScore = Infinity;
  for (let id = 0; id < 8; id++) {
    const m = grid.map(row => Int8Array.from(row));
    const fn = MASKS[id];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!reserved[r][c] && fn(r, c)) m[r][c] ^= 1;
    const fmtData = (0b00 << 3) | id;
    let rem = fmtData << 10;
    for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= (0x537 << (i - 10));
    const fmt = ((fmtData << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) m[8][i] = (fmt >> (14 - i)) & 1;
    m[8][7] = (fmt >> 8) & 1; m[8][8] = (fmt >> 7) & 1; m[7][8] = (fmt >> 6) & 1;
    for (let i = 9; i < 15; i++) m[14 - i][8] = (fmt >> (14 - i)) & 1;
    for (let i = 0; i < 7; i++) m[N - 1 - i][8] = (fmt >> i) & 1;
    for (let i = 0; i < 8; i++) m[8][N - 8 + i] = (fmt >> (7 + i)) & 1;
    let p = 0;
    for (let r = 0; r < N; r++) {
      let runR = 1, runC = 1;
      for (let i = 1; i < N; i++) {
        if (m[r][i] === m[r][i - 1]) runR++; else { if (runR >= 5) p += runR - 2; runR = 1; }
        if (m[i][r] === m[i - 1][r]) runC++; else { if (runC >= 5) p += runC - 2; runC = 1; }
      }
      if (runR >= 5) p += runR - 2;
      if (runC >= 5) p += runC - 2;
    }
    for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3;
    }
    let dark = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (m[r][c]) dark++;
    p += Math.floor(Math.abs((dark * 100) / (N * N) - 50) / 5) * 10;
    if (p < bestScore) { bestScore = p; best = m; }
  }
  const quiet = 3, viewN = N + quiet * 2;
  let path = "";
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (best[r][c]) path += `M${c + quiet},${r + quiet}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${viewN} ${viewN}" shape-rendering="crispEdges"><rect width="${viewN}" height="${viewN}" fill="#ffffff"/><path d="${path}" fill="#0f172a"/></svg>`;
}

// FBR DIGITAL INVOICE HELPERS
function generateFbrFiscalNo() {
  const m = moduleData.fbr;
  const pos = ($("fbrPosId") ? $("fbrPosId").value : m.posId || "110045").replace(/\D/g, "") || "110045";
  const dt = (($("fbrDate") ? $("fbrDate").value : m.date) || getTodayIso()).replace(/-/g, "").slice(2);
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  const code = `${pos}-${dt}-${rand}`;
  if ($("fbrFiscalNumber")) $("fbrFiscalNumber").value = code;
  m.fiscalNumber = code;
  updatePreview();
  saveData();
}

function importTaxInvoiceToFbr() {
  const inv = moduleData.invoice;
  const f = moduleData.fbr;
  f.clientName = inv.clientName || f.clientName;
  f.clientPhone = inv.clientPhone || f.clientPhone;
  f.clientAddress = inv.clientAddress || f.clientAddress;
  f.items = JSON.parse(JSON.stringify(inv.items || []));
  f.discount = inv.discount || 0;
  f.tax = inv.tax || 18;
  syncModuleInputsToState();
  renderItems();
  updatePreview();
  saveData();
}

// =====================================
// PRODUCTION & JOB CARD MODULE
// =====================================
function getActiveProductionJob() {
  if (!Array.isArray(managementData.productionJobs) || !managementData.productionJobs.length) {
    managementData.productionJobs = createDefaultManagementData().productionJobs;
  }
  let job = managementData.productionJobs.find(j => j.id === managementData.activeProductionId);
  if (!job) {
    job = managementData.productionJobs[0];
    managementData.activeProductionId = job.id;
  }
  if (!Array.isArray(job.bom)) job.bom = [];
  return job;
}

function renderProductionJobSelect() {
  const sel = $("prodSelectJob");
  if (!sel) return;
  const active = getActiveProductionJob();
  sel.innerHTML = managementData.productionJobs.map(j =>
    `<option value="${safeText(j.id)}" ${j.id === active.id ? "selected" : ""}>${safeText(j.jobNumber)} — ${safeText(j.productName || "Job")}</option>`
  ).join("");
}

function syncProductionInputsFromState() {
  const job = getActiveProductionJob();
  renderProductionJobSelect();
  if ($("prodJobNumber")) $("prodJobNumber").value = job.jobNumber || "";
  if ($("prodStartDate")) $("prodStartDate").value = job.startDate || getTodayIso();
  if ($("prodTargetDate")) $("prodTargetDate").value = job.targetDate || "";
  if ($("prodRefNo")) $("prodRefNo").value = job.refNo || "";
  if ($("prodClientName")) $("prodClientName").value = job.clientName || "";
  if ($("prodClientPhone")) $("prodClientPhone").value = job.clientPhone || "";
  if ($("prodProductName")) $("prodProductName").value = job.productName || "";
  if ($("prodOrderQty")) $("prodOrderQty").value = job.orderQty ?? 1;
  if ($("prodOrderUnit")) $("prodOrderUnit").value = job.orderUnit || "Pcs";
  if ($("prodPriority")) $("prodPriority").value = job.priority || "Normal";
  if ($("prodStage")) $("prodStage").value = job.stage || "Queued";
  if ($("prodSupervisor")) $("prodSupervisor").value = job.supervisor || "";
  if ($("prodNotes")) $("prodNotes").value = job.notes || "";
}

function syncProductionStateFromInputs() {
  const job = getActiveProductionJob();
  if ($("prodJobNumber")) job.jobNumber = $("prodJobNumber").value;
  if ($("prodStartDate")) job.startDate = $("prodStartDate").value;
  if ($("prodTargetDate")) job.targetDate = $("prodTargetDate").value;
  if ($("prodRefNo")) job.refNo = $("prodRefNo").value;
  if ($("prodClientName")) job.clientName = $("prodClientName").value;
  if ($("prodClientPhone")) job.clientPhone = $("prodClientPhone").value;
  if ($("prodProductName")) job.productName = $("prodProductName").value;
  if ($("prodOrderQty")) job.orderQty = Math.max(1, Number($("prodOrderQty").value) || 1);
  if ($("prodOrderUnit")) job.orderUnit = $("prodOrderUnit").value;
  if ($("prodPriority")) job.priority = $("prodPriority").value;
  if ($("prodStage")) job.stage = $("prodStage").value;
  if ($("prodSupervisor")) job.supervisor = $("prodSupervisor").value;
  if ($("prodNotes")) job.notes = $("prodNotes").value;
}

function renderBomEditors() {
  const host = $("bomEditors");
  if (!host) return;
  const job = getActiveProductionJob();
  if ($("bomCountBadge")) $("bomCountBadge").textContent = `(${job.bom.length} ${job.bom.length === 1 ? "Material" : "Materials"})`;
  host.innerHTML = job.bom.map((row, idx) => `
    <div class="item-editor">
      <label>Material #${idx + 1} Name / Spec</label>
      <input type="text" data-bom-i="${idx}" data-bom-k="material" value="${safeText(row.material)}" placeholder="Raw material or component">
      <div style="display:flex;gap:8px;">
        <div style="flex:1;"><label>Qty</label><input type="number" min="0" step="any" data-bom-i="${idx}" data-bom-k="qty" value="${Number(row.qty) || 0}"></div>
        <div style="flex:1;"><label>Unit</label><input type="text" data-bom-i="${idx}" data-bom-k="unit" value="${safeText(row.unit || "Units")}"></div>
        <div style="flex:1;"><label>Cost (Rs.)</label><input type="number" min="0" step="any" data-bom-i="${idx}" data-bom-k="cost" value="${Number(row.cost) || 0}"></div>
      </div>
      <button type="button" class="btn-danger" data-bom-remove="${idx}">Remove Material</button>
    </div>
  `).join("");
}

function renderProductionPreview() {
  const job = getActiveProductionJob();
  renderProductionJobSelect();
  $("previewTitle").textContent = "Live Production Job Card Preview";
  $("pDocBadge").textContent = "PRODUCTION JOB CARD";
  $("pDocMetaList").innerHTML = `
    <div><span>Job Card #:</span> <strong>${safeText(job.jobNumber || "JC-001")}</strong></div>
    <div><span>Start Date:</span> <strong>${safeText(job.startDate || "")}</strong></div>
    ${job.targetDate ? `<div><span>Target Date:</span> <strong>${safeText(job.targetDate)}</strong></div>` : ""}
    ${job.refNo ? `<div><span>Order / Ref #:</span> <strong>${safeText(job.refNo)}</strong></div>` : ""}
  `;
  const priClass = job.priority === "Urgent" ? "status-unpaid" : (job.priority === "High" ? "status-partial" : "status-paid");
  $("pStatusContainer").innerHTML = `<span class="status-stamp-tag ${priClass}">${safeText((job.priority || "Normal").toUpperCase())} • ${safeText((job.stage || "Queued").toUpperCase())}</span>`;
  $("pClientHeader").textContent = "Production Order & Job Details";
  $("pCustomerName").textContent = job.productName || "Production Item";
  $("pCustomerPhone").innerHTML = `Client: <b>${safeText(job.clientName || "Internal Stock")}</b> ${job.clientPhone ? `(${safeText(job.clientPhone)})` : ""} | Order Qty: <b>${fmtQty(job.orderQty)} ${safeText(job.orderUnit || "Pcs")}</b>`;
  $("pCustomerAddress").innerHTML = job.supervisor ? `Assigned Supervisor / Dept: <b>${safeText(job.supervisor)}</b>` : "";
  $("pDocBottomType").textContent = "Factory Production Job Card & BOM";
  $("pStampLabel").textContent = "Production Supervisor";
  $("pSignatureLabel").textContent = "Quality Control Approved";
  $("pTerms").textContent = job.notes || "";

  const stageIdx = Math.max(0, PRODUCTION_STAGES.indexOf(job.stage || "Queued"));
  const stageSteps = PRODUCTION_STAGES.map((st, i) => {
    const cls = i < stageIdx ? "done" : (i === stageIdx ? "current" : "");
    return `<div class="job-stage-step ${cls}">${safeText(st)}</div>`;
  }).join("");
  $("pExtraInfoBox").innerHTML = `<div style="margin-top:8px;"><strong style="font-size:10.5px;color:var(--primary);display:block;margin-bottom:5px;">Stage-Wise Manufacturing Progress</strong><div class="job-stage-bar">${stageSteps}</div></div>`;

  let totalCost = 0;
  $("previewTableHead").innerHTML = `
    <tr>
      <th style="width:32px;text-align:center;">#</th>
      <th>Bill of Materials (Raw Material / Component)</th>
      <th style="width:72px;text-align:center;">Qty</th>
      <th style="width:72px;text-align:center;">Unit</th>
      <th style="width:92px;text-align:right;">Unit Cost</th>
      <th style="width:105px;text-align:right;">Total Cost</th>
    </tr>`;
  $("previewItems").innerHTML = job.bom.length ? job.bom.map((row, i) => {
    const q = Math.max(0, Number(row.qty) || 0);
    const c = Math.max(0, Number(row.cost) || 0);
    const t = q * c;
    totalCost += t;
    return `
      <tr>
        <td style="text-align:center;font-weight:600;">${i + 1}</td>
        <td>${safeText(row.material)}</td>
        <td style="text-align:center;">${fmtQty(q)}</td>
        <td style="text-align:center;">${safeText(row.unit || "Units")}</td>
        <td style="text-align:right;">${money(c)}</td>
        <td style="text-align:right;font-weight:600;">${money(t)}</td>
      </tr>`;
  }).join("") : `<tr><td colspan="6" style="text-align:center;color:#94a3b8;">No BOM materials added yet.</td></tr>`;

  const orderQty = Math.max(1, Number(job.orderQty) || 1);
  if ($("pTotalsContainer")) $("pTotalsContainer").style.display = "block";
  if ($("pSubtotal")) $("pSubtotal").textContent = "Rs. " + money(totalCost);
  if ($("pDiscount")) $("pDiscount").textContent = `${fmtQty(orderQty)} ${safeText(job.orderUnit || "Pcs")}`;
  if ($("pTax")) $("pTax").textContent = `${job.bom.length} Items`;
  if ($("pGrandTotal")) $("pGrandTotal").textContent = "Rs. " + money(totalCost / orderQty) + " / unit";
}

function newProductionJob() {
  const num = getSequenceNumber("JC");
  const id = "job_" + Date.now();
  managementData.productionJobs.unshift({
    id,
    jobNumber: num,
    startDate: getTodayIso(),
    targetDate: "",
    refNo: "",
    clientName: "Valued Customer",
    clientPhone: "",
    productName: "New Production Job",
    orderQty: 1,
    orderUnit: "Pcs",
    priority: "Normal",
    stage: "Queued",
    supervisor: "",
    notes: "1. Follow standard production checklist.",
    bom: [{ material: "Primary Raw Material", qty: 1, unit: "Units", cost: 0 }]
  });
  managementData.activeProductionId = id;
  syncProductionInputsFromState();
  renderBomEditors();
  updatePreview();
  saveData();
}

function deleteProductionJob() {
  if (managementData.productionJobs.length <= 1) {
    alert("At least one job card must remain.");
    return;
  }
  const active = getActiveProductionJob();
  if (!confirm(`Move Job Card ${active.jobNumber} to Recycle Bin?`)) return;
  moveToRecycleBin("production", `Job Card: ${active.jobNumber} (${active.productName || "Job"})`, active);
  managementData.productionJobs = managementData.productionJobs.filter(j => j.id !== active.id);
  managementData.activeProductionId = managementData.productionJobs[0].id;
  syncProductionInputsFromState();
  renderBomEditors();
  updatePreview();
  saveData();
}

function pullQuotationToProduction() {
  const q = moduleData.quotation;
  const job = getActiveProductionJob();
  job.refNo = q.number || job.refNo;
  job.clientName = q.clientName || job.clientName;
  job.clientPhone = q.clientPhone || job.clientPhone;
  if (Array.isArray(q.items) && q.items.length) {
    job.productName = q.items[0].description || job.productName;
    job.orderQty = Math.max(1, Number(q.items[0].itemQty) || 1);
    job.orderUnit = q.items[0].unit || "Pcs";
  }
  syncProductionInputsFromState();
  updatePreview();
  saveData();
}

function initProductionEvents() {
  if (currentModule !== "production") return;
  renderBomEditors();
  if ($("prodSelectJob")) {
    $("prodSelectJob").addEventListener("change", e => {
      managementData.activeProductionId = e.target.value;
      syncProductionInputsFromState();
      renderBomEditors();
      updatePreview();
      saveData();
    });
  }
  if ($("addBomBtn")) {
    $("addBomBtn").addEventListener("click", () => {
      const job = getActiveProductionJob();
      job.bom.push({ material: "New Material", qty: 1, unit: "Units", cost: 0 });
      renderBomEditors();
      updatePreview();
      saveData();
    });
  }
  if ($("bomEditors")) {
    $("bomEditors").addEventListener("input", e => {
      const idx = e.target.dataset.bomI;
      const key = e.target.dataset.bomK;
      if (idx === undefined || !key) return;
      const job = getActiveProductionJob();
      const row = job.bom[Number(idx)];
      if (!row) return;
      row[key] = (key === "qty" || key === "cost") ? Math.max(0, Number(e.target.value) || 0) : e.target.value;
      updatePreview();
      saveData();
    });
    $("bomEditors").addEventListener("click", e => {
      const idx = e.target.dataset.bomRemove;
      if (idx === undefined) return;
      const job = getActiveProductionJob();
      job.bom.splice(Number(idx), 1);
      renderBomEditors();
      updatePreview();
      saveData();
    });
  }
}

// =====================================
// INVENTORY & STOCK MODULE
// =====================================
function initInventoryPage() {
  if (currentModule !== "inventory" || !$("invTableBody")) return;
  let editingInvId = "";

  function clearInvForm() {
    editingInvId = "";
    $("invEditId").value = "";
    $("invSku").value = "";
    $("invName").value = "";
    $("invCategory").value = "General";
    $("invUnit").value = "Pcs";
    $("invQty").value = 0;
    $("invReorder").value = 10;
    $("invCost").value = 0;
    $("invSell").value = 0;
    $("invWarehouse").value = "Main Warehouse";
    $("invSaveBtn").textContent = "+ Add Stock Item";
    $("invCancelBtn").classList.add("hidden");
  }

  function renderInventory() {
    const items = managementData.inventory || [];
    const logs = managementData.inventoryLogs || [];
    const query = ($("invSearch").value || "").toLowerCase().trim();
    const filter = $("invFilter").value || "all";

    let totalUnits = 0, totalVal = 0, lowCount = 0;
    items.forEach(it => {
      const q = Number(it.qty) || 0;
      const r = Number(it.reorderLevel) || 0;
      totalUnits += q;
      totalVal += q * (Number(it.costPrice) || 0);
      if (q <= r) lowCount++;
    });
    $("invKpiSkus").textContent = items.length;
    $("invKpiUnits").textContent = fmtQty(totalUnits);
    $("invKpiValue").textContent = "Rs. " + money(totalVal);
    $("invKpiLow").textContent = lowCount;

    const filtered = items.filter(it => {
      const isLow = (Number(it.qty) || 0) <= (Number(it.reorderLevel) || 0);
      if (filter === "low" && !isLow) return false;
      if (!query) return true;
      return [it.sku, it.name, it.category, it.warehouse].some(v => String(v || "").toLowerCase().includes(query));
    });

    $("invTableBody").innerHTML = filtered.length ? filtered.map(it => {
      const q = Number(it.qty) || 0;
      const r = Number(it.reorderLevel) || 0;
      const isLow = q <= r;
      const val = q * (Number(it.costPrice) || 0);
      return `
        <tr>
          <td><strong>${safeText(it.sku)}</strong></td>
          <td><div style="font-weight:700;color:#0f172a;">${safeText(it.name)}</div><div style="font-size:11px;color:#64748b;">${safeText(it.category || "General")} • ${safeText(it.warehouse || "Main")}</div></td>
          <td><strong>${fmtQty(q)}</strong> ${safeText(it.unit)} <div style="font-size:10.5px;color:#64748b;">Min: ${fmtQty(r)}</div></td>
          <td>Rs. ${money(it.costPrice)} / ${money(it.sellPrice)}</td>
          <td><strong>Rs. ${money(val)}</strong></td>
          <td><span class="badge-pill ${isLow ? "badge-low" : "badge-ok"}">${isLow ? "Low Stock" : "In Stock"}</span></td>
          <td class="no-print-mgmt" style="white-space:nowrap;">
            <button type="button" class="btn-xs btn-success" data-inv-in="${safeText(it.id)}">+In</button>
            <button type="button" class="btn-xs btn-secondary" data-inv-out="${safeText(it.id)}">-Out</button>
            <button type="button" class="btn-xs" data-inv-edit="${safeText(it.id)}">Edit</button>
            <button type="button" class="btn-xs btn-danger" data-inv-del="${safeText(it.id)}">Del</button>
          </td>
        </tr>`;
    }).join("") : `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px;">No inventory items found.</td></tr>`;

    $("invLogsBody").innerHTML = logs.length ? logs.slice(0, 20).map(l => `
      <tr>
        <td>${safeText(l.date)}</td>
        <td><strong>${safeText(l.sku)}</strong> — ${safeText(l.itemName)}</td>
        <td><span class="badge-pill ${l.delta >= 0 ? "badge-ok" : "badge-warn"}">${l.delta >= 0 ? "+" : ""}${fmtQty(l.delta)} ${safeText(l.unit)}</span></td>
        <td>${safeText(l.reason || "-")}</td>
      </tr>
    `).join("") : `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No stock movements logged yet.</td></tr>`;
  }

  $("invSaveBtn").addEventListener("click", () => {
    const name = $("invName").value.trim();
    if (!name) { alert("Please enter item name."); $("invName").focus(); return; }
    const sku = $("invSku").value.trim() || getSequenceNumber("SKU");
    const obj = {
      id: editingInvId || ("inv_" + Date.now()),
      sku,
      name,
      category: $("invCategory").value.trim() || "General",
      unit: $("invUnit").value.trim() || "Pcs",
      qty: Math.max(0, Number($("invQty").value) || 0),
      reorderLevel: Math.max(0, Number($("invReorder").value) || 0),
      costPrice: Math.max(0, Number($("invCost").value) || 0),
      sellPrice: Math.max(0, Number($("invSell").value) || 0),
      warehouse: $("invWarehouse").value.trim() || "Main Warehouse"
    };
    if (editingInvId) {
      const idx = managementData.inventory.findIndex(x => x.id === editingInvId);
      if (idx !== -1) managementData.inventory[idx] = obj;
    } else {
      managementData.inventory.unshift(obj);
    }
    saveData();
    clearInvForm();
    renderInventory();
  });

  $("invCancelBtn").addEventListener("click", clearInvForm);
  $("invSearch").addEventListener("input", renderInventory);
  $("invFilter").addEventListener("change", renderInventory);

  $("invTableBody").addEventListener("click", e => {
    const inId = e.target.dataset.invIn;
    const outId = e.target.dataset.invOut;
    const editId = e.target.dataset.invEdit;
    const delId = e.target.dataset.invDel;

    if (inId || outId) {
      const id = inId || outId;
      const item = managementData.inventory.find(x => x.id === id);
      if (!item) return;
      const amtStr = prompt(`Enter quantity to ${inId ? "ADD (Stock In)" : "DEDUCT (Stock Out)"} for "${item.name}":`, "1");
      if (amtStr === null) return;
      const amt = Math.max(0, Number(amtStr) || 0);
      if (!amt) return;
      const reason = prompt("Reference / Reason (e.g. PO-001, Sale INV-001, Adjustment):", inId ? "Stock Purchase" : "Sales Dispatch") || "";
      const delta = inId ? amt : -amt;
      item.qty = Math.max(0, (Number(item.qty) || 0) + delta);
      managementData.inventoryLogs.unshift({
        date: new Date().toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" }),
        sku: item.sku,
        itemName: item.name,
        unit: item.unit,
        delta,
        reason
      });
      if (managementData.inventoryLogs.length > 100) managementData.inventoryLogs.length = 100;
      saveData();
      renderInventory();
    } else if (editId) {
      const item = managementData.inventory.find(x => x.id === editId);
      if (!item) return;
      editingInvId = item.id;
      $("invEditId").value = item.id;
      $("invSku").value = item.sku || "";
      $("invName").value = item.name || "";
      $("invCategory").value = item.category || "General";
      $("invUnit").value = item.unit || "Pcs";
      $("invQty").value = item.qty || 0;
      $("invReorder").value = item.reorderLevel || 0;
      $("invCost").value = item.costPrice || 0;
      $("invSell").value = item.sellPrice || 0;
      $("invWarehouse").value = item.warehouse || "";
      $("invSaveBtn").textContent = "Update Stock Item";
      $("invCancelBtn").classList.remove("hidden");
      $("invName").focus();
    } else if (delId) {
      const item = managementData.inventory.find(x => x.id === delId);
      if (!item || !confirm(`Move ${item.name} to Recycle Bin?`)) return;
      moveToRecycleBin("inventory", `Inventory: ${item.name} (${item.sku || ""})`, item);
      managementData.inventory = managementData.inventory.filter(x => x.id !== delId);
      if (editingInvId === delId) clearInvForm();
      saveData();
      renderInventory();
    }
  });

  bindBackupControls("mgmtBackupBtn", "mgmtRestoreBtn", "mgmtRestoreFile");
  renderInventory();
}

// =====================================
// ACCOUNTS & PAYMENTS MODULE
// =====================================
function initAccountsPage() {
  if (currentModule !== "accounts" || !$("accTableBody")) return;
  if ($("accDate") && !$("accDate").value) $("accDate").value = getTodayIso();

  function populateAccParties() {
    const sel = $("accPartySelect");
    if (!sel) return;
    const pType = $("accPartyType").value;
    const list = pType === "supplier" ? suppliers : (pType === "customer" ? customers : []);
    sel.innerHTML = '<option value="">-- Optional: Pick Saved Contact --</option>' +
      list.map(c => `<option value="${safeText(c.name)}">${safeText(c.name)}</option>`).join("");
  }

  function calcDocGrandTotal(doc) {
    if (!doc || !Array.isArray(doc.items)) return 0;
    let sub = 0;
    doc.items.forEach(it => {
      const c = getItemCalculation(it);
      sub += c.qty * Math.max(0, Number(it.rate) || 0);
    });
    const disc = sub * Math.min(100, Math.max(0, Number(doc.discount) || 0)) / 100;
    const taxable = Math.max(0, sub - disc);
    const tax = taxable * Math.max(0, Number(doc.tax) || 0) / 100;
    return taxable + tax;
  }

  function renderAccounts() {
    const rows = managementData.accounts || [];
    const query = ($("accSearch").value || "").toLowerCase().trim();
    const filter = $("accFilter").value || "all";

    let totalReceipts = 0, totalOut = 0, totalReceivables = 0, totalPayables = 0;
    rows.forEach(r => {
      const amt = Number(r.amount) || 0;
      if (r.type === "receipt") totalReceipts += amt;
      else if (r.type === "payment") { totalOut += amt; }
      else if (r.type === "expense") { totalOut += amt; }
      else if (r.type === "receivable") totalReceivables += amt;
      else if (r.type === "payable") totalPayables += amt;
    });
    const netCash = totalReceipts - totalOut;

    $("accKpiReceipts").textContent = "Rs. " + money(totalReceipts);
    $("accKpiOut").textContent = "Rs. " + money(totalOut);
    $("accKpiReceivable").textContent = "Rs. " + money(totalReceivables);
    $("accKpiPayable").textContent = "Rs. " + money(totalPayables);
    $("accKpiNet").textContent = "Rs. " + money(netCash);

    const TYPE_LABELS = {
      receipt: ["Receipt (In)", "badge-ok"],
      payment: ["Supplier Payment (Out)", "badge-warn"],
      expense: ["Business Expense (Out)", "badge-low"],
      receivable: ["Customer Receivable", "badge-info"],
      payable: ["Supplier Payable", "badge-muted"]
    };

    const filtered = rows.filter(r => {
      if (filter !== "all" && r.type !== filter) return false;
      if (!query) return true;
      return [r.partyName, r.refNo, r.method, r.notes].some(v => String(v || "").toLowerCase().includes(query));
    });

    $("accTableBody").innerHTML = filtered.length ? filtered.map(r => {
      const [label, cls] = TYPE_LABELS[r.type] || ["Entry", "badge-muted"];
      return `
        <tr>
          <td>${safeText(r.date)}</td>
          <td><span class="badge-pill ${cls}">${label}</span></td>
          <td><strong>${safeText(r.partyName)}</strong><div style="font-size:11px;color:#64748b;">${safeText(r.notes || "")}</div></td>
          <td>${safeText(r.method || "-")}</td>
          <td>${safeText(r.refNo || "-")}</td>
          <td style="text-align:right;font-weight:700;">Rs. ${money(r.amount)}</td>
          <td class="no-print-mgmt"><button type="button" class="btn-xs btn-danger" data-acc-del="${safeText(r.id)}">Del</button></td>
        </tr>`;
    }).join("") : `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px;">No ledger entries found.</td></tr>`;
  }

  $("accPartyType").addEventListener("change", populateAccParties);
  $("accPartySelect").addEventListener("change", e => {
    if (e.target.value) $("accPartyName").value = e.target.value;
  });

  $("accSaveBtn").addEventListener("click", () => {
    const partyName = $("accPartyName").value.trim();
    const amount = Math.max(0, Number($("accAmount").value) || 0);
    if (!partyName || !amount) {
      alert("Please enter Party / Description and a valid Amount.");
      return;
    }
    managementData.accounts.unshift({
      id: "acc_" + Date.now(),
      date: $("accDate").value || getTodayIso(),
      type: $("accType").value,
      partyType: $("accPartyType").value,
      partyName,
      method: $("accMethod").value,
      refNo: $("accRef").value.trim(),
      amount,
      notes: $("accNotes").value.trim()
    });
    $("accAmount").value = "";
    $("accRef").value = "";
    $("accNotes").value = "";
    saveData();
    renderAccounts();
  });

  if ($("accPullInvoiceBtn")) {
    $("accPullInvoiceBtn").addEventListener("click", () => {
      const inv = moduleData.invoice;
      const total = calcDocGrandTotal(inv);
      $("accType").value = Number(inv.amountPaid) > 0 ? "receipt" : "receivable";
      $("accPartyType").value = "customer";
      populateAccParties();
      $("accPartyName").value = inv.clientName || "Customer";
      $("accRef").value = inv.number || "INV-001";
      $("accAmount").value = (Number(inv.amountPaid) > 0 ? Number(inv.amountPaid) : total).toFixed(2);
      $("accNotes").value = `Imported from Tax Invoice ${inv.number || ""}`;
    });
  }

  if ($("accPullPoBtn")) {
    $("accPullPoBtn").addEventListener("click", () => {
      const po = moduleData.purchaseOrder;
      const total = calcDocGrandTotal(po);
      $("accType").value = "payable";
      $("accPartyType").value = "supplier";
      populateAccParties();
      $("accPartyName").value = po.supplierName || "Supplier";
      $("accRef").value = po.number || "PO-001";
      $("accAmount").value = total.toFixed(2);
      $("accNotes").value = `Imported from Purchase Order ${po.number || ""}`;
    });
  }

  $("accSearch").addEventListener("input", renderAccounts);
  $("accFilter").addEventListener("change", renderAccounts);
  $("accTableBody").addEventListener("click", e => {
    const delId = e.target.dataset.accDel;
    const entry = managementData.accounts.find(x => x.id === delId);
    if (!delId || !entry || !confirm("Move this ledger entry to Recycle Bin?")) return;
    moveToRecycleBin("accounts", `Account (${entry.type}): ${entry.partyName || "Party"} — Rs. ${money(entry.amount)}`, entry);
    managementData.accounts = managementData.accounts.filter(x => x.id !== delId);
    saveData();
    renderAccounts();
  });

  bindBackupControls("mgmtBackupBtn", "mgmtRestoreBtn", "mgmtRestoreFile");
  populateAccParties();
  renderAccounts();
}

// =====================================
// CRM MODULE
// =====================================
function initCrmPage() {
  if (currentModule !== "crm" || !$("crmTableBody")) return;
  let editingLeadId = "";

  function clearLeadForm() {
    editingLeadId = "";
    $("crmName").value = "";
    $("crmPhone").value = "";
    $("crmEmail").value = "";
    $("crmCity").value = "";
    $("crmDealTitle").value = "";
    $("crmValue").value = 0;
    $("crmStage").value = "New Lead";
    $("crmFollowUp").value = getTodayIso();
    $("crmNotes").value = "";
    $("crmSaveBtn").textContent = "+ Add Lead / Deal";
    $("crmCancelBtn").classList.add("hidden");
  }

  function renderCrm() {
    const leads = managementData.crmLeads || [];
    const query = ($("crmSearch").value || "").toLowerCase().trim();
    const stageFilter = $("crmStageFilter").value || "all";

    let activeVal = 0, wonVal = 0, activeCount = 0;
    leads.forEach(l => {
      const v = Number(l.value) || 0;
      if (l.stage === "Won") wonVal += v;
      else if (l.stage !== "Lost") { activeVal += v; activeCount++; }
    });
    $("crmKpiTotal").textContent = leads.length;
    $("crmKpiActive").textContent = activeCount;
    $("crmKpiPipeline").textContent = "Rs. " + money(activeVal);
    $("crmKpiWon").textContent = "Rs. " + money(wonVal);

    const STAGE_CLASS = {
      "New Lead": "badge-info",
      "Contacted": "badge-muted",
      "Quotation Sent": "badge-warn",
      "Negotiation": "badge-warn",
      "Won": "badge-ok",
      "Lost": "badge-low"
    };

    const filtered = leads.filter(l => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (!query) return true;
      return [l.name, l.phone, l.city, l.dealTitle, l.notes].some(v => String(v || "").toLowerCase().includes(query));
    });

    $("crmTableBody").innerHTML = filtered.length ? filtered.map(l => `
      <tr>
        <td>
          <strong>${safeText(l.name)}</strong>
          <div style="font-size:11px;color:#64748b;">${safeText(l.phone || "")} ${l.city ? "• " + safeText(l.city) : ""}</div>
        </td>
        <td>
          <div style="font-weight:600;">${safeText(l.dealTitle || "-")}</div>
          <div style="font-size:11px;color:#64748b;">${safeText(l.notes || "")}</div>
        </td>
        <td><strong>Rs. ${money(l.value)}</strong></td>
        <td>
          <select class="no-print-mgmt" data-crm-stage="${safeText(l.id)}" style="padding:4px 6px;font-size:11.5px;width:auto;">
            ${["New Lead", "Contacted", "Quotation Sent", "Negotiation", "Won", "Lost"].map(s =>
              `<option value="${s}" ${l.stage === s ? "selected" : ""}>${s}</option>`
            ).join("")}
          </select>
          <span class="badge-pill ${STAGE_CLASS[l.stage] || "badge-muted"}" style="margin-top:3px;">${safeText(l.stage)}</span>
        </td>
        <td>${safeText(l.followUpDate || "-")}</td>
        <td class="no-print-mgmt" style="white-space:nowrap;">
          <button type="button" class="btn-xs btn-success" data-crm-quote="${safeText(l.id)}" title="Open Quotation for this lead">⚡ Quote</button>
          <button type="button" class="btn-xs btn-secondary" data-crm-sync="${safeText(l.id)}" title="Save to Master Customer Directory">+Dir</button>
          <button type="button" class="btn-xs" data-crm-edit="${safeText(l.id)}">Edit</button>
          <button type="button" class="btn-xs btn-danger" data-crm-del="${safeText(l.id)}">Del</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px;">No leads or deals found.</td></tr>`;
  }

  $("crmSaveBtn").addEventListener("click", () => {
    const name = $("crmName").value.trim();
    if (!name) { alert("Please enter client/lead name."); $("crmName").focus(); return; }
    const obj = {
      id: editingLeadId || ("crm_" + Date.now()),
      name,
      phone: $("crmPhone").value.trim(),
      email: $("crmEmail").value.trim(),
      city: $("crmCity").value.trim(),
      dealTitle: $("crmDealTitle").value.trim(),
      value: Math.max(0, Number($("crmValue").value) || 0),
      stage: $("crmStage").value,
      followUpDate: $("crmFollowUp").value,
      notes: $("crmNotes").value.trim()
    };
    if (editingLeadId) {
      const idx = managementData.crmLeads.findIndex(x => x.id === editingLeadId);
      if (idx !== -1) managementData.crmLeads[idx] = obj;
    } else {
      managementData.crmLeads.unshift(obj);
    }
    saveData();
    clearLeadForm();
    renderCrm();
  });

  $("crmCancelBtn").addEventListener("click", clearLeadForm);
  $("crmSearch").addEventListener("input", renderCrm);
  $("crmStageFilter").addEventListener("change", renderCrm);

  $("crmTableBody").addEventListener("change", e => {
    const id = e.target.dataset.crmStage;
    if (!id) return;
    const lead = managementData.crmLeads.find(x => x.id === id);
    if (!lead) return;
    lead.stage = e.target.value;
    saveData();
    renderCrm();
  });

  $("crmTableBody").addEventListener("click", e => {
    const quoteId = e.target.dataset.crmQuote;
    const syncId = e.target.dataset.crmSync;
    const editId = e.target.dataset.crmEdit;
    const delId = e.target.dataset.crmDel;

    if (quoteId) {
      const lead = managementData.crmLeads.find(x => x.id === quoteId);
      if (!lead) return;
      moduleData.quotation.clientName = lead.name;
      moduleData.quotation.clientPhone = lead.phone || "";
      moduleData.quotation.clientAddress = lead.city || "";
      if (lead.dealTitle) {
        moduleData.quotation.items = [{ description: lead.dealTitle, unit: "Lot", unitQty: 1, itemQty: 1, calcMode: "manual", rate: Number(lead.value) || 0 }];
      }
      saveData();
      window.location.href = "quotation.html";
    } else if (syncId) {
      const lead = managementData.crmLeads.find(x => x.id === syncId);
      if (!lead) return;
      const exists = customers.some(c => c.name.toLowerCase() === lead.name.toLowerCase());
      if (exists) {
        alert(`"${lead.name}" is already in Customer Directory.`);
      } else {
        customers.push({ id: "cust_" + Date.now(), name: lead.name, phone: lead.phone || "", email: lead.email || "", address: lead.city || "" });
        saveData();
        alert(`"${lead.name}" added to Master Customer Directory!`);
      }
    } else if (editId) {
      const lead = managementData.crmLeads.find(x => x.id === editId);
      if (!lead) return;
      editingLeadId = lead.id;
      $("crmName").value = lead.name || "";
      $("crmPhone").value = lead.phone || "";
      $("crmEmail").value = lead.email || "";
      $("crmCity").value = lead.city || "";
      $("crmDealTitle").value = lead.dealTitle || "";
      $("crmValue").value = lead.value || 0;
      $("crmStage").value = lead.stage || "New Lead";
      $("crmFollowUp").value = lead.followUpDate || "";
      $("crmNotes").value = lead.notes || "";
      $("crmSaveBtn").textContent = "Update Lead";
      $("crmCancelBtn").classList.remove("hidden");
      $("crmName").focus();
    } else if (delId) {
      const lead = managementData.crmLeads.find(x => x.id === delId);
      if (!lead || !confirm(`Move lead "${lead.name}" to Recycle Bin?`)) return;
      moveToRecycleBin("crm", `CRM Lead: ${lead.name} (${lead.dealTitle || ""})`, lead);
      managementData.crmLeads = managementData.crmLeads.filter(x => x.id !== delId);
      if (editingLeadId === delId) clearLeadForm();
      saveData();
      renderCrm();
    }
  });

  bindBackupControls("mgmtBackupBtn", "mgmtRestoreBtn", "mgmtRestoreFile");
  clearLeadForm();
  renderCrm();
}

// =====================================
// PHASE 1: RECYCLE BIN, INDEXEDDB HYDRATION, PWA & ENTERPRISE SHELL
// =====================================
function moveToRecycleBin(sourceType, label, data) {
  if (!Array.isArray(recycleBin)) recycleBin = [];
  recycleBin.unshift({
    id: "rb_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    sourceType,
    label,
    deletedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    data
  });
  if (recycleBin.length > 50) recycleBin.length = 50;
  if (typeof updateShellBadges === "function") updateShellBadges();
}

function restoreFromRecycleBin(rbId) {
  const idx = recycleBin.findIndex(x => x.id === rbId);
  if (idx === -1) return;
  const entry = recycleBin[idx];
  if (entry.sourceType === "inventory") managementData.inventory.push(entry.data);
  else if (entry.sourceType === "accounts") managementData.accounts.push(entry.data);
  else if (entry.sourceType === "crm") managementData.crmLeads.push(entry.data);
  else if (entry.sourceType === "production") managementData.productionJobs.push(entry.data);
  recycleBin.splice(idx, 1);
  writeStorageState();
  renderRecycleBinModal();
  if (typeof updateShellBadges === "function") updateShellBadges();
  if (currentModule === "inventory" && typeof renderInventory === "function") renderInventory();
  if (currentModule === "accounts" && typeof renderAccounts === "function") renderAccounts();
  if (currentModule === "crm" && typeof renderCrm === "function") renderCrm();
  if (currentModule === "production" && typeof renderProductionPreview === "function") {
    syncProductionInputsFromState();
    renderProductionPreview();
  }
}

function emptyRecycleBin() {
  if (!recycleBin.length || !confirm("Permanently clear all items in Recycle Bin?")) return;
  recycleBin = [];
  writeStorageState();
  renderRecycleBinModal();
  if (typeof updateShellBadges === "function") updateShellBadges();
}

function getBackupStatusInfo() {
  const last = Number(localStorage.getItem(APP_CONFIG.lastBackupKey) || 0);
  const saves = Number(localStorage.getItem(APP_CONFIG.saveCountKey) || 0);
  const daysAgo = last ? Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24)) : null;
  const due = (last && daysAgo >= 7) || (!last && saves >= 5);
  return { last, daysAgo, saves, due };
}

function getSystemAlerts() {
  const alerts = [];
  const bInfo = getBackupStatusInfo();
  if (bInfo.due) {
    alerts.push({
      level: "warning",
      title: "Automatic Backup Reminder",
      detail: bInfo.last ? `Last JSON backup was ${bInfo.daysAgo} days ago.` : "You have made changes without a recent JSON backup.",
      actionText: "Download Backup Now",
      actionFn: "exportCompleteBackup()"
    });
  }
  const lowItems = (managementData.inventory || []).filter(i => Number(i.qty || 0) <= Number(i.reorderLevel || 0));
  lowItems.forEach(item => {
    alerts.push({
      level: "danger",
      title: `Low Stock: ${item.name}`,
      detail: `Remaining: ${item.qty} ${item.unit || ""} (Reorder level: ${item.reorderLevel})`,
      href: "inventory.html"
    });
  });
  if (moduleData.invoice && moduleData.invoice.status && moduleData.invoice.status !== "PAID") {
    alerts.push({
      level: "info",
      title: `Active Invoice ${moduleData.invoice.number || ""} is ${moduleData.invoice.status}`,
      detail: `Client: ${moduleData.invoice.clientName || "Customer"}`,
      href: "invoice.html"
    });
  }
  return alerts;
}

function updateShellBadges() {
  const alertCount = getSystemAlerts().length;
  const rbCount = Array.isArray(recycleBin) ? recycleBin.length : 0;
  const alertEl = $("erpAlertCount");
  const rbEl = $("erpRecycleCount");
  if (alertEl) {
    alertEl.textContent = alertCount;
    alertEl.classList.toggle("hidden", alertCount === 0);
  }
  if (rbEl) {
    rbEl.textContent = rbCount;
    rbEl.classList.toggle("hidden", rbCount === 0);
  }
}

function renderRecycleBinModal() {
  const body = $("erpRecycleBody");
  if (!body) return;
  if (!recycleBin.length) {
    body.innerHTML = `<p style="color:#64748b;text-align:center;padding:20px 0;">Recycle Bin is empty.</p>`;
    return;
  }
  body.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:12px;color:#64748b;">${recycleBin.length} deleted item(s)</span>
      <button type="button" onclick="emptyRecycleBin()" class="btn-danger" style="width:auto;margin:0;padding:5px 10px;font-size:12px;">Empty Bin</button>
    </div>
    ${recycleBin.map(item => `
      <div class="erp-search-item">
        <div>
          <strong style="font-size:13px;">${safeText(item.label)}</strong>
          <div style="font-size:11px;color:#64748b;">Deleted: ${safeText(item.deletedAt)}</div>
        </div>
        <button type="button" onclick="restoreFromRecycleBin('${safeText(item.id)}')" style="width:auto;margin:0;padding:6px 12px;font-size:12px;">♻️ Restore</button>
      </div>
    `).join("")}`;
}

function renderAlertsModal() {
  const body = $("erpAlertsBody");
  if (!body) return;
  const alerts = getSystemAlerts();
  if (!alerts.length) {
    body.innerHTML = `<p style="color:#059669;text-align:center;padding:20px 0;font-weight:600;">✅ All clear! No pending alerts.</p>`;
    return;
  }
  body.innerHTML = alerts.map(a => `
    <div class="erp-search-item" style="align-items:flex-start;gap:12px;">
      <div>
        <strong style="font-size:13px;">${safeText(a.title)}</strong>
        <div style="font-size:12px;color:#475569;margin-top:2px;">${safeText(a.detail)}</div>
      </div>
      ${a.href ? `<a href="${a.href}" style="background:#174a83;color:#fff;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;">Open →</a>` : ""}
      ${a.actionFn ? `<button type="button" onclick="${a.actionFn}" style="width:auto;margin:0;padding:5px 10px;font-size:11px;white-space:nowrap;">${safeText(a.actionText)}</button>` : ""}
    </div>
  `).join("");
}

function runGlobalSearch(q) {
  const box = $("erpSearchResults");
  if (!box) return;
  const term = String(q || "").trim().toLowerCase();
  const items = [];

  const docMap = [
    ["quotation", "Quotation", "quotation.html"],
    ["invoice", "Tax Invoice", "invoice.html"],
    ["proformaInvoice", "Proforma Invoice", "proforma-invoice.html"],
    ["purchaseOrder", "Purchase Order", "purchase-order.html"],
    ["deliveryChallan", "Delivery Challan", "delivery-challan.html"],
    ["fbr", "FBR Invoice", "fbr-invoice.html"],
    ["salary", "Salary Slip", "salary-slip.html"],
    ["expense", "Expense Voucher", "expense-voucher.html"],
    ["receipt", "Cash Receipt", "cash-receipt.html"],
    ["cheque", "Cheque Print", "cheque-print.html"],
    ["attendance", "Attendance Sheet", "attendance-sheet.html"]
  ];
  docMap.forEach(([key, title, href]) => {
    const d = moduleData[key];
    if (!d) return;
    const text = `${title} ${d.number || ""} ${d.clientName || d.supplierName || d.empName || d.from || d.payee || ""}`.toLowerCase();
    if (!term || text.includes(term)) {
      items.push({
        type: title,
        title: `${d.number || title} — ${d.clientName || d.supplierName || d.empName || d.from || d.payee || d.dept || "Active"}`,
        href
      });
    }
  });

  (managementData.inventory || []).forEach(p => {
    if (!term || `${p.name} ${p.sku} ${p.category} ${p.warehouse || ""}`.toLowerCase().includes(term)) {
      items.push({ type: "Inventory", title: `${p.name} (${p.sku}) — Qty: ${p.qty}`, href: "inventory.html" });
    }
  });
  (customers || []).forEach(c => {
    if (!term || `${c.name} ${c.phone || ""} ${c.address || ""}`.toLowerCase().includes(term)) {
      items.push({ type: "Customer", title: `${c.name} (${c.phone || "No phone"})`, href: "invoice.html" });
    }
  });
  (managementData.crmLeads || []).forEach(l => {
    if (!term || `${l.name} ${l.dealTitle || ""} ${l.stage || ""}`.toLowerCase().includes(term)) {
      items.push({ type: "CRM Lead", title: `${l.name} — ${l.dealTitle || l.stage}`, href: "crm.html" });
    }
  });
  (managementData.productionJobs || []).forEach(j => {
    if (!term || `${j.jobNumber} ${j.productName || ""} ${j.clientName || ""}`.toLowerCase().includes(term)) {
      items.push({ type: "Production", title: `${j.jobNumber} — ${j.productName}`, href: "production.html" });
    }
  });

  box.innerHTML = items.slice(0, 20).map(it => `
    <a class="erp-search-item" href="${it.href}">
      <div><strong style="font-size:13px;">${safeText(it.title)}</strong></div>
      <span style="font-size:11px;font-weight:700;color:#174a83;background:#eff6ff;padding:3px 8px;border-radius:999px;">${safeText(it.type)}</span>
    </a>
  `).join("") || `<p style="color:#64748b;text-align:center;padding:16px 0;">No matching records found.</p>`;
}

function injectEnterpriseShell() {
  if ($("erpSidebar")) return;
  const header = document.querySelector("header.app-header");
  if (!header) return;

  const brand = header.querySelector(".brand-title");
  if (brand) {
    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "erp-shell-btn";
    menuBtn.innerHTML = "☰ Modules";
    menuBtn.onclick = () => {
      $("erpSidebar").classList.add("open");
      $("erpSidebarBackdrop").classList.add("open");
    };
    brand.prepend(menuBtn);
  }

  const rightBar = header.children[1];
  if (rightBar) {
    const netPill = document.createElement("span");
    netPill.id = "erpNetPill";
    netPill.className = "erp-net-pill" + (navigator.onLine ? "" : " offline");
    netPill.textContent = navigator.onLine ? "🟢 Online" : "🟠 Offline";

    const searchBtn = document.createElement("button");
    searchBtn.type = "button";
    searchBtn.className = "erp-shell-btn";
    searchBtn.innerHTML = "🔍 Search";
    searchBtn.title = "Global Search (Ctrl+K)";
    searchBtn.onclick = () => {
      $("erpSearchModal").classList.add("open");
      $("erpSearchInput").focus();
      runGlobalSearch($("erpSearchInput").value);
    };

    const alertBtn = document.createElement("button");
    alertBtn.type = "button";
    alertBtn.className = "erp-shell-btn";
    alertBtn.innerHTML = `🔔 <span class="erp-badge-count hidden" id="erpAlertCount">0</span>`;
    alertBtn.title = "Notifications & Backup Alerts";
    alertBtn.onclick = () => {
      renderAlertsModal();
      $("erpAlertsModal").classList.add("open");
    };

    const rbBtn = document.createElement("button");
    rbBtn.type = "button";
    rbBtn.className = "erp-shell-btn";
    rbBtn.innerHTML = `🗑️ <span class="erp-badge-count hidden" id="erpRecycleCount">0</span>`;
    rbBtn.title = "Recycle Bin";
    rbBtn.onclick = () => {
      renderRecycleBinModal();
      $("erpRecycleModal").classList.add("open");
    };

    const installBtn = document.createElement("button");
    installBtn.type = "button";
    installBtn.id = "erpInstallBtn";
    installBtn.className = "erp-shell-btn erp-install-btn";
    installBtn.innerHTML = "📲 Install App";
    installBtn.onclick = async () => {
      if (!deferredInstallPrompt) {
        alert("App install ke liye Chrome/Edge ka menu (⋮) kholen aur 'Install app' ya 'Install this site as an app' select karein. Agar option na aaye to website HTTPS par kholen aur browser update/reload karein.");
        return;
      }
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      if (choice && choice.outcome === "accepted") installBtn.classList.add("hidden");
    };

    rightBar.prepend(installBtn);
    rightBar.prepend(rbBtn);
    rightBar.prepend(alertBtn);
    rightBar.prepend(searchBtn);
    rightBar.prepend(netPill);
  }

  const navGroups = [
    {
      label: "Overview",
      links: [["index.html", "🏠", "Executive Dashboard", "dashboard"]]
    },
    {
      label: "Business Documents",
      links: [
        ["quotation.html", "📄", "Quotation Maker", "quotation"],
        ["invoice.html", "🧾", "Tax Invoice", "invoice"],
        ["proforma-invoice.html", "📋", "Proforma Invoice", "proformaInvoice"],
        ["purchase-order.html", "📦", "Purchase Order", "purchaseOrder"],
        ["delivery-challan.html", "🚚", "Delivery Challan", "deliveryChallan"]
      ]
    },
    {
      label: "Business Management",
      links: [
        ["inventory.html", "📊", "Inventory & Stock", "inventory"],
        ["accounts.html", "💰", "Accounts & Payments", "accounts"],
        ["fbr-invoice.html", "🇵🇰", "FBR Digital Invoice", "fbr"],
        ["crm.html", "👥", "CRM Pipeline", "crm"],
        ["production.html", "🏭", "Production & Job Card", "production"]
      ]
    },
    {
      label: "HR & Finance",
      links: [
        ["salary-slip.html", "👨‍💼", "Salary Slip", "salary"],
        ["expense-voucher.html", "🧾", "Expense Voucher", "expense"],
        ["cash-receipt.html", "💵", "Cash Receipt / Raseed", "receipt"],
        ["cheque-print.html", "🏦", "Cheque Printing", "cheque"],
        ["attendance-sheet.html", "📅", "Attendance Sheet", "attendance"]
      ]
    }
  ];

  const backdrop = document.createElement("div");
  backdrop.id = "erpSidebarBackdrop";
  backdrop.className = "erp-sidebar-backdrop";
  backdrop.onclick = () => {
    $("erpSidebar").classList.remove("open");
    backdrop.classList.remove("open");
  };

  const sidebar = document.createElement("aside");
  sidebar.id = "erpSidebar";
  sidebar.className = "erp-sidebar";
  sidebar.innerHTML = `
    <div class="erp-sidebar-head">
      <strong>🏢 ERP Suite (15 Modules)</strong>
      <button type="button" class="erp-modal-close" id="erpCloseSidebarBtn">✕</button>
    </div>
    ${navGroups.map(g => `
      <div class="erp-sidebar-group">
        <div class="erp-sidebar-label">${g.label}</div>
        ${g.links.map(([href, icon, title, mod]) => `
          <a href="${href}" class="${currentModule === mod ? "active" : ""}"><span>${icon}</span><span>${title}</span></a>
        `).join("")}
      </div>
    `).join("")}
  `;

  const modals = document.createElement("div");
  modals.innerHTML = `
    <div class="erp-modal-overlay" id="erpSearchModal">
      <div class="erp-modal-box">
        <div class="erp-modal-header">
          <h3>🔍 Global Search (Invoices, Quotes, Customers, Stock)</h3>
          <button type="button" class="erp-modal-close" onclick="document.getElementById('erpSearchModal').classList.remove('open')">✕</button>
        </div>
        <div class="erp-modal-body">
          <input type="text" id="erpSearchInput" placeholder="Type customer, invoice #, product, SKU, lead..." style="margin-bottom:12px;">
          <div id="erpSearchResults"></div>
        </div>
      </div>
    </div>
    <div class="erp-modal-overlay" id="erpAlertsModal">
      <div class="erp-modal-box">
        <div class="erp-modal-header">
          <h3>🔔 System Alerts &amp; Backup Reminders</h3>
          <button type="button" class="erp-modal-close" onclick="document.getElementById('erpAlertsModal').classList.remove('open')">✕</button>
        </div>
        <div class="erp-modal-body" id="erpAlertsBody"></div>
      </div>
    </div>
    <div class="erp-modal-overlay" id="erpRecycleModal">
      <div class="erp-modal-box">
        <div class="erp-modal-header">
          <h3>🗑️ Recycle Bin (Restore Deleted Records)</h3>
          <button type="button" class="erp-modal-close" onclick="document.getElementById('erpRecycleModal').classList.remove('open')">✕</button>
        </div>
        <div class="erp-modal-body" id="erpRecycleBody"></div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(sidebar);
  document.body.appendChild(modals);

  $("erpCloseSidebarBtn").onclick = () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("open");
  };
  $("erpSearchInput").addEventListener("input", e => runGlobalSearch(e.target.value));
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      $("erpSearchModal").classList.add("open");
      $("erpSearchInput").focus();
      runGlobalSearch($("erpSearchInput").value);
    }
    if (e.key === "Escape") {
      ["erpSearchModal", "erpAlertsModal", "erpRecycleModal"].forEach(id => $(id) && $(id).classList.remove("open"));
      sidebar.classList.remove("open");
      backdrop.classList.remove("open");
    }
  });

  window.addEventListener("online", () => {
    const p = $("erpNetPill");
    if (p) { p.className = "erp-net-pill"; p.textContent = "🟢 Online"; }
  });
  window.addEventListener("offline", () => {
    const p = $("erpNetPill");
    if (p) { p.className = "erp-net-pill offline"; p.textContent = "🟠 Offline"; }
  });

  updateShellBadges();

  const bInfo = getBackupStatusInfo();
  if (bInfo.due && !sessionStorage.getItem("erp_backup_toast_dismissed")) {
    const toast = document.createElement("div");
    toast.id = "erpBackupToast";
    toast.className = "erp-toast-reminder";
    toast.innerHTML = `
      <div style="font-weight:800;margin-bottom:4px;">💾 Backup Reminder</div>
      <div style="color:#cbd5e1;margin-bottom:8px;">${bInfo.last ? `Last backup was ${bInfo.daysAgo} days ago.` : "Save a JSON backup to protect your offline data."}</div>
      <div style="display:flex;gap:8px;">
        <button type="button" onclick="exportCompleteBackup()" style="padding:5px 10px;font-size:11px;margin:0;width:auto;">Download Backup</button>
        <button type="button" onclick="sessionStorage.setItem('erp_backup_toast_dismissed','1');this.closest('.erp-toast-reminder').remove();" class="btn-secondary" style="padding:5px 10px;font-size:11px;margin:0;width:auto;">Later</button>
      </div>
    `;
    document.body.appendChild(toast);
  }
}

function registerPwaShell() {
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if ($("erpInstallBtn")) $("erpInstallBtn").classList.remove("hidden");
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    if ($("erpInstallBtn")) $("erpInstallBtn").classList.add("hidden");
  });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function renderExecutiveDashboard() {
  const grid = $("execKpiGrid");
  if (!grid) return;
  const today = getTodayIso();
  const monthPrefix = today.slice(0, 7);
  if ($("execKpiMonth")) {
    const [yr, mo] = monthPrefix.split("-");
    const mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(mo) - 1] || mo;
    $("execKpiMonth").textContent = `${mn} ${yr}`;
  }

  let todaySales = 0;
  let monthlyRevenue = 0;
  let totalExpenses = 0;
  let customerOutstanding = 0;

  (managementData.accounts || []).forEach(r => {
    const amt = Number(r.amount || 0);
    if (r.type === "receipt") {
      if (r.date === today) todaySales += amt;
      if (String(r.date || "").startsWith(monthPrefix)) monthlyRevenue += amt;
    } else if (r.type === "expense" || r.type === "payment") {
      if (String(r.date || "").startsWith(monthPrefix)) totalExpenses += amt;
    }
  });

  if (moduleData.invoice) {
    const invTotal = calcDocGrandTotal(moduleData.invoice);
    const invPaid = Number(moduleData.invoice.amountPaid || 0);
    const invDate = moduleData.invoice.date || today;
    if (invDate === today) todaySales += invTotal;
    if (String(invDate).startsWith(monthPrefix) && !(managementData.accounts || []).some(a => a.refNo === moduleData.invoice.number)) {
      monthlyRevenue += invTotal;
    }
    if (moduleData.invoice.status !== "PAID") {
      customerOutstanding += Math.max(0, invTotal - invPaid);
    }
  }
  if (moduleData.expense) {
    const expDate = moduleData.expense.date || today;
    if (String(expDate).startsWith(monthPrefix)) {
      totalExpenses += calcDocGrandTotal(moduleData.expense);
    }
  }

  const netProfit = monthlyRevenue - totalExpenses;
  const lowStockCount = (managementData.inventory || []).filter(i => Number(i.qty || 0) <= Number(i.reorderLevel || 0)).length;

  const cards = [
    { label: "Today's Sales", value: "Rs. " + money(todaySales), sub: today, color: "#0284c7", bg: "#f0f9ff", href: "invoice.html" },
    { label: "Monthly Revenue", value: "Rs. " + money(monthlyRevenue), sub: "This Month", color: "#059669", bg: "#ecfdf5", href: "accounts.html" },
    { label: "Total Expenses", value: "Rs. " + money(totalExpenses), sub: "Vouchers & Outflow", color: "#dc2626", bg: "#fef2f2", href: "expense-voucher.html" },
    { label: "Net Profit", value: (netProfit < 0 ? "-Rs. " : "Rs. ") + money(Math.abs(netProfit)), sub: netProfit >= 0 ? "Profitable" : "Deficit", color: netProfit >= 0 ? "#166534" : "#b91c1c", bg: netProfit >= 0 ? "#f0fdf4" : "#fef2f2", href: "accounts.html" },
    { label: "Customer Outstanding", value: "Rs. " + money(customerOutstanding), sub: "Receivables Due", color: "#d97706", bg: "#fffbeb", href: "invoice.html" },
    { label: "Low Stock Products", value: String(lowStockCount), sub: lowStockCount > 0 ? "Reorder Needed" : "All Stock Healthy", color: lowStockCount > 0 ? "#dc2626" : "#059669", bg: lowStockCount > 0 ? "#fef2f2" : "#ecfdf5", href: "inventory.html" }
  ];

  grid.innerHTML = cards.map(c => `
    <a href="${c.href}" style="text-decoration:none;background:#ffffff;border:1px solid #cbd5e1;border-left:4px solid ${c.color};border-radius:10px;padding:14px 16px;box-shadow:0 2px 8px rgba(15,23,42,0.05);display:block;">
      <div style="font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;">${c.label}</div>
      <div style="font-size:20px;font-weight:900;color:${c.color};margin:6px 0 4px;">${c.value}</div>
      <div style="font-size:11px;font-weight:600;color:#475569;background:${c.bg};display:inline-block;padding:2px 8px;border-radius:999px;">${c.sub}</div>
    </a>
  `).join("");
}

async function hydrateFromIndexedDb() {
  const idbData = await idbGet(APP_CONFIG.storageKey);
  if (idbData && typeof idbData === "object") {
    const lsRaw = localStorage.getItem(APP_CONFIG.storageKey);
    let lsUpdated = 0;
    try { lsUpdated = lsRaw ? (JSON.parse(lsRaw).updatedAt || 0) : 0; } catch (e) {}
    if (!lsRaw || (idbData.updatedAt && idbData.updatedAt > lsUpdated)) {
      applyParsedState(idbData);
      if ($("companyName")) {
        syncModuleInputsToState();
        renderItems();
        updatePreview();
      } else {
        if (currentModule === "dashboard") renderExecutiveDashboard();
        if (currentModule === "inventory" && typeof renderInventory === "function") renderInventory();
        if (currentModule === "accounts" && typeof renderAccounts === "function") renderAccounts();
        if (currentModule === "crm" && typeof renderCrm === "function") renderCrm();
      }
      updateShellBadges();
    }
  } else if (localStorage.getItem(APP_CONFIG.storageKey)) {
    writeStorageState();
  }
}

function initPage() {
  loadData();
  normalizeAllItems();
  initCounters();
  if ($("companyName")) {
    populateDropdowns();
    renderDirectory();
    ensureQuotationAttachmentUI();
    initProductionEvents();
    syncModuleInputsToState();
    renderItems();
    updatePreview();
    bindEditorEvents();
  } else {
    bindBackupControls("dashBackupBtn", "dashRestoreBtn", "dashRestoreFile");
    renderExecutiveDashboard();
    initInventoryPage();
    initAccountsPage();
    initCrmPage();
  }
  window.addEventListener("beforeprint", () => { if ($("companyName")) recordDocumentHistory(); });
  injectEnterpriseShell();
  registerPwaShell();
  hydrateFromIndexedDb();
}

document.addEventListener("DOMContentLoaded", initPage);
