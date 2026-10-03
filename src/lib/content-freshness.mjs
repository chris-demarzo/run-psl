const REVIEW_WINDOW_DAYS = 60;
const SITE_TIME_ZONE = 'America/New_York';

export function dateInSiteTimeZone(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isStale(verifiedDate, now = new Date()) {
  const today = dateInSiteTimeZone(now);
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - REVIEW_WINDOW_DAYS);
  return verifiedDate < cutoff.toISOString().slice(0, 10);
}
