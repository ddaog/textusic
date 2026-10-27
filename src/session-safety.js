const DRAFT_KEY = 'textusic-draft-v1';
const PREPARING_KEY = 'textusic-ai-preparing-v1';

export function interruptedSemanticPreparation(storage, now = Date.now()) {
  try {
    const started = Number(storage.getItem(PREPARING_KEY));
    return started > 0 && now >= started && now - started < 10 * 60 * 1000;
  } catch { return false; }
}

export function markSemanticPreparation(storage, preparing, now = Date.now()) {
  try {
    if (preparing) {
      if (!storage.getItem(PREPARING_KEY)) storage.setItem(PREPARING_KEY, String(now));
    } else storage.removeItem(PREPARING_KEY);
  } catch { /* Storage is optional; never interrupt music. */ }
}

export function readDraft(storage) {
  try { return (storage.getItem(DRAFT_KEY) ?? '').slice(0, 2000); } catch { return ''; }
}

export function saveDraft(storage, text) {
  try {
    if (text) storage.setItem(DRAFT_KEY, text.slice(0, 2000));
    else storage.removeItem(DRAFT_KEY);
  } catch { /* Private browsing or full storage must never interrupt typing. */ }
}

export function semanticStartupDelay(device) {
  const mobile = /iPhone|iPad|iPod|Android/i.test(device.userAgent ?? '')
    || (device.platform === 'MacIntel' && device.maxTouchPoints > 1);
  return mobile || (device.deviceMemory > 0 && device.deviceMemory <= 4) ? 5000 : 1200;
}
