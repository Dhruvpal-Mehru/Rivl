// Pettiness level labels
export const PETTINESS_LABELS: Record<number, string> = {
  1: 'Polite Nod',
  2: 'Gentle Nudge',
  3: 'Honest Feedback',
  4: 'Constructive Criticism',
  5: 'No Mercy Review',
  6: 'Savage Takedown',
  7: 'Public Humiliation',
  8: 'Corporate Warfare',
  9: 'Scorched Earth',
  10: 'Extinction Event',
};

// Validate and normalize URLs
export function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

// Extract domain from URL
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(normalizeUrl(url));
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// Format score with color class
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-rivl-green';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-rivl-accent';
  return 'text-rivl-red';
}

// Generate a unique ID for analysis sessions
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
