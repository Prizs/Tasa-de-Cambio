// Main Frontend Controller for Envíos YA! Rates Engine

let currentRatesData = null;
let autoRefreshTimer = null;
let countdownSeconds = 60;
let isUpdating = false;

// DOM Elements
const syncStatus = document.getElementById("syncStatus");
const syncText = document.getElementById("syncText");
const countdownBadge = document.getElementById("countdownBadge");
const btnRefresh = document.getElementById("btnRefresh");
const btnDownloadAll = document.getElementById("btnDownloadAll");
const btnSaveSnapshot = document.getElementById("btnSaveSnapshot");
const driftCardsContainer = document.getElementById("driftCardsContainer");
const snapshotStatusText = document.getElementById("snapshotStatusText");
const driftIcon = document.getElementById("driftIcon");
const flyersGallery = document.getElementById("flyersGallery");
const ratesTableBody = document.getElementById("ratesTableBody");
const btnOpenSettings = document.getElementById("btnOpenSettings");
const settingsModal = document.getElementById("settingsModal");
const settingsClose = document.getElementById("settingsClose");
const btnCancelSettings = document.getElementById("btnCancelSettings");
const settingsForm = document.getElementById("settingsForm");
const orderModal = document.getElementById("orderModal");
const modalClose = document.getElementById("modalClose");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");

const btnNotify = document.getElementById("btnNotify");
const btnNotifyText = document.getElementById("btnNotifyText");
const urgentAlertContainer = document.getElementById("urgentAlertContainer");

let notificationsEnabled = ("Notification" in window && Notification.permission === "granted");
let lastNotifiedDangerCount = 0;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (notificationsEnabled && btnNotifyText) {
    btnNotifyText.textContent = "🔔 Alertas: Activas";
  }
  fetchRates();
  startCountdown();
  setupEventListeners();
});

function setupEventListeners() {
  if (btnNotify) {
    btnNotify.addEventListener("click", requestNotificationPermission);
  }

  btnRefresh.addEventListener("click", () => {
    fetchRates(true);
  });

  btnSaveSnapshot.addEventListener("click", () => {
    saveBenchmarkSnapshot();
  });

  const btnTgFlyers = document.getElementById("btnSendTelegramFlyers");
  if (btnTgFlyers) {
    btnTgFlyers.addEventListener("click", sendAllFlyersToTelegram);
  }

  btnDownloadAll.addEventListener("click", () => {
    downloadAllFlyersZip();
  });

  btnOpenSettings.addEventListener("click", () => {
    openSettingsModal();
  });

  settingsClose.addEventListener("click", () => {
    settingsModal.classList.remove("active");
  });

  btnCancelSettings.addEventListener("click", () => {
    settingsModal.classList.remove("active");
  });

  modalClose.addEventListener("click", () => {
    orderModal.classList.remove("active");
  });

  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveSettings();
  });
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("Tu navegador no soporta notificaciones de escritorio.");
    return;
  }
  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      notificationsEnabled = true;
      if (btnNotifyText) btnNotifyText.textContent = "🔔 Alertas: Activas";
      playAlertChime();
      new Notification("Envíos YA!", {
        body: "✅ Notificaciones activadas. Te avisaremos con sonido y notificación cuando el mercado se mueva y debas publicar.",
        icon: "/static/favicon.ico"
      });
    }
  });
}

// Synthesizer Web Audio API chime (zero external files required)
function playAlertChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880.00, now + 0.12); // A5

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch (e) {
    console.warn("Audio chime not allowed yet:", e);
  }
}

function triggerAlert(dangerCount, topRiskCorridors) {
  playAlertChime();
  const alertMsg = `🚨 <b>¡ALERTA ENVÍOS YA! - Momento de Publicar Nuevas Tasas</b>\n\nEl mercado en Binance varió. Tienes <b>${dangerCount} corredor(es)</b> con pérdida de margen:\n• ${topRiskCorridors.join("\n• ")}\n\n👉 <i>Ingresa a la plataforma y descarga los nuevos flyers.</i>`;

  if (notificationsEnabled) {
    new Notification("🚨 ¡Alerta Envíos YA! - Publicar Nuevas Tasas", {
      body: `El mercado en Binance varió en: ${topRiskCorridors.join(", ")}. Descarga nuevos flyers.`,
      icon: "/static/favicon.ico"
    });
  }

  // Send alert to Telegram group automatically
  fetch("/api/telegram/notify-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: alertMsg })
  }).catch(() => {});
}

