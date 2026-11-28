const CACHE_NAME = "erp-suite-offline-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./quotation.html",
  "./invoice.html",
  "./proforma-invoice.html",
  "./purchase-order.html",
  "./delivery-challan.html",
  "./fbr-invoice.html",
  "./inventory.html",
  "./accounts.html",
  "./crm.html",
  "./production.html",
  "./salary-slip.html",
  "./expense-voucher.html",
  "./cash-receipt.html",
  "./cheque-print.html",
  "./attendance-sheet.html",
  "./404.html",
  "./erp-style.css",
  "./erp-core.js",
  "./manifest.json",
  "./favicon.ico",
  "./favicon.png",
  "./apple-touch-icon.png",
  "./og-image.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("Offline", { status: 503, statusText: "Offline" });
        })
      )
  );
});
