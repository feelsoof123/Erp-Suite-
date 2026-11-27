const $ = id => document.getElementById(id);

const APP_CONFIG = {
  name: "Enterprise Business Document ERP Suite",
  version: "2.2.0-multipage",
  storageKey: "business_document_suite_v2",
  countersKey: "biz_counters_v2"
};

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
  const m = moduleData[currentModule];
  const primaryColor = $("brandColor").value || "#174a83";
  document.documentElement.style.setProperty("--primary", primaryColor);

  const paper = $("paper");
  if (m.items.length >= 6) {
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
  } else {
    $("pInvoiceBalanceRows").classList.add("hidden");
  }
}

// CROSS-PAGE 1-CLICK CONVERSIONS
function convertQuotationToInvoice() {
  syncStateFromInputs();
  const q = moduleData.quotation;
  const inv = moduleData.invoice;
  inv.refNo = q.number || "QT-001";
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
  const inv = moduleData.invoice;
  const dc = moduleData.deliveryChallan;
  dc.refNo = inv.number || "INV-001";
  dc.clientName = inv.clientName;
  dc.clientPhone = inv.clientPhone;
  dc.clientAddress = inv.clientAddress;
  dc.items = JSON.parse(JSON.stringify(inv.items));
  saveData();
  window.location.href = "delivery-challan.html";
}

function convertProformaToInvoice() {
  syncStateFromInputs();
  const pi = moduleData.proformaInvoice;
  const inv = moduleData.invoice;
  inv.refNo = pi.number || "PI-001";
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

function writeStorageState() {
  const dataToSave = {
    company: companyState,
    customers,
    suppliers,
    moduleData,
    managementData
  };
  localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(dataToSave));
}

function saveData() {
  try {
    if ($("companyName")) {
      syncStateFromInputs();
      syncCompanyStateFromDom();
    }
    writeStorageState();
    if ($("saveStatus")) $("saveStatus").textContent = "✓ Automatically saved across all modules";
  } catch(e) {
    if ($("saveStatus")) $("saveStatus").textContent = "Storage limit reached. Download backup.";
  }
}

function mergeManagementData(incoming) {
  if (!incoming || typeof incoming !== "object") return;
  if (Array.isArray(incoming.inventory)) managementData.inventory = incoming.inventory;
  if (Array.isArray(incoming.inventoryLogs)) managementData.inventoryLogs = incoming.inventoryLogs;
  if (Array.isArray(incoming.accounts)) managementData.accounts = incoming.accounts;
  if (Array.isArray(incoming.crmLeads)) managementData.crmLeads = incoming.crmLeads;
  if (Array.isArray(incoming.productionJobs)) managementData.productionJobs = incoming.productionJobs;
  if (typeof incoming.activeProductionId === "string") managementData.activeProductionId = incoming.activeProductionId;
}

function loadData() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);

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
      counters
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `erp-suite-backup-${getTodayIso()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
        throw new Error("Invalid format");
      }
      if (parsed.company && typeof parsed.company === "object") {
        companyState = Object.assign({}, companyState, parsed.company);
        logoData = companyState.logoData || "";
        stampData = companyState.stampData || "";
        signatureData = companyState.signatureData || "";
        watermarkData = companyState.watermarkData || "";
      }
      if (parsed.moduleData) {
        Object.keys(parsed.moduleData).forEach(k => {
          if (moduleData[k] && parsed.moduleData[k]) {
            moduleData[k] = Object.assign({}, moduleData[k], parsed.moduleData[k]);
          } else {
            moduleData[k] = parsed.moduleData[k];
          }
        });
      }
      if (Array.isArray(parsed.customers)) customers = parsed.customers;
      if (Array.isArray(parsed.suppliers)) suppliers = parsed.suppliers;
      if (parsed.managementData) mergeManagementData(parsed.managementData);
      if (parsed.counters && typeof parsed.counters === "object") {
        localStorage.setItem(APP_CONFIG.countersKey, JSON.stringify(parsed.counters));
      }
      writeStorageState();
      alert("Backup successfully restored! Reloading...");
      location.reload();
    } catch(err) {
      alert("Invalid backup file.");
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
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    input.value = "";
    return;
  }
  if (file.size > 800 * 1024) {
    alert("Please select an image under 800 KB.");
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    setter(reader.result);
    updatePreview();
    saveData();
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
    $("factoryResetBtn").addEventListener("click", () => {
      if (prompt("Type RESET to wipe all data:") === "RESET") {
        localStorage.clear();
        location.reload();
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
  if (!confirm(`Delete Job Card ${active.jobNumber}?`)) return;
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
      if (!item || !confirm(`Delete ${item.name}?`)) return;
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
    if (!delId || !confirm("Delete this ledger entry?")) return;
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
      if (!lead || !confirm(`Delete lead "${lead.name}"?`)) return;
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
    initInventoryPage();
    initAccountsPage();
    initCrmPage();
  }
}

document.addEventListener("DOMContentLoaded", initPage);
