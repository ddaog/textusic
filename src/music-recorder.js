export class MusicRecorder {
  constructor(onSaved, onStatus, Recorder = globalThis.MediaRecorder) {
    Object.assign(this, { onSaved, onStatus, Recorder });
  }
  get active() { return this.recorder?.state === 'recording'; }
  connect(node) {
    if (!this.destination || this.output === node) return;
    try { this.output?.disconnect(this.destination); } catch { /* An engine reset may already disconnect it. */ }
    node.connect(this.destination); this.output = node;
  }
  start(context, output) {
    if (!this.Recorder) throw new Error('이 브라우저는 음악 저장을 지원하지 않습니다.');
    if (this.recorder) throw new Error('이전 녹음을 저장하는 중입니다.');
    this.destination = context.createMediaStreamDestination();
    const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((type) => this.Recorder.isTypeSupported(type));
    try {
      this.recorder = new this.Recorder(this.destination.stream, mimeType ? {mimeType} : {});
      this.connect(output);
      const chunks = []; let size = 0; let failed = false;
      this.recorder.ondataavailable = ({data}) => { if (data.size) { chunks.push(data); size += data.size; } if (size > 20 * 1024 * 1024) this.stop(); };
      this.recorder.onstop = () => {
        const type = this.recorder.mimeType || chunks[0]?.type || 'audio/webm';
        const blob = new Blob(chunks, {type});
        this.cleanup();
        if (failed) { this.onStatus('녹음 중 오류가 발생했습니다. 다시 시도해주세요.'); return; }
        if (blob.size) this.onSaved(blob, type.includes('mp4') ? 'm4a' : 'webm');
        else this.onStatus('녹음된 소리가 없어요. 재생 후 다시 시도해주세요.');
      };
      this.recorder.onerror = () => { failed = true; this.settleReady?.(false); this.stop(); this.onStatus('녹음 중 오류가 발생했습니다.'); };
      this.ready = new Promise((resolve) => {
        this.settleReady = resolve;
        this.readyTimer = setTimeout(() => resolve(false), 5000);
        this.recorder.onstart = () => { clearTimeout(this.readyTimer); resolve(true); };
      });
      this.recorder.start(1000);
      this.limit = setTimeout(() => this.stop(), 180000);
      this.onStatus('녹음 중 · 최대 3분');
    } catch (error) { this.cleanup(); throw error; }
  }
  stop() { this.settleReady?.(false); if (this.active) { this.recorder.stop(); this.onStatus('저장 준비 중'); } }
  cleanup() {
    this.settleReady?.(false);
    clearTimeout(this.readyTimer);
    clearTimeout(this.limit);
    try { this.output?.disconnect(this.destination); } catch { /* Already reset. */ }
    this.destination?.stream.getTracks().forEach((track) => track.stop());
    this.output = this.destination = this.recorder = null;
  }
}