function startCountdown() {
  clearInterval(autoRefreshTimer);
  countdownSeconds = 60;
  countdownBadge.textContent = `${countdownSeconds}s`;

  autoRefreshTimer = setInterval(() => {
    countdownSeconds--;
    if (countdownSeconds <= 0) {
      countdownSeconds = 60;
      fetchRates(false);
    }
    countdownBadge.textContent = `${countdownSeconds}s`;
  }, 1000);
}

async function fetchRates(isManual = false) {
  if (isUpdating) return;
  isUpdating = true;
  syncText.textContent = "Consultando Binance...";
  syncStatus.style.borderColor = "#f59e0b";

  try {
    const res = await fetch("/api/rates");
    if (!res.ok) throw new Error("Error en el servidor");
    const data = await res.json();
    currentRatesData = data;

    renderDashboard(data);

    syncText.textContent = `Actualizado ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    syncStatus.style.borderColor = "#10b981";
    if (isManual) countdownSeconds = 60;
  } catch (err) {
    console.error("Error fetching rates:", err);
    syncText.textContent = "Error al conectar";
    syncStatus.style.borderColor = "#ef4444";
  } finally {
    isUpdating = false;
  }
}

function renderDashboard(data) {
  renderDriftMonitor(data);
  renderFlyersGallery(data.flyers);
  renderRatesTable(data.flyers);
}

// 1. Render Market Drift / Profit Margin Protection
function renderDriftMonitor(data) {
  const snapInfo = data.snapshot_info;
  driftCardsContainer.innerHTML = "";

  if (!snapInfo.has_snapshot) {
    snapshotStatusText.textContent = "No hay un punto de referencia fijado todavía. Haz clic en 'Fijar Snapshot' o descarga los flyers para comenzar a monitorear la variación de margen.";
    driftIcon.textContent = "📌";
    return;
  }

  const minsAgo = Math.round(snapInfo.snapshot_age_seconds / 60);
  const timeDesc = minsAgo < 1 ? "hace menos de un minuto" : `hace ${minsAgo} minutos (${snapInfo.snapshot_time})`;
  snapshotStatusText.textContent = `Punto de referencia fijado ${timeDesc}. Monitoreando variaciones de mercado:`;

  let dangerCount = 0;
  let warningCount = 0;
  const topRiskCorridors = [];

  data.flyers.forEach(flyer => {
    flyer.corridors.forEach(corridor => {
      if (corridor.drift) {
        const d = corridor.drift;
        if (d.status === "danger") {
          dangerCount++;
          topRiskCorridors.push(`${flyer.origin.fiat}➔${corridor.name}`);
        }
        if (d.status === "warning") warningCount++;

        const card = document.createElement("div");
        card.className = "drift-card";

        const sign = d.margin_diff >= 0 ? "+" : "";
        const badgeClass = d.status;

        // Clean formatted numbers without endless decimals
        const oldFormatted = formatNumber(d.old_rate_standard, corridor.round_decimals);
        const nowFormatted = formatNumber(corridor.rate_standard, corridor.round_decimals);

        card.innerHTML = `
          <div class="drift-card-corridor">
            <div class="drift-flag-pair">
              <span>${getFlagEmoji(flyer.origin.fiat)}</span>
              <span style="font-size:0.8rem; margin:0 4px; color:#9ca3af;">➔</span>
              <span>${getFlagEmoji(corridor.destination_fiat)}</span>
            </div>
            <div>
              <div class="drift-corridor-name">${flyer.origin.fiat} ➔ ${corridor.name}</div>
              <div class="drift-corridor-rates">Tasa Pub: <strong>${oldFormatted}</strong> | Hoy: <strong>${nowFormatted}</strong></div>
            </div>
          </div>
          <div class="drift-metric">
            <span class="drift-badge ${badgeClass}">${sign}${d.margin_diff}% Margen</span>
            <div class="drift-margin-note">Efectivo: ${d.effective_margin_now}% (Base: ${d.nominal_margin}%)</div>
          </div>
        `;
        driftCardsContainer.appendChild(card);
      }
    });
  });

  // Urgent Banner & Sound/Notification alert
  if (dangerCount > 0) {
    driftIcon.textContent = "🚨";
    snapshotStatusText.innerHTML += ` <span style="color:#f87171; font-weight:700;">¡Atención! ${dangerCount} corredor(es) tienen riesgo de pérdida de margen comercial.</span>`;

    if (urgentAlertContainer) {
      urgentAlertContainer.innerHTML = `
        <div class="urgent-alert-banner">
          <div class="urgent-alert-content">
            <div class="urgent-alert-icon">⚠️</div>
            <div>
              <div class="urgent-alert-title">¡MOMENTO DE PUBLICAR NUEVAS TASAS!</div>
              <div class="urgent-alert-subtitle">
                El mercado en Binance varió. Tienes <strong>${dangerCount} corredor(es)</strong> donde tu ganancia está cayendo: ${topRiskCorridors.slice(0, 3).join(", ")}.
              </div>
            </div>
          </div>
          <div class="urgent-alert-actions">
            <button class="btn btn-primary" onclick="downloadAllFlyersZip()" style="box-shadow: 0 4px 14px rgba(0,0,0,0.4);">
              📥 Descargar Nuevos Flyers (ZIP) & Actualizar
            </button>
          </div>
        </div>
      `;
    }

    if (dangerCount !== lastNotifiedDangerCount) {
      triggerAlert(dangerCount, topRiskCorridors);
      lastNotifiedDangerCount = dangerCount;
    }
  } else {
    if (urgentAlertContainer) urgentAlertContainer.innerHTML = "";
    lastNotifiedDangerCount = 0;

    if (warningCount > 0) {
      driftIcon.textContent = "⚠️";
      snapshotStatusText.innerHTML += ` <span style="color:#fbbf24; font-weight:600;">Mercado con ligera volatilidad.</span>`;
    } else {
      driftIcon.textContent = "🛡️";
      snapshotStatusText.innerHTML += ` <span style="color:#34d399; font-weight:600;">Margen comercial 100% protegido.</span>`;
    }
  }
}

// 2. Render Flyers Gallery & Canvas
function renderFlyersGallery(flyers) {
  flyersGallery.innerHTML = "";

  flyers.forEach((flyer) => {
    const card = document.createElement("div");
    
    // Check if any corridor in this flyer has danger (margin drop)
    const hasDanger = flyer.corridors.some(c => c.drift && c.drift.status === 'danger');
    const hasWarning = flyer.corridors.some(c => c.drift && c.drift.status === 'warning');

    let cardClass = "flyer-card";
    let alertRibbonHtml = "";
    let statusBadgeHtml = '<span class="flyer-status-badge safe">✅ Al día</span>';
    let downloadBtnClass = "btn btn-primary btn-sm";
    let downloadBtnText = "📥 Descargar PNG HD";

    if (hasDanger) {
      cardClass = "flyer-card needs-update";
      alertRibbonHtml = `<div class="flyer-alert-ribbon">‼️ ¡DESCARGAR NUEVO! Tasa caída</div>`;
      statusBadgeHtml = `<span class="flyer-status-badge danger">‼️ Requiere Actualizar</span>`;
      downloadBtnClass = "btn btn-danger btn-sm btn-pulse";
      downloadBtnText = "‼️ Descargar PNG HD";
    } else if (hasWarning) {
      cardClass = "flyer-card warning-update";
      statusBadgeHtml = `<span class="flyer-status-badge warning">⚠️ Volatilidad</span>`;
    }

    card.className = cardClass;
    const canvasId = `flyer_canvas_${flyer.flyer_id}`;

    let corridorsListHtml = "";
    flyer.corridors.forEach(c => {
      let corridorBadge = "";
      if (c.drift && c.drift.status === "danger") {
        corridorBadge = `<span style="color:#ef4444; font-weight:800; font-size:0.75rem; margin-left:6px;">‼️ ${c.drift.margin_diff}%</span>`;
      } else if (c.drift && c.drift.status === "warning") {
        corridorBadge = `<span style="color:#f59e0b; font-size:0.75rem; margin-left:6px;">⚠️</span>`;
      }

      corridorsListHtml += `
        <div class="flyer-corridor-item">
          <span>${getFlagEmoji(c.destination_fiat)} ${c.name} ${corridorBadge}</span>
          <span style="font-weight:700; color:#fbbf24;">${window.FlyerRenderer ? window.FlyerRenderer.formatRateSmart(c.rate_standard) : c.rate_standard}</span>
        </div>
      `;
    });

    const originPayMethod = (flyer.origin.payTypes && flyer.origin.payTypes.length > 0) 
      ? flyer.origin.payTypes.join(", ") 
      : "Transferencia";

    card.innerHTML = `
      <div class="flyer-preview-frame">
        ${alertRibbonHtml}
        <canvas id="${canvasId}" class="flyer-canvas"></canvas>
      </div>
      <div class="flyer-card-body">
        <div class="flyer-card-header">
          <div>
            <div class="flyer-card-title">${flyer.title}</div>
            <div style="margin-top:4px;">${statusBadgeHtml}</div>
          </div>
          <div class="flyer-origin-badge">Origen: ${flyer.origin.fiat} (${originPayMethod})</div>
        </div>
        <div class="flyer-corridors-list">
          ${corridorsListHtml}
        </div>
        <div class="flyer-actions">
          <button class="btn btn-secondary btn-sm" onclick="inspectOrderBook('${flyer.flyer_id}')">
            🔍 Muestreo
          </button>
          <button class="${downloadBtnClass}" onclick="downloadSingleFlyer('${flyer.flyer_id}')">
            ${downloadBtnText}
          </button>
        </div>
      </div>
    `;

    flyersGallery.appendChild(card);
  });

  // Render to canvas after DOM insertion
  requestAnimationFrame(() => {
    flyers.forEach(flyer => {
      const canvasId = `flyer_canvas_${flyer.flyer_id}`;
      const canvas = document.getElementById(canvasId);
      if (canvas && window.FlyerRenderer) {
        window.FlyerRenderer.renderToCanvas(canvas, flyer, 1.0);
      }
    });
  });
}

// 3. Render Audit Table
function renderRatesTable(flyers) {
  ratesTableBody.innerHTML = "";

  flyers.forEach(flyer => {
    flyer.corridors.forEach(c => {
      const tr = document.createElement("tr");

      let driftBadge = '<span style="color:#9ca3af;">--</span>';
      if (c.drift) {
        const sign = c.drift.margin_diff >= 0 ? "+" : "";
        driftBadge = `<span class="drift-badge ${c.drift.status}">${sign}${c.drift.margin_diff}%</span>`;
      }

      tr.innerHTML = `
        <td>
          <strong>${getFlagEmoji(flyer.origin.fiat)} ${flyer.origin.fiat} ➔ ${getFlagEmoji(c.destination_fiat)} ${c.destination_fiat}</strong>
          <div style="font-size:0.75rem; color:#9ca3af;">${c.name}</div>
        </td>
        <td>
          <span class="rate-badge">${formatNumber(flyer.origin.origin_usdt_price, 2)} ${flyer.origin.fiat}</span>
        </td>
        <td>
          <span class="rate-badge">${formatNumber(c.dest_usdt_price, 2)} ${c.destination_fiat}</span>
        </td>
        <td>
          <span class="rate-badge highlight">${formatNumber(c.acquisition_rate, 5)}</span>
        </td>
        <td>
          <span class="rate-badge" style="color:#4ade80;">${c.rate_standard}</span>
          <span style="font-size:0.72rem; color:#9ca3af;">(-${c.margin_std}%)</span>
        </td>
        <td>
          <span class="rate-badge pref">${c.rate_preferential}</span>
          <span style="font-size:0.72rem; color:#9ca3af;">(-${c.margin_pref}%)</span>
        </td>
        <td>${driftBadge}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="inspectCorridorMerchants('${flyer.flyer_id}', '${c.destination_fiat}')">
            ${c.dest_merchants_sample.length} Anunciantes
          </button>
        </td>
      `;
      ratesTableBody.appendChild(tr);
    });
  });
}

// Modal for Advertisers Sampling
window.inspectOrderBook = function(flyerId) {
  if (!currentRatesData) return;
  const flyer = currentRatesData.flyers.find(f => f.flyer_id === flyerId);
  if (!flyer) return;

  const payDesc = (flyer.origin.payTypes && flyer.origin.payTypes.length > 0) ? flyer.origin.payTypes.join(", ") : "Todos";
  const isUSD = flyer.origin.fiat === "USD";
  modalTitle.textContent = isUSD 
    ? `Tasa Base USD (Paridad 1:1)` 
    : `Comerciantes Compra USDT (${flyer.origin.fiat} - ${payDesc})`;

  const infoText = isUSD
    ? `✨ <strong>Regla fija activa:</strong> Para USD se toma paridad exacta 1:1 (1.00 USD) y no el sobreprecio de 1.04 de los comerciantes P2P.`
    : `Filtro: Anuncios a partir de la 4ta posición con buen porcentaje de completitud (promedio de liquidez real).`;

  let html = `
    <div style="margin-bottom:14px; font-size:0.86rem; color:#cbd5e1; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); padding:10px 14px; border-radius:8px;">
      ${infoText}
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Comerciante</th>
          <th>Precio</th>
          <th>Órdenes / Éxito</th>
          <th>Límites</th>
        </tr>
      </thead>
      <tbody>
  `;

  (flyer.origin.sampled_merchants || []).forEach(m => {
    html += `
      <tr>
        <td><strong>${m.nickName}</strong></td>
        <td><span class="rate-badge highlight">${m.price} ${flyer.origin.fiat}</span></td>
        <td>${m.monthOrders} ord. (${m.finishRate}%)</td>
        <td>${m.minAmount} - ${m.maxAmount}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  modalBody.innerHTML = html;
  orderModal.classList.add("active");
};

window.inspectCorridorMerchants = function(flyerId, destFiat) {
  if (!currentRatesData) return;
  const flyer = currentRatesData.flyers.find(f => f.flyer_id === flyerId);
  if (!flyer) return;
  const corridor = flyer.corridors.find(c => c.destination_fiat === destFiat);
  if (!corridor) return;

  modalTitle.textContent = `Comerciantes Venta USDT (${destFiat} - ${corridor.name})`;
  let html = `
    <p style="margin-bottom:12px; font-size:0.85rem; color:#9ca3af;">
      Filtro aplicado en venta: a partir del 4to comerciante con volumen calificado.
    </p>
    <table class="data-table">
      <thead>
        <tr>
          <th>Comerciante</th>
          <th>Precio</th>
          <th>Órdenes / Éxito</th>
          <th>Límites</th>
        </tr>
      </thead>
      <tbody>
  `;

  (corridor.dest_merchants_sample || []).forEach(m => {
    html += `
      <tr>
        <td><strong>${m.nickName}</strong></td>
        <td><span class="rate-badge highlight">${m.price} ${destFiat}</span></td>
        <td>${m.monthOrders} ord. (${m.finishRate}%)</td>
        <td>${m.minAmount} - ${m.maxAmount}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  modalBody.innerHTML = html;
  orderModal.classList.add("active");
};

// Download Single Flyer in Ultra HD (scale 2.0 = 1600x2400)
window.downloadSingleFlyer = function(flyerId) {
  if (!currentRatesData || !window.FlyerRenderer) return;
  const flyer = currentRatesData.flyers.find(f => f.flyer_id === flyerId);
  if (!flyer) return;

  const offCanvas = document.createElement("canvas");
  window.FlyerRenderer.renderToCanvas(offCanvas, flyer, 2.0);

  const link = document.createElement("a");
  link.download = `Flyer_${flyer.flyer_id}_${formatDate(new Date())}.png`;
  link.href = offCanvas.toDataURL("image/png");
  link.click();

  // Reset benchmark ONLY for this specific flyer
  saveBenchmarkSnapshot(false, flyer.flyer_id);
};

// Download All Flyers in ZIP and register benchmark snapshot for ALL
async function downloadAllFlyersZip() {
  if (!currentRatesData || !window.JSZip || !window.FlyerRenderer) return;
  btnDownloadAll.textContent = "Generando ZIP...";
  btnDownloadAll.disabled = true;

  try {
    const zip = new JSZip();
    const dateStr = formatDate(new Date());

    currentRatesData.flyers.forEach(flyer => {
      const offCanvas = document.createElement("canvas");
      window.FlyerRenderer.renderToCanvas(offCanvas, flyer, 2.0);
      const dataUrl = offCanvas.toDataURL("image/png");
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      zip.file(`Flyer_${flyer.flyer_id}_${dateStr}.png`, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `Flyers_EnviosYa_${dateStr}.zip`;
    link.click();

    await saveBenchmarkSnapshot(true, null);
  } catch (err) {
    console.error("Error creating ZIP:", err);
    alert("Error al empaquetar los flyers en ZIP.");
  } finally {
    btnDownloadAll.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
      Descargar Todos (ZIP)
    `;
    btnDownloadAll.disabled = false;
  }
}

async function saveBenchmarkSnapshot(showMessage = true, flyerId = null) {
  try {
    const payload = flyerId ? { flyer_id: flyerId } : {};
    const res = await fetch("/api/snapshot/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Error al guardar snapshot");
    if (showMessage) {
      alert(flyerId ? `✅ Punto de referencia fijado para el flyer seleccionado.` : "✅ Punto de referencia fijado para todos los flyers.");
    }
    fetchRates();
  } catch (e) {
    console.error(e);
  }
}

// Telegram Test Button Listener
document.addEventListener("DOMContentLoaded", () => {
  const btnTestTg = document.getElementById("btnTestTelegram");
  if (btnTestTg) {
    btnTestTg.addEventListener("click", testTelegramConnection);
  }
});

async function testTelegramConnection() {
  const token = document.getElementById("cfgTgToken").value.trim();
  const chatId = document.getElementById("cfgTgChatId").value.trim();
  const resLabel = document.getElementById("tgTestResult");

  if (!token || !chatId) {
    resLabel.innerHTML = `<span style="color:#f87171;">Ingresa el Token y Chat ID</span>`;
    return;
  }

  resLabel.innerHTML = `<span style="color:#fbbf24;">Enviando mensaje...</span>`;
  try {
    const res = await fetch("/api/telegram/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_token: token, chat_id: chatId })
    });
    const data = await res.json();
    if (data.success) {
      resLabel.innerHTML = `<span style="color:#34d399;">✅ ¡Mensaje enviado con éxito al grupo!</span>`;
    } else {
      resLabel.innerHTML = `<span style="color:#f87171;">❌ Error: ${data.error}</span>`;
    }
  } catch (err) {
    resLabel.innerHTML = `<span style="color:#f87171;">❌ Error de conexión</span>`;
  }
}

async function sendAllFlyersToTelegram() {
  const btn = document.getElementById("btnSendTelegramFlyers");
  if (!currentRatesData || !window.FlyerRenderer) return;

  const cfgRes = await fetch("/api/config");
  const cfg = await cfgRes.json();
  const tg = cfg.telegram || {};

  if (!tg.enabled || !tg.bot_token || !tg.chat_id) {
    alert("⚠️ Antes de publicar en Telegram, debes configurar el Bot Token y Chat ID en '⚙️ Ajustes'.");
    openSettingsModal();
    return;
  }

  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.textContent = "Publicando...";

  try {
    const flyers = currentRatesData.flyers || [];
    let sentCount = 0;

    for (let i = 0; i < flyers.length; i++) {
      const f = flyers[i];
      btn.textContent = `Enviando (${i + 1}/${flyers.length})...`;

      const offCanvas = document.createElement("canvas");
      window.FlyerRenderer.renderToCanvas(offCanvas, f, 2.0);
      const dataUrl = offCanvas.toDataURL("image/png");

      let summaryList = f.corridors.map(c => `• ${c.destination_fiat} (${c.name}): <b>${c.rate_standard}</b>`).join("\n");
      const caption = `📊 <b>${f.title} - Envíos YA!</b>\n\n${summaryList}\n\n📲 <i>WhatsApp: ${f.whatsapp || "+56 973614725"}</i>`;

      const res = await fetch("/api/telegram/send-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: dataUrl, caption: caption })
      });
      const data = await res.json();
      if (data.success) sentCount++;
    }

    if (sentCount > 0) {
      alert(`✅ ¡Se publicaron ${sentCount} flyers en HD exitosamente en tu grupo de Telegram!`);
      saveBenchmarkSnapshot(false, null);
    } else {
      alert("❌ No se pudieron enviar las fotos a Telegram. Revisa el Token y Chat ID en Ajustes.");
    }
  } catch (err) {
    console.error("Error sending flyers to Telegram:", err);
    alert("Error de conexión al enviar a Telegram.");
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// Settings Modal
async function openSettingsModal() {
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json();
    const s = cfg.settings || {};
    const tg = cfg.telegram || {};
    const f0 = (cfg.flyers && cfg.flyers[0]) || {};

    document.getElementById("cfgStandardMargin").value = s.default_margin_standard || 7.0;
    document.getElementById("cfgPrefMargin").value = s.default_margin_preferential || 6.3;
    document.getElementById("cfgClpThreshold").value = s.preferential_clp_threshold || 100000;
    document.getElementById("cfgSkipTop").value = s.merchant_skip_top || 3;
    document.getElementById("cfgSampleCount").value = s.merchant_sample_count || 8;
    document.getElementById("cfgWhatsapp").value = f0.whatsapp || "+56 973614725";
    document.getElementById("cfgBrandName").value = f0.brand_name || "ENVÍOS YA!";

    document.getElementById("cfgTgEnabled").checked = Boolean(tg.enabled);
    document.getElementById("cfgTgToken").value = tg.bot_token || "";
    document.getElementById("cfgTgChatId").value = tg.chat_id || "";
    document.getElementById("tgTestResult").innerHTML = "";

    settingsModal.classList.add("active");
  } catch (err) {
    console.error("Error loading config:", err);
  }
}

async function saveSettings() {
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json();

    cfg.settings.default_margin_standard = parseFloat(document.getElementById("cfgStandardMargin").value);
    cfg.settings.default_margin_preferential = parseFloat(document.getElementById("cfgPrefMargin").value);
    cfg.settings.preferential_clp_threshold = parseInt(document.getElementById("cfgClpThreshold").value);
    cfg.settings.merchant_skip_top = parseInt(document.getElementById("cfgSkipTop").value);
    cfg.settings.merchant_sample_count = parseInt(document.getElementById("cfgSampleCount").value);

    const wa = document.getElementById("cfgWhatsapp").value;
    const brand = document.getElementById("cfgBrandName").value;

    cfg.telegram = {
      enabled: document.getElementById("cfgTgEnabled").checked,
      bot_token: document.getElementById("cfgTgToken").value.trim(),
      chat_id: document.getElementById("cfgTgChatId").value.trim(),
      alert_on_danger: true
    };

    cfg.flyers.forEach(f => {
      f.whatsapp = wa;
      f.brand_name = brand;
    });

    const updateRes = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg)
    });

    if (updateRes.ok) {
      settingsModal.classList.remove("active");
      fetchRates(true);
    }
  } catch (err) {
    console.error("Error saving settings:", err);
  }
}

// Helpers
function getFlagEmoji(fiat) {
  const map = {
    USD: "🇺🇸",
    VES: "🇻🇪",
    CLP: "🇨🇱",
    COP: "🇨🇴",
    PEN: "🇵🇪",
    MXN: "🇲🇽",
    BOB: "🇧🇴",
    ARS: "🇦🇷",
    EUR: "🇪🇺"
  };
  return map[fiat] || "🌐";
}

function formatNumber(val, decimals = 2) {
  if (val === undefined || val === null || val === "") return "--";
  if (window.FlyerRenderer && window.FlyerRenderer.formatRateSmart) {
    return window.FlyerRenderer.formatRateSmart(val);
  }
  return Number(val).toString();
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
}
