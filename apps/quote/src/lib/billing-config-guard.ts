export function isPositiveIntegerId(value: string | null | undefined) {
  return /^[1-9]\d*$/.test(String(value ?? '').trim());
}

export function isValidHttpsAppUrl(value: string | null | undefined) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}
