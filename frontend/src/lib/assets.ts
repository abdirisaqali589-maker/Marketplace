const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const HAS_EXPLICIT_API_URL = Boolean(import.meta.env.VITE_API_URL);

function getApiOrigin() {
  try {
    return new URL(API_BASE_URL, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

export function assetUrl(value?: string | null) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.pathname.startsWith('/uploads/') && ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
        if (!HAS_EXPLICIT_API_URL) return parsed.pathname;
        return `${getApiOrigin()}${parsed.pathname}`;
      }
    } catch {
      return value;
    }
    return value;
  }
  if (value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }
  if (value.startsWith('/uploads/')) {
    if (!HAS_EXPLICIT_API_URL) return value;
    return `${getApiOrigin()}${value}`;
  }
  return value;
}

export function storedUploadPath(image: any) {
  const value = image?.path || image?.url || '';
  if (!value) return '';
  try {
    const parsed = new URL(value);
    return parsed.pathname.startsWith('/uploads/') ? parsed.pathname : value;
  } catch {
    return value;
  }
}
