// Reflow editor data without rasterizing DOM or running another FFT.
export function layoutVideoWords(ctx, text, lines, size, words) {
  const parts = [];
  let offset = 0;
  lines.forEach((line, row) => {
    let local = 0;
    while (local < line.length) {
      const start = offset + local;
      const word = words.find(w => start >= w.start && start < w.end);
      let end = local + String.fromCodePoint(line.codePointAt(local)).length;
      while (end < line.length) {
        const next = words.find(w => offset + end >= w.start && offset + end < w.end);
        if (next !== word) break;
        end += String.fromCodePoint(line.codePointAt(end)).length;
      }
      const content = line.slice(local, end);
      parts.push({ text: content, start, end: offset + end, word,
        x: 36 + ctx.measureText(line.slice(0, local)).width,
        y: 76 + size + row * size * 1.45,
        width: ctx.measureText(content).width, alpha: null });
      local = end;
    }
    offset += line.length;
    if (text[offset] === '\n') offset++;
  });
  return parts;
}

export function updateVideoEmphasis(parts, active, elapsed, reducedMotion = false) {
  const blend = reducedMotion ? 1 : 1 - Math.exp(-Math.min(200, Math.max(0, elapsed)) / 260);
  for (const part of parts) {
    const target = !active || (part.start < active.end && part.end > active.start) ? 1 : 0.38;
    part.alpha = part.alpha === null ? target : part.alpha + (target - part.alpha) * blend;
  }
}

export function drawVideoWords(ctx, parts, size, edges, energy = 0) {
  const centers = new Map();
  for (const p of parts) if (p.word && !centers.has(p.word.start)) centers.set(p.word.start, { x: p.x + p.width / 2, y: p.y - size * .35, alpha: p.alpha });
  ctx.save();
  for (const edge of edges) {
    const a = centers.get(edge.fromStart), b = centers.get(edge.toStart);
    if (!a || !b) continue;
    ctx.strokeStyle = edge.color; ctx.lineWidth = edge.type === 'patch' ? .85 : .65;
    ctx.setLineDash(edge.dash);
    const active = Math.max(a.alpha, b.alpha);
    ctx.globalAlpha = (.16 + energy * .74) * active * active;
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    if (Math.abs(a.y - b.y) > size && ['patch', 'shared-subject'].includes(edge.type)) {
      const bend = Math.max(12, Math.min(a.x, b.x) - 20);
      ctx.bezierCurveTo(bend, a.y, bend, b.y, b.x, b.y);
    } else ctx.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - Math.min(18, size * .5), b.x, b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const part of parts) {
    const { word, x, y, width } = part;
    ctx.globalAlpha = part.alpha;
    const color = word?.color || '#424b48', accent = word?.accent || color;
    ctx.fillStyle = color; ctx.shadowBlur = 0;
    if (word && ['leaf', 'bloom'].includes(word.effect)) {
      ctx.globalAlpha = part.alpha * .16; ctx.fillStyle = accent;
      ctx.fillRect(x, y - size * .16, width, size * .3);
      ctx.globalAlpha = part.alpha; ctx.fillStyle = color;
    }
    if (word && ['spark', 'ray', 'prism', 'ember', 'jitter'].includes(word.effect)) {
      ctx.shadowColor = accent; ctx.shadowBlur = Math.min(9, size * .25) * (.4 + energy * .6);
    }
    ctx.fillText(part.text, x, y); ctx.shadowBlur = 0;
    if (!word) continue;
    const wave = ['ripple', 'wave', 'wind'].includes(word.effect);
    const dotted = word.effect === 'rain' || word.embedding;
    if (wave || dotted || word.effect === 'grid') {
      ctx.globalAlpha = part.alpha * .72;
      ctx.strokeStyle = accent; ctx.lineWidth = Math.max(.6, size * .035);
      ctx.setLineDash(dotted && !wave ? [1, 3] : []); ctx.beginPath();
      const underline = y + size * .18;
      ctx.moveTo(x, underline);
      if (wave) for (let dx = 1; dx <= width; dx++) ctx.lineTo(x + dx, underline + Math.sin(dx / Math.max(1, size * .07)) * size * .045);
      else ctx.lineTo(x + width, underline);
      ctx.stroke(); ctx.setLineDash([]);
    }
  }
  ctx.fillStyle = '#df805d';
  for (const [start, p] of centers) {
    if (!edges.some(e => e.fromStart === start || e.toStart === start)) continue;
    ctx.globalAlpha = (.24 + .76 * energy) * p.alpha;
    ctx.beginPath(); ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
