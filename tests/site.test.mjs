import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { join } from 'node:path';
import { dateInSiteTimeZone, isStale } from '../src/lib/content-freshness.mjs';

const expectedPages = [
  ['', 'Run PSL'],
  ['events', 'Events'],
  ['groups', 'Group Runs'],
  ['routes', 'Routes'],
  ['resources', 'Local Resources'],
  ['submit', 'Submit'],
  ['about', 'About'],
  ['privacy', 'Privacy'],
];

test('freshness uses the Port St. Lucie calendar date and a 60-day review window', () => {
  assert.equal(dateInSiteTimeZone(new Date('2026-10-04T00:30:00Z')), '2026-10-03');
  assert.equal(dateInSiteTimeZone(new Date('2026-10-04T04:00:00Z')), '2026-10-04');

  const now = new Date('2026-10-03T16:00:00Z');
  assert.equal(isStale('2026-08-05', now), false, '59 days old is current');
  assert.equal(isStale('2026-08-04', now), false, '60 days old is current');
  assert.equal(isStale('2026-08-03', now), true, '61 days old needs re-verification');
});

test('production build exposes the complete Run PSL directory with a freshness state', async () => {
  for (const [route, heading] of expectedPages) {
    const outputPath = join(process.cwd(), 'dist', route, 'index.html');
    const html = await readFile(outputPath, 'utf8');

    assert.match(html, /<html lang="en"/);
    assert.match(html, /<main[\s>]/);
    assert.match(html, new RegExp(`<h1[^>]*>[^<]*${heading}`, 'i'));
    assert.match(html, /Last verified|re-verification|currently verified|Content review/i);
  }
});

test('shared footer does not claim a stale site-wide verification date', async () => {
  const html = await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /<div class="footer-links">[\s\S]*Last verified: July 15, 2026[\s\S]*<\/div>/i);
  assert.match(html, /<div class="footer-links">[\s\S]*Content review in progress[\s\S]*<\/div>/i);
});

test('each directory category preserves sourced records with valid dates', async () => {
  const categories = ['events', 'groups', 'routes', 'resources'];
  const today = dateInSiteTimeZone();

  for (const category of categories) {
    const source = await readFile(join(process.cwd(), 'src', 'data', `${category}.json`), 'utf8');
    const entries = JSON.parse(source);

    assert.ok(entries.length > 0, `${category} must include at least one verified listing`);
    for (const entry of entries) {
      assert.match(entry.url, /^https:\/\//, `${entry.name} needs an HTTPS source`);
      assert.match(entry.verifiedDate, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(entry.verifiedDate <= today, `${entry.name} has a future verification date`);
    }
  }
});

test('past events remain in source history but never render as upcoming', async () => {
  const source = JSON.parse(await readFile(join(process.cwd(), 'src', 'data', 'events.json'), 'utf8'));
  const eventsHtml = await readFile(join(process.cwd(), 'dist', 'events', 'index.html'), 'utf8');
  const homeHtml = await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
  const today = dateInSiteTimeZone();
  const pastEvents = source.filter((event) => event.date < today);

  assert.ok(pastEvents.length > 0, 'the source history should retain past events');
  for (const event of pastEvents) {
    assert.doesNotMatch(eventsHtml, new RegExp(event.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(eventsHtml, /No upcoming events are currently verified/i);
  assert.match(homeHtml, /<b>0<\/b><div><strong>Events<\/strong>/i);
  assert.doesNotMatch(homeHtml, /six upcoming events/i);
});

test('ended limited-series groups remain in source history but not recurring output', async () => {
  const source = JSON.parse(await readFile(join(process.cwd(), 'src', 'data', 'groups.json'), 'utf8'));
  const html = await readFile(join(process.cwd(), 'dist', 'groups', 'index.html'), 'utf8');
  const endedSeries = source.find((group) => group.id === 'saucony-pub-run-august-2026');

  assert.ok(endedSeries, 'the source history should retain the ended series');
  assert.match(endedSeries.expiresDate ?? '', /^\d{4}-\d{2}-\d{2}$/);
  assert.doesNotMatch(html, /Saucony × Fleet Feet Pub Run Series/);
});

test('content older than 60 days is visibly marked for re-verification', async () => {
  const today = dateInSiteTimeZone();

  for (const category of ['groups', 'routes', 'resources']) {
    const source = JSON.parse(await readFile(join(process.cwd(), 'src', 'data', `${category}.json`), 'utf8'));
    const visible = source.filter((entry) => !entry.expiresDate || entry.expiresDate >= today);
    const stale = visible.filter((entry) => isStale(entry.verifiedDate));
    const html = await readFile(join(process.cwd(), 'dist', category, 'index.html'), 'utf8');
    const warningCount = (html.match(/Needs re-verification — last checked/g) ?? []).length;

    assert.ok(stale.length > 0, `${category} fixture must include stale content`);
    assert.equal(warningCount, stale.length, `${category} must flag every stale visible listing`);
    assert.match(html, /Details may have changed since the date shown/i);
    assert.doesNotMatch(html, /<span class="verified">Last verified July 15, 2026<\/span>/i);
  }
});

test('site chrome uses the approved 03c PSL monogram in the header, footer, and favicon', async () => {
  const html = await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
  const logo = await readFile(join(process.cwd(), 'public', 'brand', 'run-psl-logo-03c.png'));

  assert.equal((html.match(/src="\/brand\/run-psl-logo-03c\.png"/g) ?? []).length, 2);
  assert.match(html, /href="\/brand\/run-psl-logo-03c\.png" type="image\/png"/);
  assert.equal(logo.subarray(1, 4).toString('ascii'), 'PNG');
  assert.equal(logo.readUInt32BE(16), 1254);
  assert.equal(logo.readUInt32BE(20), 1254);
});

test('site-wide theme uses dark surfaces with no white UI colors', async () => {
  const css = await readFile(join(process.cwd(), 'src', 'styles', 'global.css'), 'utf8');
  const layout = await readFile(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf8');

  assert.match(css, /--paper:#080d0b/i);
  assert.match(css, /--surface:#111815/i);
  assert.match(css, /--ink:#e8eee8/i);
  assert.match(css, /--volt:#c7ff23/i);
  assert.match(css, /--logo-bg:#000000/i);
  assert.match(css, /\.site-header\{[^}]*background:var\(--logo-bg\)/i);
  assert.match(css, /\.site-footer\{[^}]*background:var\(--logo-bg\)/i);
  assert.doesNotMatch(css, /(?:color|background|border-color):(?:#fff(?:fff)?|white)\b|border:[^;}]*(?:#fff(?:fff)?|white)\b|#df4d2d|#fff1e9|#efc9b8/i);
  assert.match(layout, /<meta name="theme-color" content="#080d0b"/i);
});

test('homepage describes the populated directory rather than a coming-soon state', async () => {
  const html = await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
  assert.match(html, /Built from public sources/);
  assert.match(html, /Past events are archived automatically/);
  assert.doesNotMatch(html, /Verified listings are on the way/);
});
