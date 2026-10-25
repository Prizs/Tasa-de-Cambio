// 3D Spherical Flags Renderer for HTML5 Canvas
const FlagDrawer = {
  drawSphereFlag(ctx, flagKey, x, y, radius) {
    ctx.save();
    
    // Draw shadow underneath
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.9, radius * 0.85, radius * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.filter = "blur(4px)";
    ctx.fill();
    ctx.restore();

    // Circular clip for the sphere
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    // Render specific flag base
    const key = (flagKey || "").toLowerCase();
    switch (key) {
      case "usa":
      case "usd":
        this.drawUSA(ctx, x, y, radius);
        break;
      case "venezuela":
      case "ves":
        this.drawVenezuela(ctx, x, y, radius);
        break;
      case "chile":
      case "clp":
        this.drawChile(ctx, x, y, radius);
        break;
      case "mexico":
      case "mxn":
        this.drawMexico(ctx, x, y, radius);
        break;
      case "colombia":
      case "cop":
        this.drawColombia(ctx, x, y, radius);
        break;
      case "peru":
      case "pen":
        this.drawPeru(ctx, x, y, radius);
        break;
      case "ecuador":
        this.drawEcuador(ctx, x, y, radius);
        break;
      case "bolivia":
      case "bob":
        this.drawBolivia(ctx, x, y, radius);
        break;
      case "argentina":
      case "ars":
        this.drawArgentina(ctx, x, y, radius);
        break;
      default:
        ctx.fillStyle = "#4a5568";
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    // 3D Sphere Specular Highlight and Shadow Overlay
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, true);
    ctx.clip();

    // Inner shadow for depth
    const innerShadow = ctx.createRadialGradient(
      x - radius * 0.2, y - radius * 0.3, radius * 0.3,
      x, y, radius
    );
    innerShadow.addColorStop(0, "rgba(255, 255, 255, 0.45)");
    innerShadow.addColorStop(0.5, "rgba(255, 255, 255, 0)");
    innerShadow.addColorStop(0.85, "rgba(0, 0, 0, 0.15)");
    innerShadow.addColorStop(1, "rgba(0, 0, 0, 0.55)");
    ctx.fillStyle = innerShadow;
    ctx.fill();

    // Top glossy reflection (specular arc)
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.15, y - radius * 0.45, radius * 0.6, radius * 0.3, -Math.PI / 12, 0, Math.PI * 2);
    const gloss = ctx.createLinearGradient(x, y - radius * 0.7, x, y - radius * 0.2);
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.55)");
    gloss.addColorStop(1, "rgba(255, 255, 255, 0.0)");
    ctx.fillStyle = gloss;
    ctx.fill();

    // Fine border outline
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  },

  drawUSA(ctx, x, y, r) {
    const startX = x - r;
    const startY = y - r;
    const size = r * 2;
    const stripeH = size / 13;

    for (let i = 0; i < 13; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#B22234" : "#FFFFFF";
      ctx.fillRect(startX, startY + i * stripeH, size, stripeH + 0.5);
    }

    const cantonW = size * 0.5;
    const cantonH = stripeH * 7;
    ctx.fillStyle = "#3C3B6E";
    ctx.fillRect(startX, startY, cantonW, cantonH);

    ctx.fillStyle = "#FFFFFF";
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 6; col++) {
        const sx = startX + 4 + col * (cantonW - 8) / 5;
        const sy = startY + 4 + row * (cantonH - 8) / 4;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  drawVenezuela(ctx, x, y, r) {
    const startX = x - r;
    const startY = y - r;
    const size = r * 2;
    const h = size / 3;

    ctx.fillStyle = "#FCD116";
    ctx.fillRect(startX, startY, size, h);

    ctx.fillStyle = "#003893";
    ctx.fillRect(startX, startY + h, size, h);

    ctx.fillStyle = "#CE1126";
    ctx.fillRect(startX, startY + h * 2, size, h);

    ctx.fillStyle = "#FFFFFF";
    const starRadius = r * 0.42;
    const starCenterY = y + r * 0.12;
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI * 1.15 + (i * (Math.PI * 0.7) / 7);
      const sx = x + Math.cos(angle) * starRadius;
      const sy = starCenterY + Math.sin(angle) * (starRadius * 0.55);
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawChile(ctx, x, y, r) {
    const startX = x - r;
    const startY = y - r;
    const size = r * 2;
    const halfH = size / 2;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(startX, startY, size, halfH);

    ctx.fillStyle = "#D52B1E";
    ctx.fillRect(startX, startY + halfH, size, halfH);

    const cantonSize = halfH;
    ctx.fillStyle = "#0039A6";
    ctx.fillRect(startX, startY, cantonSize, cantonSize);

    this.drawStar(ctx, startX + cantonSize / 2, startY + cantonSize / 2, 5, cantonSize * 0.28, cantonSize * 0.12, "#FFFFFF");
  },

  drawColombia(ctx, x, y, r) {
    const startX = x - r;
    const startY = y - r;
    const size = r * 2;

    ctx.fillStyle = "#FCD116";
    ctx.fillRect(startX, startY, size, size * 0.5);

    ctx.fillStyle = "#003893";
    ctx.fillRect(startX, startY + size * 0.5, size, size * 0.25);

    ctx.fillStyle = "#CE1126";
    ctx.fillRect(startX, startY + size * 0.75, size, size * 0.25);
  },

  drawEcuador(ctx, x, y, r) {
    this.drawColombia(ctx, x, y, r);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "#0055A5";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#DA291C";
    ctx.stroke();
  },

  drawMexico(ctx, x, y, r) {
    const startX = x - r;
    const startY = y - r;
    const size = r * 2;
    const w = size / 3;

    ctx.fillStyle = "#006847";
    ctx.fillRect(startX, startY, w, size);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(startX + w, startY, w, size);

    ctx.fillStyle = "#CE1126";
    ctx.fillRect(startX + w * 2, startY, w, size);

    ctx.beginPath();
    ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = "#795548";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#FFB300";
    ctx.stroke();
  },

  drawPeru(ctx, x, y, r) {
    const startX = x - r;
    const startY = y - r;
    const size = r * 2;
    const w = size / 3;

    ctx.fillStyle = "#D91023";
    ctx.fillRect(startX, startY, w, size);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(startX + w, startY, w, size);

    ctx.fillStyle = "#D91023";
    ctx.fillRect(startX + w * 2, startY, w, size);
  },

  drawBolivia(ctx, x, y, r) {
    const startX = x - r;
    const startY = y - r;
    const size = r * 2;
    const h = size / 3;

    // Red
    ctx.fillStyle = "#D52B1E";
    ctx.fillRect(startX, startY, size, h);

    // Yellow
    ctx.fillStyle = "#FCD116";
    ctx.fillRect(startX, startY + h, size, h);

    // Green
    ctx.fillStyle = "#007934";
    ctx.fillRect(startX, startY + h * 2, size, h);

    // Emblem in yellow center band
    ctx.beginPath();
    ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = "#0284c7";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#F59E0B";
    ctx.stroke();
  },

  drawArgentina(ctx, x, y, r) {
    const startX = x - r;
    const startY = y - r;
    const size = r * 2;
    const h = size / 3;

    // Sky Blue
    ctx.fillStyle = "#74ACDF";
    ctx.fillRect(startX, startY, size, h);

    // White
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(startX, startY + h, size, h);

    // Sky Blue
    ctx.fillStyle = "#74ACDF";
    ctx.fillRect(startX, startY + h * 2, size, h);

    // Sun of May in center
    ctx.beginPath();
    ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = "#F6B40E";
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "#854d0e";
    ctx.stroke();
  },

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
};

// Explicit global exposure
window.FlagDrawer = FlagDrawer;
