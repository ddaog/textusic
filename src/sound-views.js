import { WaveformDisplay } from './waveform-display.js';
export const SOUND_VIEWS = ['contour', 'scope', 'memory'];
const INK = '#617b76', ACCENT = '#c97855', GRID = '#cdd3cc';
const names = { contour:'01 / SPECTRAL CONTOUR', scope:'02 / WAVEFORM', memory:'03 / SPECTRAL MEMORY' };
const clamp01 = value => Math.max(0, Math.min(1, value));

// Word profiles use hex or modern hsl(); no DOM/color readback in the render loop.
export function colorChannels(color) {
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color);
  if (hex) {
    const value = hex[1].length === 3 ? [...hex[1]].map(c => c+c).join('') : hex[1];
    return [0,2,4].map(i => parseInt(value.slice(i,i+2),16));
  }
  const rgb = /^rgb\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\)$/i.exec(color);
  if (rgb) return rgb.slice(1).map(Number);
  const hsl = /^hsl\(([-\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%\)$/i.exec(color);
  if (hsl) {
    const h = ((Number(hsl[1]) % 360)+360)%360/60, s=clamp01(Number(hsl[2])/100), l=clamp01(Number(hsl[3])/100);
    const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs(h%2-1)), m=l-c/2;
    return [[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h)].map(v=>(v+m)*255);
  }
  return [97,123,118];
}
const blendColor = (a,b,t) => `rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(' ')})`;

// Semantic color identity, not per-word frequency attribution.
export function linkedWords(words = [], section = null, cue = null) {
  const active = words.filter(word => !section || (word.start < section.end && word.end > section.start));
  const selected = [];
  const edited = cue && active.find(word => word.start === cue.start);
  if (edited) selected.push(edited);
  for (const word of active) {
    if (selected.length === 2) break;
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
    this.playback = null;
    this.scope = new WaveformDisplay();
  }
  reset() { this.history.forEach(row => row.fill(0)); this.colors.fill(INK); this.cursor = 0; this.last = -Infinity; this.scope.reset(); }
  setWords(words, section, cue) { this.words = linkedWords(words, section, cue); this.cue = cue; }
  setPlaybackWords(words, now, duration = 800, reducedMotion = false) {
    if (words === null) { this.playback = null; return; }
    const next = words.slice(0,2).map(word => ({...word, activity:clamp01(word.activity ?? 1)}));
    const key = next.map(word => `${word.start}:${word.end}:${word.text}:${word.color}`).join('|');
    if (this.playback?.key === key) {
      this.playback.words = next;
      if (reducedMotion) this.playback.duration = 0;
      return;
    }
    const previous = this.playback;
    const colors = previous ? this.paletteAt(now) : this.words.map(word=>word.color);
    const from = Array.from({length:2},(_,i)=>colorChannels(colors[i] ?? colors.at(-1) ?? INK));
    const to = Array.from({length:2},(_,i)=>colorChannels(next[i]?.color ?? next.at(-1)?.color ?? INK));
    const outgoing = previous ? (this.playbackProgress(now) < .5 ? previous.outgoing : previous.words) : [];
    this.playback = { key, words:next, outgoing, from, to, started:now,
      duration:reducedMotion ? 0 : Math.max(0,duration) };
  }
  playbackProgress(now) {
    const state = this.playback;
    if (!state || !state.duration) return 1;
    const t=clamp01((now-state.started)/state.duration);
    return t*t*(3-2*t);
  }
  paletteAt(now) {
    if (!this.playback) return this.words.map(word=>word.color);
    const t=this.playbackProgress(now);
    return this.playback.from.map((color,i)=>blendColor(color,this.playback.to[i],t));
  }
  draw(ctx, width, height, mode, spectrum, now, playing, reducedMotion) {
    const levels = spectrum?.read(now) ?? new Float32Array(12);
    const colors = this.paletteAt(now);
    if (mode === 'memory' && playing && now - this.last >= 1000 / 15) {
      this.colors[this.cursor] = colors[0] ?? INK;
      this.history[this.cursor].set(levels); this.cursor = (this.cursor + 1) % 64; this.last = now;
    }
    const x = 18, y = 51, w = Math.max(1, width - 36), h = Math.max(20, height - 81);
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
    const drawWord = (word, i, opacity) => {
      if (!word || opacity <= 0) return;
      const px = x + i * w / 2;
      ctx.globalAlpha = opacity * (.65 + .35 * (word.activity ?? 1));
      ctx.fillStyle = word.color;
      ctx.fillRect(px,31,3,3);
      ctx.fillStyle = '#65736d';
      ctx.fillText([...word.text].slice(0,10).join(''), px+10, 36);
      if (this.cue?.start === word.start && now - this.cue.born < 700) {
        ctx.globalAlpha = opacity * (reducedMotion ? .5 : Math.max(0,1-(now-this.cue.born)/700));
        ctx.fillRect(px,40,Math.min(w/2-8,60),1); ctx.globalAlpha = 1;
      }
    };
    if (this.playback) {
      const progress = reducedMotion ? 1 : this.playbackProgress(now);
      // Fixed slots, fade THROUGH empty ink: never superimpose two words.
      for (let i=0;i<2;i++) {
        const before=this.playback.outgoing[i], after=this.playback.words[i];
        if (before?.start === after?.start && before?.text === after?.text) drawWord(after,i,1);
        else if (progress < .5) drawWord(before,i,1-progress*2);
        else drawWord(after,i,(progress-.5)*2);
      }
      if (progress >= 1) this.playback.outgoing = [];
    } else this.words.forEach((word,i)=>drawWord(word,i,1));
    ctx.globalAlpha = 1;
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
        ctx.fillStyle = colors[Math.min(colors.length-1,Math.floor(i/6))] ?? INK; ctx.globalAlpha = .3 + levels[i] * .7;
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI*2); ctx.fill();
      }); ctx.globalAlpha = 1;
    } else if (mode === 'scope') {
      const wave = this.scope.sample(playing ? spectrum?.waveform : null,now,reducedMotion);
      ctx.strokeStyle = stroke; ctx.beginPath();
      // Display-only sensitivity. Real samples, fixed gain, bounded peaks.
      const count = wave.length;
      for (let i = 0; i < count; i++) {
        const px = x + w * i / (count - 1), py = y + h / 2 - wave[i] * h * .46;
        if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.globalAlpha = .12; ctx.lineWidth = 5; ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1.4; ctx.stroke(); ctx.fillStyle = ink;
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
    ctx.fillText(mode === 'memory' ? 'NOW · LOW ↑ HIGH' : mode === 'scope' ? 'DISPLAY ×3' : 'MID → AIR', width-x, height-10);
    ctx.restore();
  }
}
