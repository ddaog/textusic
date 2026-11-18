export const SOUND_VIEWS = ['contour', 'scope', 'memory'];
const INK = '#617b76', ACCENT = '#c97855', GRID = '#cdd3cc';
const names = { contour:'01 / SPECTRAL CONTOUR', scope:'02 / WAVEFORM', memory:'03 / SPECTRAL MEMORY' };

// Semantic color identity, not per-word frequency attribution.
export function linkedWords(words = [], section = null, cue = null) {
  const active = words.filter(word => !section || (word.start < section.end && word.end > section.start));
  const selected = [];
  const edited = cue && active.find(word => word.start === cue.start);
  if (edited) selected.push(edited);
  for (const word of active) {
    if (selected.length === 3) break;
    if (!selected.some(item => item.color === word.color)) selected.push(word);
  }
  return selected;
}

// A fixed-size history, shared analyser, no additional audio nodes or render loop.
export class SoundViews {
  constructor() {
    this.history = Array.from({ length:64 }, () => new Float32Array(12));
    this.cursor = 0; this.last = -Infinity;
    this.words = []; this.colors = new Array(64).fill(INK);
  }
  reset() { this.history.forEach(row => row.fill(0)); this.colors.fill(INK); this.cursor = 0; this.last = -Infinity; }
  setWords(words, section, cue) { this.words = linkedWords(words, section, cue); this.cue = cue; }
  draw(ctx, width, height, mode, spectrum, now, playing, reducedMotion) {
    const levels = spectrum?.read(now) ?? new Float32Array(12);
    if (mode === 'memory' && playing && now - this.last >= 1000 / 15) {
      this.colors[this.cursor] = this.words[0]?.color ?? INK;
      this.history[this.cursor].set(levels); this.cursor = (this.cursor + 1) % 64; this.last = now;
    }
    const x = 18, y = 51, w = Math.max(1, width - 36), h = Math.max(20, height - 81);
    const colors = this.words.map(word => word.color);
    const ink = colors[0] ?? INK;
    const stroke = ctx.createLinearGradient(x,0,x+w,0);
    (colors.length ? colors : [INK, ACCENT]).forEach((color,i,a) => stroke.addColorStop(a.length === 1 ? 0 : i/(a.length-1),color));
    ctx.save();
    ctx.fillStyle = '#eff1ed'; ctx.fillRect(0, 0, width, height);
    ctx.font = '9px ui-monospace, monospace'; ctx.fillStyle = INK;
    ctx.fillText(names[mode], x, 17);
    ctx.textAlign = 'right'; ctx.fillStyle = playing ? ACCENT : '#929b92';
    ctx.fillText(playing ? 'LIVE / OUTPUT' : 'STANDBY', width - x, 17);
    ctx.textAlign = 'left';
    this.words.forEach((word,i) => {
      const px = x + i * w / 3;
      ctx.fillStyle = word.color;
      ctx.fillText('· ' + [...word.text].slice(0,7).join(''), px, 36);
      if (this.cue?.start === word.start && now - this.cue.born < 700) {
        ctx.globalAlpha = reducedMotion ? .5 : Math.max(0,1-(now-this.cue.born)/700);
        ctx.fillRect(px,40,Math.min(w/3-8,60),1.5); ctx.globalAlpha = 1;
      }
    });
    ctx.strokeStyle = GRID; ctx.lineWidth = .5;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(x, y + h * i / 4); ctx.lineTo(x + w, y + h * i / 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * i / 4, y); ctx.lineTo(x + w * i / 4, y + h); ctx.stroke();
    }
    if (mode === 'contour') {
      const points = Array.from(levels, (v, i) => [x + w * i / 11, y + h * (1 - v * .9)]);
      const path = () => {
        ctx.beginPath(); ctx.moveTo(...points[0]);
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1], b = points[i], mid = (a[0] + b[0]) / 2;
          ctx.bezierCurveTo(mid, a[1], mid, b[1], b[0], b[1]);
        }
      };
      path(); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
      const fill = ctx.createLinearGradient(0,y,0,y+h); fill.addColorStop(0,'#668c8640'); fill.addColorStop(1,'#668c8603');
      ctx.fillStyle = fill; ctx.fill();
      path(); ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke();
      points.forEach(([px,py], i) => {
        ctx.fillStyle = colors[Math.min(colors.length-1,Math.floor(i/4))] ?? INK; ctx.globalAlpha = .3 + levels[i] * .7;
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI*2); ctx.fill();
      }); ctx.globalAlpha = 1;
    } else if (mode === 'scope') {
      const wave = spectrum?.waveform;
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.beginPath();
      // No automatic gain: a quiet signal really looks smaller. No fake oscillation.
      const count = wave?.length ?? 256;
      for (let i = 0; i < count; i++) {
        const px = x + w * i / (count - 1), py = y + h / 2 - ((wave?.[i] ?? 128) - 128) / 128 * h * .46;
        if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.fillStyle = ink;
      ctx.fillRect(x - 3, y + h / 2 - 1, 6, 2);
    } else if (mode === 'memory') {
      // Reduced-motion uses a stationary current-spectrum matrix instead of scrolling history.
      for (let col = 0; col < 64; col++) {
        const row = reducedMotion ? levels : this.history[(this.cursor + col) % 64];
        for (let band = 0; band < 12; band++) {
          const value = row[band];
          if (value < .015) continue;
          ctx.globalAlpha = value * .8;
          ctx.fillStyle = reducedMotion ? ink : this.colors[(this.cursor + col) % 64];
          ctx.fillRect(x + col * w / 64, y + (11-band) * h / 12, Math.max(.5,w/64-.6), Math.max(.5,h/12-1));
        }
      }
      ctx.globalAlpha = 1; ctx.fillStyle = ACCENT; ctx.fillRect(x+w, y, 1, h);
    }
    ctx.globalAlpha = 1; ctx.fillStyle = '#89948b'; ctx.textAlign = 'left';
    ctx.fillText(mode === 'memory' ? (reducedMotion ? 'CURRENT SPECTRUM' : 'PAST  ←  ~4s') : mode === 'scope' ? 'TIME / 1,024 SAMPLES' : 'LOW', x, height - 10);
    ctx.textAlign = 'right';
    ctx.fillText(mode === 'memory' ? 'NOW · LOW ↑ HIGH' : mode === 'scope' ? 'MONO SUM' : 'MID → AIR', width-x, height-10);
    ctx.restore();
  }
}
