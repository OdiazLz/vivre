export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function resolveAssetUrl(value?: string | null) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE_URL}/${value.replace(/^\//, '')}`;
}
