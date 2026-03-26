// Draws the 2D canvas fallback scene when Three.js initialization is unavailable.

export function createFallbackViewport(width, height) {
  return {
    width,
    height,
    centerX: width / 2,
    centerY: height / 2,
    scale: Math.min(width, height) * 0.18
  };
}

export function drawFallbackBackground(context, viewport) {
  context.clearRect(0, 0, viewport.width, viewport.height);

  const background = context.createLinearGradient(0, 0, viewport.width, viewport.height);
  background.addColorStop(0, "rgba(24, 55, 82, 0.95)");
  background.addColorStop(1, "rgba(6, 14, 24, 0.98)");
  context.fillStyle = background;
  context.fillRect(0, 0, viewport.width, viewport.height);
}

export function drawFallbackGuides(context, viewport) {
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.1)";
  context.lineWidth = 1;

  for (let step = 1; step <= 4; step += 1) {
    context.beginPath();
    context.arc(viewport.centerX, viewport.centerY, viewport.scale * step * 0.95, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

export function drawFallbackTrails(context, viewport, bodies, trailHistory, pixelRatio) {
  for (const body of bodies) {
    const history = trailHistory.get(body.id);

    if (!history || history.length < 2) {
      continue;
    }

    context.save();
    context.strokeStyle = `${body.color}88`;
    context.lineWidth = Math.max(1.25, pixelRatio * 1.2);
    context.beginPath();

    history.forEach((point, index) => {
      const x = viewport.centerX + point.x * viewport.scale;
      const y = viewport.centerY - point.y * viewport.scale;

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });

    context.stroke();
    context.restore();
  }
}

export function drawFallbackBodies(context, viewport, bodies, pixelRatio) {
  for (const body of bodies) {
    const x = viewport.centerX + body.position.x * viewport.scale;
    const y = viewport.centerY - body.position.y * viewport.scale;
    const radius = Math.max(5 * pixelRatio, Math.sqrt(body.mass) * 6 * pixelRatio);

    context.save();
    context.fillStyle = body.color;
    context.shadowBlur = 24 * pixelRatio;
    context.shadowColor = body.color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

export function drawFallbackModeLabel(context, modeLabel, pixelRatio) {
  context.save();
  context.fillStyle = "rgba(255, 255, 255, 0.76)";
  context.font = `${14 * pixelRatio}px Segoe UI`;
  context.fillText(modeLabel, 16 * pixelRatio, 28 * pixelRatio);
  context.restore();
}

export function renderFallbackScene({
  context,
  width,
  height,
  bodies,
  trailHistory,
  pixelRatio,
  showTrails,
  modeLabel
}) {
  const viewport = createFallbackViewport(width, height);

  drawFallbackBackground(context, viewport);
  drawFallbackGuides(context, viewport);

  if (showTrails) {
    drawFallbackTrails(context, viewport, bodies, trailHistory, pixelRatio);
  }

  drawFallbackBodies(context, viewport, bodies, pixelRatio);
  drawFallbackModeLabel(context, modeLabel, pixelRatio);
}