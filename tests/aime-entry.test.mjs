import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function staticGraph(file, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);
  for (const match of read('dist/' + file).matchAll(/^\s*(?:import|export)[^'"\n]*?from\s*['"](\.[^'"]+)['"]/gm)) staticGraph(normalize(join(dirname(file), match[1])), seen);
  return seen;
}
const html = read('dist/aime.html');

test('the first load excludes the heavy web and Terminal scenes', () => {
  const graph = [...staticGraph('app.js')];
  assert.ok(graph.includes('scenes/aime.js'));
  assert.deepEqual(graph.filter(file => /terminal|workspace/.test(file)), []);
  assert.match(read('dist/app.js'), /import\('\.\/scenes\/terminal\.js'\)/);
});
test('aime.html preloads exactly the first-load modules', () => {
  const preloaded = [...html.matchAll(/<link rel="modulepreload" href="\.\/([^"]+)"/g)].map(match => match[1]).sort();
  assert.deepEqual(preloaded, [...staticGraph('app.js')].sort());
});
test('aime.html can paint its skeleton before scripts and styles finish', () => {
  const [head, body] = html.split('</head>');
  assert.match(head, /<script defer src="\.\/vendor\/vis-lab\.bundle\.js">/);
  assert.doesNotMatch(head, /rel="stylesheet"/);
  assert.ok(body.indexOf('aime-boot') < body.indexOf('rel="stylesheet"'));
});
test('the offline preview inlines lazy scenes instead of importing files', () => {
  const preview = read('preview.html');
  assert.doesNotMatch(preview, /import\('\.\/scenes\//);
  assert.match(preview, /Promise\.resolve\(\{ renderTerminalScene, applyTerminalPalette, terminalChartSlots \}\)/);
});
