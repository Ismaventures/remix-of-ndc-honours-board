const DEVICE_ID_STORAGE_KEY = 'ndc-device-id';

function generateDeviceId(): string {
  const hasCrypto = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
  if (hasCrypto) {
    return crypto.randomUUID();
  }
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;
    const next = generateDeviceId();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, next);
    return next;
  } catch {
    return generateDeviceId();
  }
}

export function getDefaultDeviceLabel(deviceId: string): string {
  const short = deviceId.slice(0, 8).toUpperCase();
  const platform = typeof navigator !== 'undefined' ? navigator.platform || 'Unknown Platform' : 'Unknown Platform';
  return `${platform} (${short})`;
}
