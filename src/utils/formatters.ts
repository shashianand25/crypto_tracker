/**
 * Market Data Formatting Utilities
 * Engineered for tabular financial alignment and preserving source precision.
 */

export function parseSafeNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return NaN;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? NaN : num;
}

/**
 * Format price values while respecting source precision and market conventions.
 * Example: 64000.10 -> $64,000.10, 0.0000452 -> $0.0000452
 */
export function formatPrice(
  rawPrice: string | number | null | undefined,
  includeDollar = true
): string {
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') {
    return '—';
  }

  const str = String(rawPrice).trim();
  const num = parseSafeNumber(str);

  if (isNaN(num)) {
    return str;
  }

  // Preserve decimal portion from source if present
  const parts = str.split('.');
  const integerPart = parts[0] ? Number(parts[0]).toLocaleString('en-US') : '0';
  const prefix = includeDollar ? '$' : '';

  if (parts.length > 1) {
    const decimalPart = parts[1];
    return `${prefix}${integerPart}.${decimalPart}`;
  }

  // If source had no decimal but value is numeric
  return `${prefix}${integerPart}.00`;
}

/**
 * Format trading volume.
 * Example: 1.420 ETH or 1,420.50
 */
export function formatVolume(
  rawVolume: string | number | null | undefined,
  suffix?: string
): string {
  if (rawVolume === null || rawVolume === undefined || rawVolume === '') {
    return '—';
  }

  const str = String(rawVolume).trim();
  const num = parseSafeNumber(str);

  if (isNaN(num)) {
    return str;
  }

  const parts = str.split('.');
  const integerPart = parts[0] ? Number(parts[0]).toLocaleString('en-US') : '0';
  const formatted = parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;

  return suffix ? `${formatted} ${suffix}` : formatted;
}

/**
 * Format timestamps in UTC or ISO format for serious financial tooling.
 */
export function formatTimestamp(
  rawTs: string | number | null | undefined,
  mode: 'full' | 'time' | 'date' | 'timeOnlyUtc' = 'full'
): string {
  if (!rawTs) return '—';

  try {
    let date: Date;
    if (typeof rawTs === 'number') {
      // Check if second or millisecond timestamp
      date = rawTs < 1e11 ? new Date(rawTs * 1000) : new Date(rawTs);
    } else {
      date = new Date(rawTs);
    }

    if (isNaN(date.getTime())) {
      return String(rawTs);
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    const seconds = pad(date.getUTCSeconds());
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());

    if (mode === 'time' || mode === 'timeOnlyUtc') {
      return `${hours}:${minutes}:${seconds} UTC`;
    }

    if (mode === 'date') {
      return `${year}-${month}-${day}`;
    }

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  } catch {
    return String(rawTs);
  }
}

/**
 * Format relative elapsed time (e.g., '1.2s ago', '45s ago', '3m ago')
 */
export function formatRelativeTime(rawTs: string | number | null | undefined): string {
  if (!rawTs) return '—';

  try {
    let tsMillis: number;
    if (typeof rawTs === 'number') {
      tsMillis = rawTs < 1e11 ? rawTs * 1000 : rawTs;
    } else {
      tsMillis = new Date(rawTs).getTime();
    }

    if (isNaN(tsMillis)) return String(rawTs);

    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - tsMillis) / 1000));

    if (diffSec < 1) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return '—';
  }
}

/**
 * Format percentage with explicit sign and tabular spacing.
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
