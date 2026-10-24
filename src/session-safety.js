const DRAFT_KEY = 'textusic-draft-v1';

export function readDraft(storage) {
  try { return (storage.getItem(DRAFT_KEY) ?? '').slice(0, 180); } catch { return ''; }
}

export function saveDraft(storage, text) {
  try {
    if (text) storage.setItem(DRAFT_KEY, text.slice(0, 180));
    else storage.removeItem(DRAFT_KEY);
  } catch { /* Private browsing or full storage must never interrupt typing. */ }
}

export function semanticStartupDelay(device) {
  const mobile = /iPhone|iPad|iPod|Android/i.test(device.userAgent ?? '')
    || (device.platform === 'MacIntel' && device.maxTouchPoints > 1);
  return mobile || (device.deviceMemory > 0 && device.deviceMemory <= 4) ? 5000 : 1200;
}
