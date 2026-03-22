const DEVICE_ID_STORAGE_KEY = 'ndc-device-id';

function detectOs(): string {
  if (typeof navigator === 'undefined') return 'Unknown OS';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'iOS';
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  return 'Unknown OS';
}

function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown Browser';
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  return 'Unknown Browser';
}

function detectScreenLabel(): string {
  if (typeof window === 'undefined' || !window.screen) return 'Unknown Screen';
  return `${window.screen.width}x${window.screen.height}`;
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown TZ';
  } catch {
    return 'Unknown TZ';
  }
}

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
  const os = detectOs();
  const browser = detectBrowser();
  const screen = detectScreenLabel();
  const timezone = detectTimezone();
  return `${os} | ${browser} | ${screen} | ${timezone} (${short})`;
}
