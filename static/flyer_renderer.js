// High-Resolution Flyer Canvas Renderer matching user template
const FlyerRenderer = {
  renderToCanvas(canvas, flyerData, scale = 1.0) {
    if (!canvas || !flyerData) return;

    const corridors = flyerData.corridors || [];
    const count = corridors.length;

    // Base dimensions: 800 x 1200 or 800 x 1350 for 6 corridors to look perfectly structured
    const baseW = 800;
    const baseH = count > 4 ? (baseW * 1.62) : (baseW * 1.5); // 1200 to 1300 px
    const width = baseW * scale;
    const height = baseH * scale;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // 1. Background: Deep Crimson / Wine Gradient with Spotlight
    const bgGrad = ctx.createRadialGradient(
      width * 0.5, height * 0.45, width * 0.1,
      width * 0.5, height * 0.5, width * 0.95
    );
    bgGrad.addColorStop(0, "#990505");
    bgGrad.addColorStop(0.45, "#680202");
    bgGrad.addColorStop(0.85, "#3b0000");
    bgGrad.addColorStop(1, "#200000");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle dark vignette at edges
    const vignette = ctx.createRadialGradient(
      width * 0.5, height * 0.5, width * 0.35,
      width * 0.5, height * 0.5, width * 0.88
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // 2. Header Section
    const headerBottomY = this.drawHeader(ctx, flyerData, width, height, scale);

    // 3. Footer Section (draw first or get bottom boundary)
    const footerTopY = height - (95 * scale);

    // 4. Middle Corridors Section (evenly distributed between header and footer)
    this.drawCorridors(ctx, flyerData, width, height, scale, headerBottomY, footerTopY);

    // 5. Draw Footer
    this.drawFooter(ctx, flyerData, width, height, scale, footerTopY);
  },

  drawHeader(ctx, flyer, w, h, s) {
    const isZelle = flyer.id === "flyer_zelle" || (flyer.origin && flyer.origin.payTypes && flyer.origin.payTypes.includes("Zelle"));
    
    // Globe on top left
    const globeX = 145 * s;
    const globeY = 120 * s;
    const globeR = 64 * s;

    ctx.save();
    ctx.beginPath();
    ctx.arc(globeX, globeY, globeR, 0, Math.PI * 2);
    const globeGrad = ctx.createRadialGradient(globeX - 18 * s, globeY - 22 * s, 10 * s, globeX, globeY, globeR);
    globeGrad.addColorStop(0, "#ffffff");
    globeGrad.addColorStop(0.35, "#e0f2fe");
    globeGrad.addColorStop(0.75, "#38bdf8");
    globeGrad.addColorStop(1, "#0284c7");
    ctx.fillStyle = globeGrad;
    ctx.fill();

    // Continent silhouettes (blue shape)
    ctx.beginPath();
    ctx.arc(globeX, globeY, globeR, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.ellipse(globeX + 5 * s, globeY + 15 * s, 34 * s, 48 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Money ribbon wrapping around globe
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(globeX, globeY - 5 * s, 78 * s, 28 * s, -0.4, 0, Math.PI * 2);
    ctx.lineWidth = 15 * s;
    ctx.strokeStyle = "rgba(241, 245, 249, 0.95)";
    ctx.stroke();
    // Inner green dollar markings on ribbon
    ctx.lineWidth = 2.5 * s;
    ctx.strokeStyle = "#16a34a";
    ctx.stroke();
    ctx.restore();

    // Top Right Logo / Header Title
    const headerTitle = flyer.badge_header || "Zelle";
    const headerSub = flyer.subtitle || "THIS IS HOW MONEY MOVES";

    ctx.save();
    if (isZelle) {
      // Zelle styling
      ctx.font = `bold italic ${78 * s}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = "#7414CA";
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 8 * s;
      ctx.fillText("żelle", 420 * s, 145 * s);

      ctx.shadowBlur = 0;
      ctx.font = `bold ${16 * s}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = "#00c4cc";
      ctx.fillText(headerSub, 385 * s, 202 * s);
    } else {
      ctx.font = `900 ${48 * s}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = "#FBBF24";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 8 * s;
      ctx.fillText(headerTitle.toUpperCase(), 340 * s, 135 * s);

      ctx.shadowBlur = 0;
      ctx.font = `bold ${17 * s}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = "#E2E8F0";
      ctx.fillText(headerSub, 350 * s, 182 * s);
    }
    ctx.restore();

    // Minimum Amount Badge
    ctx.save();
    ctx.font = `italic 900 ${34 * s}px "Arial Black", Arial, sans-serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 8 * s;
    ctx.textAlign = "right";
    ctx.fillText(flyer.min_amount_text || "MINIMO 20$", (w - 75 * s), 255 * s);
    ctx.restore();

    // Promotional Headline:
    // Line 1: "ENVÍA DINERO A TU FAMILIA"
    // Line 2: "SEGURO Y RESPONSABLE!"
    // Line 3: "¡LA MEJOR TASA Y RAPIDEZ!"
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#F59E0B";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 10 * s;

    // Line 1: Cleanly centered
    ctx.font = `italic 900 ${36 * s}px "Arial Black", Impact, sans-serif`;
    ctx.fillText("ENVÍA DINERO A TU FAMILIA", w * 0.5, 320 * s);

    // Line 2: SEGURO Y RESPONSABLE!
    ctx.font = `italic 900 ${38 * s}px "Arial Black", Impact, sans-serif`;
    ctx.fillText("SEGURO Y RESPONSABLE!", w * 0.5, 375 * s);

    // Line 3: ¡LA MEJOR TASA Y RAPIDEZ!
    ctx.font = `italic 900 ${31 * s}px "Arial Black", Impact, sans-serif`;
    ctx.fillStyle = "#FBBF24";
    ctx.shadowColor = "#D97706";
    ctx.shadowBlur = 5 * s;
    ctx.fillText("¡LA MEJOR TASA Y RAPIDEZ!", w * 0.5, 432 * s);
    ctx.restore();

    return 465 * s;
  },

  drawCorridors(ctx, flyer, w, h, s, topY, bottomY) {
    const origin = flyer.origin || { flag: "usa" };
    const corridors = flyer.corridors || [];
    const originFlagKey = origin.flag || "usa";
    const count = corridors.length;

    if (count === 0) return;

    // Vertical distribution
    const availableH = bottomY - topY;
    const rowHeight = availableH / count;
    
    // Scale flag size based on count
    const flagRadius = count > 5 ? (44 * s) : (50 * s);
    const leftFlagX = 220 * s;
    const rightFlagX = w - (220 * s);
    const arrowStartX = leftFlagX + flagRadius + 14 * s;
    const arrowEndX = rightFlagX - flagRadius - 14 * s;

    corridors.forEach((corridor, idx) => {
      const centerY = topY + idx * rowHeight + (rowHeight * 0.5);

      // 1. First row: Hand giving money (left) and receiving (right)
      if (idx === 0) {
        this.drawHandIcon(ctx, 105 * s, centerY - 8 * s, 36 * s, "left");
        this.drawHandIcon(ctx, w - 95 * s, centerY - 8 * s, 36 * s, "right");
      }

      // 2. Origin Flag (3D sphere)
      if (window.FlagDrawer) {
        window.FlagDrawer.drawSphereFlag(ctx, originFlagKey, leftFlagX, centerY, flagRadius);
      }

      // 3. 3D Grey Metallic Arrow with Rate
      const displayRate = corridor.rate_standard !== undefined ? corridor.rate_standard : 0;
      this.drawArrowWithRate(ctx, arrowStartX, arrowEndX, centerY, displayRate, s, count);

      // 4. Destination Flag (3D sphere)
      if (window.FlagDrawer) {
        window.FlagDrawer.drawSphereFlag(ctx, corridor.flag || corridor.destination_fiat, rightFlagX, centerY, flagRadius);
      }
    });
  },

  drawArrowWithRate(ctx, x1, x2, y, rate, s, totalRows) {
    ctx.save();
    const arrowH = totalRows > 5 ? (38 * s) : (44 * s);
    const headW = 34 * s;
    const shaftEndX = x2 - headW;
    const top = y - arrowH / 2;
    const bot = y + arrowH / 2;

    // 3D Grey Metallic Gradient
    const arrowGrad = ctx.createLinearGradient(x1, top, x1, bot);
    arrowGrad.addColorStop(0, "#f1f5f9");
    arrowGrad.addColorStop(0.3, "#cbd5e1");
    arrowGrad.addColorStop(0.7, "#94a3b8");
    arrowGrad.addColorStop(1, "#64748b");

    // Shadow
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 8 * s;
    ctx.shadowOffsetY = 4 * s;

    // Arrow polygon
    ctx.beginPath();
    ctx.moveTo(x1, top);
    ctx.lineTo(shaftEndX, top);
    ctx.lineTo(shaftEndX, top - 8 * s);
    ctx.lineTo(x2, y); // arrow tip
    ctx.lineTo(shaftEndX, bot + 8 * s);
    ctx.lineTo(shaftEndX, bot);
    ctx.lineTo(x1, bot);
    ctx.closePath();

    ctx.fillStyle = arrowGrad;
    ctx.fill();

    // Metallic border
    ctx.lineWidth = 1.6 * s;
    ctx.strokeStyle = "#334155";
    ctx.stroke();

    // Rate Text
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let rateStr = this.formatRateSmart(rate);

    const fontSize = rateStr.length > 6 ? (22 * s) : (32 * s);
    ctx.font = `900 ${fontSize}px "Arial Black", sans-serif`;
    ctx.fillStyle = "#090d16";
    ctx.fillText(rateStr, (x1 + shaftEndX) * 0.5, y);

    ctx.restore();
  },

  formatRateSmart(val) {
    if (val === undefined || val === null || val === "" || isNaN(val)) return "0";
    const num = Number(val);
    if (num === 0) return "0";

    // Whole number (no .00)
    if (Number.isInteger(num) || Math.abs(num - Math.round(num)) < 0.00001) {
      return Math.round(num).toString();
    }

    // Number >= 1: max 3 decimals, strip trailing zeros
    if (num >= 1) {
      let s = num.toFixed(3);
      return s.replace(/\.?0+$/, "");
    }

    // Number < 1: handle 0.000... keeping significant meaningful digits
    const str8 = num.toFixed(8);
    const match = str8.match(/^0\.(0+)/);
    if (match) {
      const zerosCount = match[1].length;
      const decimals = Math.min(zerosCount + 3, 7);
      return num.toFixed(decimals).replace(/\.?0+$/, "");
    } else {
      return num.toFixed(3).replace(/\.?0+$/, "");
    }
  },

  drawHandIcon(ctx, x, y, size, direction) {
    ctx.save();
    ctx.translate(x, y);
    if (direction === "right") {
      ctx.scale(-1, 1);
    }
    // Green money banknote
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(-size * 0.4, -size * 0.5, size * 0.8, size * 0.45);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-size * 0.35, -size * 0.45, size * 0.7, size * 0.35);

    // Sleeve
    ctx.fillStyle = "#93c5fd";
    ctx.fillRect(-size * 0.9, -size * 0.1, size * 0.5, size * 0.35);

    // Hand skin
    ctx.fillStyle = "#fbcfe8";
    ctx.beginPath();
    ctx.arc(-size * 0.3, 0, size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  drawFooter(ctx, flyer, w, h, s, footerY) {
    const bottomY = footerY + (45 * s);

    // WhatsApp Bubble
    const waX = 100 * s;
    const waR = 40 * s;

    ctx.save();
    ctx.beginPath();
    ctx.arc(waX, bottomY, waR, 0, Math.PI * 2);
    ctx.fillStyle = "#25D366";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8 * s;
    ctx.fill();

    ctx.restore();
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${38 * s}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✆", waX, bottomY - 2 * s);
    ctx.restore();

    // Phone number text
    ctx.save();
    ctx.font = `900 ${36 * s}px "Arial Black", Arial, sans-serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 8 * s;
    ctx.textBaseline = "middle";
    ctx.fillText(flyer.whatsapp || "+56 973614725", waX + waR + 22 * s, bottomY);
    ctx.restore();

    // Brand Name: "ENVÍOS YA!"
    ctx.save();
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = `italic 900 ${48 * s}px "Times New Roman", Georgia, serif`;

    const textX = w - 60 * s;
    const goldGrad = ctx.createLinearGradient(textX - 260 * s, bottomY - 22 * s, textX, bottomY + 22 * s);
    goldGrad.addColorStop(0, "#FDE68A");
    goldGrad.addColorStop(0.5, "#F59E0B");
    goldGrad.addColorStop(1, "#D97706");

    ctx.fillStyle = goldGrad;
    ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
    ctx.shadowBlur = 10 * s;
    ctx.shadowOffsetX = 2 * s;
    ctx.shadowOffsetY = 2 * s;
    ctx.fillText(flyer.brand_name || "ENVÍOS YA!", textX, bottomY);
    ctx.restore();
  }
};

// Explicit global exposure
window.FlyerRenderer = FlyerRenderer;
