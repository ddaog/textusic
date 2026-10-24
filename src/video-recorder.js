export const VIDEO_TYPES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'];

export function wrapPoem(ctx, text, width) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const character of paragraph) {
      if (line && ctx.measureText(line + character).width > width) { lines.push(line); line = ''; }
      line += character;
    }
    lines.push(line);
  }
  return lines;
}

export function fitVideoPoem(ctx, text, width = 468, height = 290) {
  let low = 0.25, high = 30;
  // Keep every line (including blank stanza separators); never crop or ellipsize.
  for (let step = 0; step < 8; step++) {
    const size = (low + high) / 2;
    ctx.font = `${size}px serif`;
    if (wrapPoem(ctx, text, width).length * size * 1.45 <= height) low = size;
    else high = size;
  }
  const size = Math.floor(low * 4) / 4;
  ctx.font = `${size}px serif`;
  return { size, lines: wrapPoem(ctx, text, width) };
}

const poemLayouts = new WeakMap();

// One bounded-size canvas; copy the existing visualization, never run another synth/FFT.
export function drawVideoFrame(canvas, source, { text = '', label = '' } = {}) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e6e8e3'; ctx.fillRect(0, 0, 540, 960);
  ctx.fillStyle = '#737e78'; ctx.font = '14px sans-serif';
  ctx.fillText('시인을 위한 앰비언트 음악', 36, 45);
  let layout = poemLayouts.get(canvas);
  if (layout?.text !== text) {
    layout = { text, ...fitVideoPoem(ctx, text) };
    poemLayouts.set(canvas, layout);
  }
  const { lines, size } = layout;
  ctx.font = `${size}px serif`;
  ctx.fillStyle = '#424b48';
  lines.forEach((line, index) => {
    ctx.fillText(line, 36, 76 + size + index * size * 1.45);
  });
  ctx.fillStyle = '#cc7454'; ctx.font = '14px sans-serif'; ctx.fillText(label, 36, 420);
  if (source.width && source.height) {
    const scale = Math.min(500 / source.width, 460 / source.height);
    const w = source.width * scale, h = source.height * scale;
    ctx.drawImage(source, (540 - w) / 2, 445 + (460 - h) / 2, w, h);
  }
  ctx.fillStyle = '#737e78'; ctx.font = '12px sans-serif';
  ctx.fillText('ambient-for-poets.vercel.app', 36, 931);
}

export class VideoRecorder {
  constructor(onSaved, onStatus, { Recorder = globalThis.MediaRecorder, Stream = globalThis.MediaStream, createCanvas = () => document.createElement('canvas') } = {}) {
    Object.assign(this, { onSaved, onStatus, Recorder, Stream, createCanvas });
  }
  get active() { return this.recorder?.state === 'recording'; }
  get busy() { return !!this.recorder; }
  connect(output) {
    if (!this.destination || output === this.output) return;
    try { this.output?.disconnect(this.destination); } catch { /* Old synth output may be gone. */ }
    output.connect(this.destination); this.output = output;
  }
  start(context, output, source, getContent) {
    if (this.busy) throw new Error('이전 영상을 저장하는 중이에요.');
    const mimeType = VIDEO_TYPES.find((type) => this.Recorder?.isTypeSupported(type));
    if (!mimeType) throw new Error('이 브라우저는 영상 저장을 지원하지 않아요. 음악 녹음을 이용해주세요.');
    try {
      this.canvas = this.createCanvas(); this.canvas.width = 540; this.canvas.height = 960;
      if (!this.canvas.captureStream) throw new Error('이 브라우저는 시각화 녹화를 지원하지 않아요.');
      this.source = source; this.getContent = getContent;
      drawVideoFrame(this.canvas, source, getContent());
      this.videoStream = this.canvas.captureStream(15);
      if (!this.videoStream.getVideoTracks().length) throw new Error('영상 트랙을 만들지 못했어요.');
      this.destination = context.createMediaStreamDestination();
      this.connect(output);
      const stream = new this.Stream([...this.videoStream.getVideoTracks(), ...this.destination.stream.getAudioTracks()]);
      this.recorder = new this.Recorder(stream, { mimeType, videoBitsPerSecond: 1500000, audioBitsPerSecond: 128000 });
      const chunks = []; let bytes = 0; let failed = false;
      const recorder = this.recorder;
      recorder.ondataavailable = ({ data }) => {
        if (data.size) { chunks.push(data); bytes += data.size; }
        if (bytes >= 16 * 1024 * 1024) this.stop();
      };
      recorder.onerror = () => { failed = true; this.stop(); this.cleanup(); this.onStatus('영상 저장에 실패했어요. 음악 녹음을 이용해주세요.'); };
      recorder.onstop = () => {
        if (this.recorder !== recorder) return;
        const type = recorder.mimeType || mimeType;
        const blob = new Blob(chunks, { type });
        this.cleanup();
        if (!failed && blob.size) this.onSaved(blob, type.includes('mp4') ? 'mp4' : 'webm');
        else if (!failed) this.onStatus('저장된 영상이 없어요. 재생 후 다시 시도해주세요.');
      };
      recorder.start(1000);
      this.started = performance.now(); this.lastFrame = -Infinity; this.lastSecond = -1;
      this.limit = setTimeout(() => this.stop(), 60000);
      this.onStatus('영상 녹화 중 · 0 / 60초');
    } catch (error) { this.cleanup(); throw error; }
  }
  frame(now) {
    if (!this.active || now - this.lastFrame < 1000 / 15) return;
    this.lastFrame = now;
    try { drawVideoFrame(this.canvas, this.source, this.getContent()); }
    catch { this.stop(); return; }
    const second = Math.floor((now - this.started) / 1000);
    if (second !== this.lastSecond) { this.lastSecond = second; this.onStatus(`영상 녹화 중 · ${second} / 60초`); }
  }
  stop() {
    if (!this.active) return;
    this.recorder.stop(); clearTimeout(this.limit);
    this.onStatus('영상 저장 준비 중…');
  }
  cleanup() {
    clearTimeout(this.limit);
    try { this.output?.disconnect(this.destination); } catch { /* Only disconnect our recording branch. */ }
    this.videoStream?.getTracks().forEach((track) => track.stop());
    this.destination?.stream.getTracks().forEach((track) => track.stop());
    if (this.canvas) { this.canvas.width = 1; this.canvas.height = 1; }
    this.recorder = this.output = this.destination = this.canvas = this.videoStream = this.source = this.getContent = null;
  }
}
