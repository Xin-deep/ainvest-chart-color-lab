import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGlobalChartStyle, resolveChartStyle } from '../dist/lib/chart-style.js';

test('old and invalid sessions keep per-module appearance', () => {
  for (const value of [undefined, null, {}, {lineWidth: null, texture: 'bad'}, {lineWidth: ''}, {lineWidth: 9}, {lineWidth: true}]) {
    assert.deepEqual(normalizeGlobalChartStyle(value), {lineWidth:'inherit', texture:'inherit'});
  }
});

test('global overrides are independent and preserve module settings', () => {
  const module = Object.freeze({id:'plot', lineWidth:1.5, texture:'dots', count:4});
  assert.deepEqual(resolveChartStyle(module), module);
  assert.deepEqual(resolveChartStyle(module,{lineWidth:'6'}), {...module,lineWidth:6});
  assert.deepEqual(resolveChartStyle(module,{texture:'none'}), {...module,texture:'none'});
  assert.deepEqual(resolveChartStyle(module,{lineWidth:'auto',texture:'stripes'}), {...module,lineWidth:'auto',texture:'stripes'});
  assert.deepEqual(resolveChartStyle(module,{lineWidth:'inherit',texture:'inherit'}), module);
});

test('fractional widths and texture options round-trip', () => {
  for (const lineWidth of [.5,1,1.5,2,3,4,6,8,'auto','inherit']) {
    for (const texture of ['inherit','none','stripes','cross','dots']) {
      const value = {lineWidth,texture};
      assert.deepEqual(normalizeGlobalChartStyle(JSON.parse(JSON.stringify(value))),value);
    }
  }
});
