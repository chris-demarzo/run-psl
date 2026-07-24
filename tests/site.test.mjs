import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { join } from 'node:path';

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

test('production build exposes the complete Run PSL directory', async () => {
  for (const [route, heading] of expectedPages) {
    const outputPath = join(process.cwd(), 'dist', route, 'index.html');
    const html = await readFile(outputPath, 'utf8');

    assert.match(html, /<html lang="en"/);
    assert.match(html, /<main[\s>]/);
    assert.match(html, new RegExp(`<h1[^>]*>[^<]*${heading}`, 'i'));
    assert.match(html, /Last verified/i);
  }
});

test('each directory category ships with current, sourced listings', async () => {
  const categories = ['events', 'groups', 'routes', 'resources'];
  const today = new Date().toISOString().slice(0, 10);

  for (const category of categories) {
    const source = await readFile(join(process.cwd(), 'src', 'data', `${category}.json`), 'utf8');
    const entries = JSON.parse(source);

    assert.ok(entries.length > 0, `${category} must include at least one verified listing`);
    for (const entry of entries) {
      assert.match(entry.url, /^https:\/\//, `${entry.name} needs an HTTPS source`);
      assert.match(entry.verifiedDate, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(entry.verifiedDate <= today, `${entry.name} has a future verification date`);
      if (category === 'events') {
        assert.ok(entry.date >= today, `${entry.name} is already past`);
      }
    }
  }
});

test('event dates are formatted for people instead of exposing raw ISO values', async () => {
  const html = await readFile(join(process.cwd(), 'dist', 'events', 'index.html'), 'utf8');
  assert.match(html, /Jul 25, 2026/);
  assert.match(html, /Sep 12, 2026/);
  assert.doesNotMatch(html, />2026-(?:07-25|09-12)/);
  assert.match(html, /Last verified July 24, 2026/);
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
  assert.match(html, /Built from live public sources/);
  assert.doesNotMatch(html, /Verified listings are on the way/);
});
