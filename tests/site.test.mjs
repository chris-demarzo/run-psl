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
  assert.match(html, /Jul 18, 2026/);
  assert.doesNotMatch(html, />2026-07-18/);
});

test('homepage describes the populated directory rather than a coming-soon state', async () => {
  const html = await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
  assert.match(html, /Built from live public sources/);
  assert.doesNotMatch(html, /Verified listings are on the way/);
});
