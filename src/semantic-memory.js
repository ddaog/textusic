export function constrainedDevice(device = {}) {
  return /iPhone|iPad|iPod|Android/i.test(device.userAgent ?? '')
    || (device.platform === 'MacIntel' && device.maxTouchPoints > 1)
    || (device.deviceMemory > 0 && device.deviceMemory <= 4);
}

export function semanticSessionOptions(constrained) {
  return constrained ? {
    executionMode: 'sequential',
    graphOptimizationLevel: 'basic',
    enableCpuMemArena: false,
    enableMemPattern: false,
    // Avoid retaining a second, prepacked copy of model weights on phones.
    extra: { session: { disable_prepacking: '1' } },
  } : {};
}

// FeatureExtractionPipeline does not explicitly dispose its intermediate tensors.
// Own these short-lived tensors so each inference releases them before the next.
export async function embedAndRelease(extractor, texts, meanPooling) {
  const owned = new Set();
  try {
    const inputs = extractor.tokenizer(texts, { padding:true, truncation:true, max_length:48 });
    Object.values(inputs).forEach(tensor => owned.add(tensor));
    const outputs = await extractor.model(inputs);
    Object.values(outputs).forEach(tensor => owned.add(tensor));
    const pooled = meanPooling(outputs.last_hidden_state ?? outputs.logits ?? outputs.token_embeddings, inputs.attention_mask);
    owned.add(pooled);
    const normalized = pooled.normalize(2, -1);
    owned.add(normalized);
    return normalized.tolist();
  } finally {
    for (const tensor of owned) tensor?.dispose?.();
  }
}
