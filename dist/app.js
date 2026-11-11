import { LIVE_ID_PATTERN, createEditToken, readOwner, readBackupRevision, saveBackupRevision, saveOwner, readActiveOwner, saveActiveOwner, clearActiveOwner, readViewerTheme, saveViewerTheme, readViewerPalette, saveViewerPalette, readViewerScene, saveViewerScene, isQuietLiveStatus, discoverSyncBase, createLiveClient } from './lib/live-sync.js';
import { encodeMobilePreview, decodeMobilePreview } from './lib/mobile-preview.js';
import { bindColorJsPicker, loadColorJsPicker } from './lib/colorjs-picker.js';
import { comparisonTemplates, createComparisonBoard, validateComparisonBoards, comparisonTemplatePanel } from './scenes/comparison.js';
import { normalizeGlobalChartStyle, normalizeSceneCharts } from './lib/chart-style.js';
import { defaultCheckSettings, normalizeCheckSettings, buildRowsCheckReport } from './lib/palette-checks.js';
import { renderColorChecks, renderColorCheckBadges } from './scenes/color-checks.js';
import { hexToOklch, checkOklch, oklchCss } from './lib/oklch.js';
import { presets, dropRetiredBackgrounds } from './data/presets.js';
import { clone, roles, seriesRoles, validatePalette, restorePalette, restoreSavedPalettes, restorePresetEdits, restoreLockedPalettes, shareableSnapshot, mergeBackupPalettes, orderSavedPalettes, countColorChanges, writeBackDraft, moveSeriesColor, removeSeriesColor, addSeriesColor, indexAfterMove, parseImport, parseTextPalette } from './lib/palettes.js';
import { normalizeColor, hexToHsv, hsvToHex, rgbText } from './lib/colors.js';
import { renderFinancialScene, applyFinancialPalette } from './scenes/financial.js';

import { compactTypes, newCompactModule, defaultCompactBoard, validateCompactBoard, renderCompactBoard, compactBoardPanel, mountCompactBoard, destroyCompactCharts, moveCompactModule, setCompactModuleHidden } from './scenes/custom.js';

import { defaultAimeBoard, validateAimeBoard, renderAimeScene, aimeBoardPanel, applyAimePalette, aimeShownPalette } from './scenes/aime.js';

import { financialChartModules, financialModulesFor } from './data/financial-shared.js';

import { defaultFinancialBoard, validateFinancialBoard, renderFinancialExtras } from './scenes/financial-extras.js';

const VERSION = '0.27.0';
const STORAGE_KEY = 'ainvest-palette-lab:v1';
const scenes = [
  { id: 'aime', name: 'Aime 对话', en: 'Aime conversation', icon: 'chat' },
  { id: 'terminal', name: 'web', en: 'web', icon: 'chart' },
  { id: 'workspace', name: 'Terminal', en: 'Terminal workspace', icon: 'grid' },
  { id: 'financial', name: '财报分析', en: 'Financial analysis', icon: 'file' },
  { id: 'custom', name: '自由看板', en: 'Custom dashboard', icon: 'grid' }
];
const paths = {
  grip: '<path d="M6 9h12M6 15h12"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  logo: '<path d="M5 18V6h5a4 4 0 0 1 0 8H8"/><path d="M14 18h5M17 6v12"/>',
  pie: '<path d="M12 3v9h9"/><path d="M20.3 15.5A9 9 0 1 1 8.5 3.7M15 3.5a9 9 0 0 1 5.5 5.5H15z"/>',
  chart: '<path d="M4 4v16h16M7 14l4-5 4 3 5-7"/>',
  chat: '<path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-9a9 9 0 1 1 18-1z"/><path d="M7 10h8M7 14h5"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  export: '<path d="M12 15V3m-4 4 4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  save: '<path d="M5 3h12l4 4v14H3V3z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
  undo: '<path d="M8 4 3 9l5 5M3 9h10a7 7 0 0 1 7 7v3"/>',
  redo: '<path d="m16 4 5 5-5 5M21 9H11a7 7 0 0 0-7 7v3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  moon: '<path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14z"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16M18 9v6"/>',
  expand: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
  sliders: '<path d="M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 14v6h16v-6"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  arrow: '<path d="M4 12h16m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V4H4v11h4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  eyeOff: '<path d="M4 4l16 16"/><path d="M9.9 5.2A9.6 9.6 0 0 1 12 5c5.5 0 9 7 9 7a15.6 15.6 0 0 1-3 3.8M6.4 6.9A15 15 0 0 0 3 12s3.5 7 9 7a9 9 0 0 0 4.2-1"/><path d="M10 10a3 3 0 0 0 4 4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  file: '<path d="M14 3H5v18h14V8zM14 3v5h5M8 13h8M8 17h5"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let state = { baseline: clone(presets[0]), draft: clone(presets[0]), scene: 'financial', theme: 'light', role: 'categorical', selected: 0, panel: 'palette', editorOpen: false, chartStyleOpen: false, editorModel: 'oklch', collapsed: innerWidth < 650, previewFullscreen: new URLSearchParams(location.search).get('preview') === 'fullscreen', saved: [], presetEdits: {}, lockedPalettes: [], hiddenPalettes: [], pnlTrend: 'up', sceneCharts: {}, sceneSelected: null, globalChartStyle: normalizeGlobalChartStyle(), checkSettings: defaultCheckSettings(), financialBoard: defaultFinancialBoard(), financialDensity: 'compact', customTemplate:'all', comparisonBoards:{}, customBoard: defaultCompactBoard(), aimeBoard: defaultAimeBoard() };
let storageAvailable = true, loaded = false;
function restoreStoredPresetEdits(input) {
  const edits = restorePresetEdits(input, presets.map(p => p.id));
  for (const palette of Object.values(edits)) dropRetiredBackgrounds(palette);
  return edits;
}
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (stored?.schemaVersion === 1) {
    const base = validatePalette(stored.baseline), draft = validatePalette(stored.draft);
    base.id = stored.baseline.id; draft.id = stored.draft.id;
    dropRetiredBackgrounds(base); dropRetiredBackgrounds(draft);
    // Update the unmodified old 8-color Ainvest preset to the newly confirmed 7 colors.
    for (const p of [base, draft]) if (p.id === 'ainvest') {
      for (const theme of ['light', 'dark']) if (p.themes[theme].categorical.length === 8 && p.themes[theme].categorical[7].hex === '#9EA9C7') p.themes[theme].categorical.pop();
      p.source = presets[0].source;
    }
    state = { ...state, editorModel: stored.editorModel === 'hsb' ? 'hsb' : 'oklch', customTemplate: [...comparisonTemplates.map(t=>t.id),'free'].includes(stored.customTemplate)?stored.customTemplate:'all', comparisonBoards:validateComparisonBoards(stored.comparisonBoards), globalChartStyle: normalizeGlobalChartStyle(stored.globalChartStyle), checkSettings: normalizeCheckSettings(stored.checkSettings), sceneCharts: normalizeSceneCharts(stored.sceneCharts), financialBoard: validateFinancialBoard(stored.financialBoard), financialDensity: stored.financialDensity === 'standard' ? 'standard' : 'compact', customBoard: validateCompactBoard(stored.customBoard), aimeBoard: validateAimeBoard(stored.aimeBoard), baseline: base, draft, scene: scenes.some(s => s.id === stored.scene) ? stored.scene : 'financial', collapsed: typeof stored.collapsed === 'boolean' ? stored.collapsed : state.collapsed, theme: ['light', 'dark'].includes(stored.theme) ? stored.theme : 'light', saved: (stored.saved || []).slice(-30).flatMap(p => { try { const v = validatePalette(p); v.id = p.id; return [v]; } catch { return []; } }), presetEdits: restoreStoredPresetEdits(stored.presetEdits) };
    state.lockedPalettes = restoreLockedPalettes(stored.lockedPalettes, [...presets, ...state.saved].map(p => p.id));
    state.hiddenPalettes = restoreLockedPalettes(stored.hiddenPalettes, [...presets, ...state.saved].map(p => p.id));
    loaded = true;
  }
} catch { storageAvailable = false; }
if (['finary','robinhood','wealthsimple'].includes(state.draft.id)) { state.baseline = clone(presets[0]); state.draft = clone(presets[0]); }
// Unedited presets stored earlier pick up the current preset colors; edited drafts stay as they are.
function refreshUneditedPreset() {
  const preset = presets.find(p => p.id === state.draft.id);
  if (preset && !changedCount()) { state.baseline = clone(preset); state.draft = clone(preset); }
}
refreshUneditedPreset();
writeBackDraft(state, presets);
// Touch-only and phone-sized, so a narrow window on a computer can still edit.
const isPhone = matchMedia('(hover: none) and (pointer: coarse)').matches && Math.min(screen.width, screen.height) <= 650;
// aime.html stays the phone page, except that a shared link opened on a computer gets the full read-only view.
const aimeEntry = document.body.dataset.mobilePreview === 'true';
const mobileEntry = isPhone || (aimeEntry && !new URLSearchParams(location.search).has('live'));
if (aimeEntry && !mobileEntry) document.title = 'Palette Lab · 查看配色';
// The phone entry only ever shows the Aime conversation, read-only; other scenes and editing stay on the website.
const requestedScene = mobileEntry ? 'aime' : new URLSearchParams(location.search).get('scene');
if (scenes.some(s => s.id === requestedScene)) state.scene = requestedScene;
let mobileShareError = '', sharedPreviewLoaded = false, sharedPreviewHidden = [];
try {
  const shared = decodeMobilePreview(location.hash);
  if (shared) {
    const baseline = dropRetiredBackgrounds(restorePalette(shared.baseline, presets)), draft = dropRetiredBackgrounds(restorePalette(shared.draft, presets));
    const aimeBoard = validateAimeBoard(shared.aimeBoard);
    state = { ...state, baseline, draft, aimeBoard, scene: 'aime', theme: shared.theme === 'dark' ? 'dark' : 'light', globalChartStyle: normalizeGlobalChartStyle(shared.globalChartStyle) };
    sharedPreviewLoaded = true;
    sharedPreviewHidden = restoreLockedPalettes(shared.hiddenPalettes, presets.map(p => p.id));
    // A snapshot opened where it can be edited must not overwrite the local palette with the same id.
    const local = [...presets, ...state.saved].find(p => p.id === draft.id);
    if (!mobileEntry && local && countColorChanges(state.presetEdits[local.id] || local, draft)) { draft.id = crypto.randomUUID(); baseline.id = draft.id; }
  }
} catch { mobileShareError = '分享链接无效，已显示本机方案'; }
const requestedTheme = new URLSearchParams(location.search).get('theme');
if (['light', 'dark'].includes(requestedTheme)) state.theme = requestedTheme;
if (mobileEntry || (state.scene === 'aime' && innerWidth <= 650)) { state.collapsed = true; state.previewFullscreen = false; }
const isMobileAime = () => state.scene === 'aime' && (mobileEntry || innerWidth <= 650);
const isDesktopViewer = () => live.role === 'viewer' && live.ready && !mobileEntry && !isMobileAime();
// Narrow windows only have room for the phone layout, so they show Aime whatever was picked.
const viewerSceneNow = () => live.viewerScene && innerWidth > 650 ? live.viewerScene : 'aime';
const liveParams = new URLSearchParams(location.search);
const requestedLiveId = liveParams.get('live') || liveParams.get('edit');
const live = { role: requestedLiveId || mobileEntry ? 'viewer' : null, id: requestedLiveId, loading: !!requestedLiveId, ready: mobileEntry && !requestedLiveId, client: null, base: null, token: null, revision: 0, status: requestedLiveId ? '正在连接共享方案…' : '', error: '', pending: null, writing: false, lastJSON: '', timer: null, retry: null, stop: null, generation: 0, conflict: false, viewerTheme: null, viewerPalette: null, viewerScene: null, sharedPalettes: [], sharedPresetEdits: {}, sharedLocks: [], sharedHidden: [], backupState: '', backupRevision: 0, backupJSON: '', backupTimer: null, backupWriting: false, backupAgain: false };
const isLiveReadOnly = () => live.role === 'viewer' || live.loading;
if (requestedLiveId) { state.scene = 'aime'; state.collapsed = true; state.previewFullscreen = false; }
function liveSnapshot() { return shareableSnapshot({ baseline: state.baseline, draft: state.draft, saved: state.saved, presetEdits: state.presetEdits, lockedPalettes: state.lockedPalettes, aimeBoard: state.aimeBoard, financialBoard: state.financialBoard, financialDensity: state.financialDensity, customBoard: state.customBoard, customTemplate: state.customTemplate, comparisonBoards: state.comparisonBoards, theme: state.theme, globalChartStyle: state.globalChartStyle, sceneCharts: state.sceneCharts }, state.hiddenPalettes, presets); }
// Links created before layouts were shared leave them out, and that must not reset the local boards.
function snapshotLayouts(snapshot) {
  const layouts = {};
  if (snapshot.financialBoard) layouts.financialBoard = validateFinancialBoard(snapshot.financialBoard);
  if (['compact', 'standard'].includes(snapshot.financialDensity)) layouts.financialDensity = snapshot.financialDensity;
  if (snapshot.customBoard) layouts.customBoard = validateCompactBoard(snapshot.customBoard);
  if ([...comparisonTemplates.map(t => t.id), 'free'].includes(snapshot.customTemplate)) layouts.customTemplate = snapshot.customTemplate;
  if (snapshot.comparisonBoards) layouts.comparisonBoards = validateComparisonBoards(snapshot.comparisonBoards);
  if (snapshot.sceneCharts) layouts.sceneCharts = normalizeSceneCharts(snapshot.sceneCharts);
  return layouts;
}
function applyLiveSnapshot(snapshot) {
  const baseline = dropRetiredBackgrounds(restorePalette(snapshot.baseline, presets)), draft = dropRetiredBackgrounds(restorePalette(snapshot.draft, presets)), aimeBoard = validateAimeBoard(snapshot.aimeBoard);
  live.sharedPalettes = restoreSavedPalettes(snapshot.saved);
  live.sharedPresetEdits = restoreStoredPresetEdits(snapshot.presetEdits);
  live.sharedLocks = restoreLockedPalettes(snapshot.lockedPalettes, [...presets, ...live.sharedPalettes].map(p => p.id).concat(snapshot.draft?.id));
  live.sharedHidden = restoreLockedPalettes(snapshot.hiddenPalettes, presets.map(p => p.id));
  state = { ...state, ...snapshotLayouts(snapshot), baseline, draft, aimeBoard, scene: viewerSceneNow(), theme: snapshot.theme === 'dark' ? 'dark' : 'light', globalChartStyle: normalizeGlobalChartStyle(snapshot.globalChartStyle), editorOpen: false };
  refreshUneditedPreset();
}
// The owner's theme is only the default on first open; afterwards each viewer keeps their own.
function keepViewerTheme() {
  live.viewerTheme ||= readViewerTheme(localStorage) || (['light', 'dark'].includes(requestedTheme) ? requestedTheme : state.theme);
  state.theme = live.viewerTheme;
}
// Without a fixed link, phones read local colors or a static snapshot the same way.
if (mobileEntry && !requestedLiveId) { live.sharedPalettes = state.saved; live.sharedPresetEdits = state.presetEdits; live.sharedLocks = state.lockedPalettes; live.sharedHidden = sharedPreviewHidden; keepViewerTheme(); }
// Phone viewers read connection state from the dot; the bar only carries errors they can act on.
const liveBarHidden = () => live.role === 'viewer' && isMobileAime() ? !live.error : isQuietLiveStatus(live.status) && !live.error && !live.conflict;
const liveDotClass = () => !live.ready && !live.error ? 'is-pending' : isQuietLiveStatus(live.status) && !live.error ? 'is-connected' : 'is-disconnected';
const liveDot = () => `<span class="live-dot ${liveDotClass()}" role="status" aria-label="${esc(live.status)}" title="${esc(live.status)}"></span>`;
function liveStatus(message) {
  live.status = message;
  for (const el of document.querySelectorAll('.live-sync-status')) el.textContent = message;
  const bar = document.querySelector('.live-sync-bar'); if (bar) bar.hidden = liveBarHidden();
  const dot = document.querySelector('.live-dot');
  if (dot) { dot.className = `live-dot ${liveDotClass()}`; dot.title = message; dot.setAttribute('aria-label', message); }
}
function queueLiveSnapshot() {
  if (live.role !== 'owner' || !live.ready || live.conflict) return;
  const snapshot = JSON.stringify(liveSnapshot());
  if (snapshot === live.lastJSON && !live.pending) return;
  live.pending = snapshot;
  liveStatus('正在同步…'); clearTimeout(live.timer);
  live.timer = setTimeout(flushLiveSnapshot, 250);
}
async function flushLiveSnapshot() {
  if (live.writing || !live.pending || live.role !== 'owner' || live.conflict) return;
  const pending = live.pending, generation = live.generation;
  live.pending = null; live.writing = true;
  try {
    const result = await live.client.update(live.id, live.token, live.revision, JSON.parse(pending));
    if (generation !== live.generation) return;
    live.revision = result.revision; live.lastJSON = pending;
    liveStatus(live.pending ? '正在同步…' : '已同步 · 查看页面自动更新');
  } catch (error) {
    if (generation !== live.generation) return;
    live.pending ||= pending;
    if ([403, 409].includes(error.status)) { live.conflict = true; liveStatus('同步已暂停 · 请重新载入或复制方案'); toast(error.message); render(); }
    else { liveStatus('暂未同步，正在重试'); clearTimeout(live.retry); live.retry = setTimeout(() => { live.retry = null; flushLiveSnapshot(); }, 2000); }
  } finally { if (generation === live.generation) { live.writing = false; if (live.pending && !live.conflict && !live.retry) live.timer = setTimeout(flushLiveSnapshot, 250); } }
}
// The backup holds everything this browser stores plus the edit token, so the ?edit= link alone can restore both.
function queueBackup() {
  if (live.role !== 'owner' || !live.ready || !['ok', 'retrying'].includes(live.backupState)) return;
  clearTimeout(live.backupTimer);
  live.backupTimer = setTimeout(flushBackup, 1000);
}
async function flushBackup() {
  if (live.role !== 'owner' || !['ok', 'retrying'].includes(live.backupState)) return;
  if (live.backupWriting) { live.backupAgain = true; return; }
  const json = JSON.stringify({ ...storedState(), editToken: live.token }), generation = live.generation;
  if (json === live.backupJSON) return;
  live.backupWriting = true;
  try {
    const saved = await live.client.saveBackup(live.id, live.token, live.backupRevision, JSON.parse(json));
    if (generation !== live.generation) return;
    Object.assign(live, { backupRevision: saved.revision, backupJSON: json, backupState: 'ok' });
    saveBackupRevision(localStorage, live.base, live.id, saved.revision);
  } catch (error) {
    if (generation !== live.generation) return;
    if (error.status === 409) { live.backupState = 'conflict'; toast('另一个页面更新了备份，这里已暂停备份；刷新后会合并'); }
    else if (error.status === 503) live.backupState = 'off';
    else { live.backupState = 'retrying'; clearTimeout(live.backupTimer); live.backupTimer = setTimeout(flushBackup, 5000); }
  } finally {
    if (generation === live.generation) { live.backupWriting = false; if (live.backupAgain) { live.backupAgain = false; queueBackup(); } }
  }
}
function restoreFromBackup(data) {
  const merged = mergeBackupPalettes(state, { saved: restoreSavedPalettes(data.saved), presetEdits: restoreStoredPresetEdits(data.presetEdits), lockedPalettes: data.lockedPalettes, hiddenPalettes: data.hiddenPalettes }, presets.map(p => p.id));
  state = { ...state, ...merged, ...snapshotLayouts(data), baseline: dropRetiredBackgrounds(restorePalette(data.baseline, presets)), draft: dropRetiredBackgrounds(restorePalette(data.draft, presets)), aimeBoard: validateAimeBoard(data.aimeBoard), checkSettings: normalizeCheckSettings(data.checkSettings), globalChartStyle: normalizeGlobalChartStyle(data.globalChartStyle) };
  history = []; future = [];
}
const backupNote = () => ({ ok: '已备份到云端。清空本地或换电脑后，打开编辑链接就能找回，所以编辑链接不要外传。', retrying: '备份暂时失败，正在重试。', conflict: '另一个页面更新了备份，这里已暂停备份，刷新后会合并。', off: '云端备份还没开启，色板目前只存在这个浏览器里。' })[live.backupState] || '云端备份暂不可用，色板目前只存在这个浏览器里。';
function detachLive() {
  live.stop?.(); clearTimeout(live.timer); clearTimeout(live.retry); clearTimeout(live.backupTimer);
  live.generation++; Object.assign(live, { backupState: '', backupRevision: 0, backupJSON: '', backupWriting: false, backupAgain: false, role: null, id: null, ready: false, loading: false, pending: null, writing: false, stop: null, token: null, retry: null, conflict: false, error: '', viewerPalette: null, viewerScene: null, sharedPalettes: [], sharedPresetEdits: {}, sharedLocks: [], sharedHidden: [] });
}
async function connectLive({ throwOnError = false, keepLocal = false } = {}) {
  if (!live.id) return;
  const generation = ++live.generation;
  live.stop?.(); clearTimeout(live.timer); clearTimeout(live.retry); live.retry = null; live.loading = true; live.error = ''; liveStatus('正在连接共享方案…'); render();
  try {
    if (!LIVE_ID_PATTERN.test(live.id)) throw new Error('无效的共享方案链接');
    live.base = await discoverSyncBase(); live.client = createLiveClient(live.base);
    const record = await live.client.get(live.id);
    if (generation !== live.generation) return;
    const wantsEdit = !mobileEntry && new URLSearchParams(location.search).has('edit');
    let token = wantsEdit ? readOwner(localStorage, live.base, live.id) : null, backup = null, backupState = '';
    // Sharing still works when backups are off, so a failed read only leaves this browser's own copy in charge.
    if (wantsEdit) {
      try { backup = await live.client.readBackup(live.id); backupState = 'ok'; }
      catch (error) { backupState = error.status === 503 ? 'off' : 'failed'; }
      if (generation !== live.generation) return;
      if (!token && /^[a-f0-9]{64}$/.test(backup?.data?.editToken || '')) { token = backup.data.editToken; saveOwner(localStorage, live.base, live.id, token); }
    }
    // Sharing again publishes what the owner is looking at instead of restoring the stored copy.
    const publishLocal = keepLocal && !!token;
    // The link never holds a hidden palette, so its owner stays on the one they had open.
    const openHidden = token && state.hiddenPalettes.includes(state.draft.id) ? { baseline: state.baseline, draft: state.draft } : null;
    if (!publishLocal) { applyLiveSnapshot(record.snapshot); if (openHidden) Object.assign(state, openHidden); }
    let restored = false;
    if (token && backup?.data && backup.revision !== readBackupRevision(localStorage, live.base, live.id)) {
      try { restoreFromBackup(backup.data); restored = true; }
      catch { backupState = 'failed'; toast('云端备份无法读取，已保留这个浏览器的数据'); }
    }
    Object.assign(live, { backupState: token ? backupState : '', backupRevision: backup?.revision || 0, backupJSON: '', backupWriting: false, backupAgain: false });
    if (restored) saveBackupRevision(localStorage, live.base, live.id, backup.revision);
    live.role = token ? 'owner' : 'viewer'; live.token = token; live.revision = record.revision; live.ready = true; live.loading = false; live.error = ''; live.conflict = false; live.pending = null; live.writing = false;
    // A link from before layouts were shared gets them from its owner on the next open.
    const publishLayouts = !!token && !record.snapshot.financialBoard;
    live.lastJSON = publishLocal || publishLayouts || restored ? '' : JSON.stringify(liveSnapshot());
    if (token) saveActiveOwner(localStorage, live.base, live.id);
    else { keepViewerTheme(); live.viewerPalette = readViewerPalette(localStorage, live.id); live.viewerScene = mobileEntry ? null : readViewerScene(localStorage, live.id, scenes.map(s => s.id)); state.scene = viewerSceneNow(); }
    state.collapsed = live.role === 'viewer' && (mobileEntry || innerWidth <= 650);
    liveStatus(token ? '已同步 · 查看页面自动更新' : '已连接 · 只读同步'); render();
    if (publishLocal || publishLayouts) queueLiveSnapshot();
    if (restored) { persist(); toast('已从云端备份找回色板'); render(); } else if (token) queueBackup();
    if (!token) live.stop = live.client.subscribe(live.id, next => {
      if (generation !== live.generation || next.revision <= live.revision) return;
      applyLiveSnapshot(next.snapshot); keepViewerTheme(); live.revision = next.revision; liveStatus('已连接 · 只读同步'); render();
    }, liveStatus);
  } catch (error) { if (generation !== live.generation) return; live.loading = false; live.error = error.message; liveStatus(error.message); render(); if (throwOnError) throw error; }
}
async function ensureLiveOwner() {
  if (live.role === 'viewer' || live.loading) throw new Error('此方案只读，不能编辑');
  if (live.role === 'owner' && live.ready) return;
  const base = await discoverSyncBase();
  const activeId = readActiveOwner(localStorage, base);
  if (activeId) {
    live.id = activeId;
    const url = new URL(location.href); url.searchParams.delete('live'); url.searchParams.set('edit', activeId); url.hash = ''; historyReplaceLive(url);
    await connectLive({ throwOnError: true, keepLocal: true });
    if (live.role !== 'owner') throw new Error('原固定链接的编辑权限不可用');
    return;
  }
  const client = createLiveClient(base), token = createEditToken();
  // Ensure write capability can be retained before creating a server-side record.
  const probe = 'ainvest-live-storage-test'; localStorage.setItem(probe, '1'); localStorage.removeItem(probe);
  const record = await client.create(liveSnapshot(), token);
  saveOwner(localStorage, base, record.id, token);
  saveActiveOwner(localStorage, base, record.id);
  Object.assign(live, { role: 'owner', id: record.id, client, base, token, revision: record.revision, ready: true, lastJSON: JSON.stringify(liveSnapshot()) });
  const url = new URL(location.href); url.searchParams.delete('live'); url.searchParams.set('edit', record.id); url.hash = ''; historyReplaceLive(url);
  Object.assign(live, { backupState: 'ok', backupRevision: 0, backupJSON: '' }); queueBackup();
  liveStatus('已同步 · 查看页面自动更新'); render();
}
function historyReplaceLive(url) { window.history.replaceState(null, '', url); }
function liveViewerURL() { const url = new URL('aime.html', location.href); url.searchParams.set('live', live.id); return url.href; }

function activeCustomBoard(){
  if(state.customTemplate==='free')return state.customBoard;
  return state.comparisonBoards[state.customTemplate]||=(createComparisonBoard(state.customTemplate));
}
const activeModuleBoard = () => state.scene === 'financial' ? state.financialBoard : state.scene === 'aime' ? state.aimeBoard : activeCustomBoard();
let compactColorFrame;
function financialDensityPanel(){
  return `<section class="panel-section"><div class="section-heading"><span class="section-label">预览模块密度</span><button class="text-button" data-action="module-picker">＋ 添加模块</button></div><div class="segment compact-columns" aria-label="财报模块密度">${[['compact','高密度'],['standard','低密度']].map(([value,label])=>`<button data-action="financial-density" data-value="${value}" class="${state.financialDensity===value?'active':''}" aria-pressed="${state.financialDensity===value}">${label}</button>`).join('')}</div></section>${state.financialBoard.modules.length?compactBoardPanel(state.financialBoard,{title:'新增组件设置',layout:true,density:false,add:false}):''}`;
}
function repaintFinancialCharts(){
  const canvas=document.querySelector('#preview-canvas');
  mountCompactBoard(canvas,{modules:[...financialModulesFor(state.financialDensity),...state.financialBoard.modules],density:state.financialDensity,platform:'pc',globalChartStyle:state.globalChartStyle},current(),state.theme,(index,id,role='categorical')=>{if(isLiveReadOnly())return;if(state.financialBoard.modules.some(m=>m.id===id))state.financialBoard.selected=id;state.editorOpen=true;state.role=role;state.selected=index;state.panel='palette';state.collapsed=false;if(state.previewFullscreen)setPreviewFullscreen(false);else render();});
}
// web and Terminal lay Vis Lab charts over their cards at the page's own size, scaled with the page.
let sceneChartObserver;
function repaintSceneCharts() {
  const canvas = document.querySelector('#preview-canvas'), layer = canvas?.querySelector('.scene-chart-layer');
  const module = lazyScenes[state.scene]?.module, slots = module?.terminalChartSlots?.() || module?.workspaceChartSlots?.();
  if (!layer || !slots) return;
  const viewBoxWidth = layer.closest('main')?.querySelector('svg')?.viewBox.baseVal.width || 1;
  const fit = () => layer.style.setProperty('--scene-scale', layer.clientWidth / viewBoxWidth);
  fit();
  sceneChartObserver?.disconnect();
  sceneChartObserver = new ResizeObserver(fit);
  sceneChartObserver.observe(layer);
  const modules = slots.map(slot => { const value = { ...slot, ...state.sceneCharts[slot.id], height: slot.rect[3] }, { count, series } = sceneChartRanges(slot); value.count = Math.min(count.max, Math.max(count.min, value.count)); if (series) value.series = Math.min(series.max, Math.max(series.min, value.series)); return value; });
  markSceneSelection();
  mountCompactBoard(canvas, { modules, density: 'compact', platform: 'pc', globalChartStyle: state.globalChartStyle }, current(), state.theme, (index, id, role = 'categorical') => { if (isLiveReadOnly()) return; state.editorOpen = true; state.role = role; state.selected = index; state.panel = 'palette'; state.collapsed = false; if (state.previewFullscreen) setPreviewFullscreen(false); else render(); });
}
const sceneSlots = () => { const module = lazyScenes[state.scene]?.module; return module?.terminalChartSlots?.() || module?.workspaceChartSlots?.() || []; };
function markSceneSelection() { for (const slot of document.querySelectorAll('.scene-chart-slot')) slot.classList.toggle('is-selected', !isLiveReadOnly() && slot.dataset.chartId === state.sceneSelected); }
// Clicking a chart selects it for the settings panel without redrawing the page, so a double click still reaches the chart.
function selectSceneChart(id) {
  if (isLiveReadOnly() || !sceneSlots().some(slot => slot.id === id)) return;
  const shellChanged = state.collapsed || state.previewFullscreen || state.panel !== 'palette';
  state.sceneSelected = id; state.panel = 'palette'; state.collapsed = false;
  if (shellChanged) { state.previewFullscreen = false; render(); return; }
  markSceneSelection();
  const side = document.querySelector('.side-scroll'); side.innerHTML = moduleSettingsPanel() + palettePanel(); side.scrollTop = 0; bindInputs();
}
// Data count and series follow the component's own limits; long lines keep their original point count as the top.
function sceneChartRanges(slot) {
  const def = compactTypes.find(type => type.id === slot.type);
  return { count: { min: Math.max(2, def.range.min), max: Math.max(def.range.max, slot.count) }, series: def.seriesRange ? { min: def.seriesRange.min, max: def.seriesRange.max } : null };
}
function sceneChartPanel() {
  const slot = sceneSlots().find(item => item.id === state.sceneSelected);
  if (!slot) return '<section class="panel-section compact-settings"><div class="section-heading"><span class="section-label">图表设置</span></div><p class="editor-footnote">点击页面里的图表，可以调整它的数据标签、线条和纹理；双击图形改颜色。</p></section>';
  const def = compactTypes.find(type => type.id === slot.type), m = { labels: 'off', zoom: 'off', ...slot, ...state.sceneCharts[slot.id] }, ranges = sceneChartRanges(slot);
  const hasLine = def.chart === 'radar' || /^(line|combo)/.test(def.id), hasTexture = ['cartesian', 'pie', 'radar', 'hbar', 'waterfall'].includes(def.chart) && !['line', 'line-negative', 'line-multi'].includes(def.id);
  const select = (field, label, options, value) => `<label>${label}<select data-scene-field="${field}" aria-label="${label}">${options.map(([v, n]) => `<option value="${v}" ${String(value) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
  return `<section class="panel-section compact-settings"><div class="section-heading"><span class="section-label">图表设置</span>${state.sceneCharts[slot.id] ? '<button class="text-button" data-action="scene-chart-reset">恢复默认</button>' : ''}</div><div class="compact-settings-title">${esc(slot.name)}<span>${esc(def.name)}</span></div><label>数据项数<input data-scene-field="count" type="number" min="${ranges.count.min}" max="${ranges.count.max}" value="${Math.min(ranges.count.max, Math.max(ranges.count.min, m.count))}"></label>${ranges.series ? `<label>系列数量<input data-scene-field="series" type="number" min="${ranges.series.min}" max="${ranges.series.max}" value="${Math.min(ranges.series.max, Math.max(ranges.series.min, m.series))}"></label>` : ''}${def.chart === 'cartesian' ? select('zoom', 'DataZoom 缩放条', [['off', '关'], ['on', '开']], m.zoom) : ''}${def.labels ? select('labels', '数据标签', [['auto', '默认规则'], ['on', '显示'], ['off', '隐藏']], m.labels) : ''}${hasLine && def.area ? select('area', '主线面积', [['on', '开'], ['off', '关']], m.area === 'on' ? 'on' : 'off') : ''}${hasLine ? select('lineWidth', '线条粗细', ['auto', .5, 1, 1.5, 2, 3].map(v => [v, v === 'auto' ? '默认' : v + ' px']), m.lineWidth ?? 'auto') : ''}${hasTexture ? select('texture', '填充纹理', [['none', '无纹理'], ['stripes', '斜线'], ['cross', '交叉线'], ['dots', '圆点']], m.texture || 'none') : ''}<p class="editor-footnote">数量改变后，图表按同样的规律补齐或截短数据；卡片里的表格和标题不变。</p></section>`;
}
function repaintCompactBoard() {
  const board=activeModuleBoard();
  mountCompactBoard(document.querySelector('#preview-canvas'), {...board,globalChartStyle:state.globalChartStyle}, current(), state.theme, (index, id, role = 'categorical') => { if (isLiveReadOnly()) return; board.selected = id; state.editorOpen = true; state.role = role; state.selected = index; state.panel = 'palette'; state.collapsed = false; if (state.previewFullscreen) setPreviewFullscreen(false); else render(); });
  if(state.scene==='aime')applyAimePalette(document.querySelector('#preview-canvas'),current(),state.theme);
}
let history = [], future = [], pendingImport = null, importedIndex = 0, editorTransaction = null, toastTimer, deletedScheme = null;
const app = document.querySelector('#app'), modal = document.querySelector('#modal');
// These scenes carry large reference data, so they load when opened instead of with every page.
const lazyScenes = {
  terminal: { load: () => import('./scenes/terminal.js'), module: null, pending: null, failed: false },
  workspace: { load: () => import('./scenes/workspace-terminal.js'), module: null, pending: null, failed: false }
};
function loadLazyScene(id) {
  const scene = lazyScenes[id];
  if (!scene || scene.module || scene.pending || scene.failed) return;
  scene.pending = scene.load().then(module => { scene.module = module; }).catch(() => { scene.failed = true; }).finally(() => { scene.pending = null; if (state.scene === id) render(); });
}
const lazySceneHolder = id => `<div class="scene-loading">${lazyScenes[id].failed ? `<p>场景加载失败，请检查网络</p><button class="button" data-action="scene-retry" data-value="${id}">重试</button>` : '<p>正在加载场景…</p>'}</div>`;
const sharedPalette = () => state.draft;
const viewerOptions = () => [...presets.filter(p => !live.sharedHidden.includes(p.id)).map(p => live.sharedPresetEdits[p.id] || p), ...live.sharedPalettes];
// The tab that shows the owner's live colors, using the same rule as the workbench tabs.
const ownerTabId = () => viewerOptions().some(p => p.id === state.draft.id) ? state.draft.id : 'current';
function viewerPick() {
  if (live.role !== 'viewer' || !live.viewerPalette || live.viewerPalette === ownerTabId()) return null;
  return viewerOptions().find(p => p.id === live.viewerPalette) || null;
}
const current = () => viewerPick() || sharedPalette();
// The console lists the colors the open scene really shows; edits still go to the palette itself.
const shownPalette = (palette = current()) => state.scene === 'aime' ? aimeShownPalette(palette, state.theme) : palette;
const selectedColor = () => state.draft.themes[state.theme][state.role][state.selected];
const storedState = () => ({ schemaVersion: 1, toolVersion: VERSION, baseline: state.baseline, draft: state.draft, scene: state.scene, theme: state.theme, editorModel: state.editorModel, collapsed: state.collapsed, saved: state.saved, presetEdits: state.presetEdits, lockedPalettes: state.lockedPalettes, hiddenPalettes: state.hiddenPalettes, customTemplate:state.customTemplate, comparisonBoards:state.comparisonBoards, customBoard: state.customBoard, aimeBoard: state.aimeBoard, financialDensity: state.financialDensity, financialBoard: state.financialBoard, checkSettings: state.checkSettings, globalChartStyle: state.globalChartStyle, sceneCharts: state.sceneCharts });
function persist() {
  if (isLiveReadOnly()) return;
  writeBackDraft(state, presets);
  queueLiveSnapshot();
  queueBackup();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState())); storageAvailable = true; }
  catch { storageAvailable = false; }
}
function toast(message) {
  const el = document.querySelector('#toast'); el.textContent = message; el.classList.remove('actionable'); el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3000);
}
// A locked palette keeps its colors, name and place in the list; saving a copy is the way to change it.
function isPaletteLocked(id = state.draft.id) { return state.lockedPalettes.includes(id); }
function togglePaletteLock(id) {
  const locked = isPaletteLocked(id);
  state.lockedPalettes = locked ? state.lockedPalettes.filter(v => v !== id) : [...state.lockedPalettes, id];
  if (!locked && id === state.draft.id) state.editorOpen = false;
  persist(); render();
  toast(locked ? '已解锁，可以修改' : '已锁定，不会被修改；再次右键可解锁');
}
function isPaletteHidden(id) { return state.hiddenPalettes.includes(id); }
function togglePaletteHidden(id) {
  const hidden = isPaletteHidden(id);
  if (!hidden && [...presets, ...state.saved].every(p => p.id === id || isPaletteHidden(p.id))) { toast('至少要留一个色板给查看者'); return; }
  state.hiddenPalettes = hidden ? state.hiddenPalettes.filter(v => v !== id) : [...state.hiddenPalettes, id];
  persist(); render();
  toast(hidden ? '已取消隐藏，分享页可以看到' : '已隐藏，分享页看不到这个色板');
}
function openRenameModal(id) {
  const palette = state.saved.find(p => p.id === id); if (!palette) return;
  openModal(`${modalHead('重命名色板')}<label for="rename-name">色板名称</label><input id="rename-name" class="modal-input" maxlength="80" value="${esc(palette.name)}" autocomplete="off"><div class="inline-error" id="rename-error" role="alert"></div><div class="modal-actions"><button class="button" data-modal-action="close">取消</button><button class="button primary" data-modal-action="rename-palette" data-value="${esc(palette.id)}">保存名称</button></div>`);
  const field = document.querySelector('#rename-name'); field.focus(); field.select();
  field.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); modal.querySelector('[data-modal-action="rename-palette"]').click(); } });
}
let paletteMenu = null;
function closePaletteMenu() {
  if (!paletteMenu) return;
  paletteMenu.remove(); paletteMenu = null;
  removeEventListener('pointerdown', onPaletteMenuOutside, true); removeEventListener('scroll', closePaletteMenu, true); removeEventListener('resize', closePaletteMenu); removeEventListener('blur', closePaletteMenu);
}
const onPaletteMenuOutside = event => { if (!paletteMenu?.contains(event.target)) closePaletteMenu(); };
// Saved schemes can also be renamed and deleted; a tab outside the list can only be locked, since a hide would not survive a reload.
function openPaletteMenu(id, listed, x, y, tab) {
  closePaletteMenu();
  const locked = isPaletteLocked(id), own = state.saved.some(p => p.id === id), item = (name, label, iconName, disabled = false) => `<button role="menuitem" data-menu="${name}" ${disabled ? 'disabled title="已锁定，请先解锁"' : ''}>${icon(iconName)}<span>${label}</span></button>`;
  paletteMenu = document.createElement('div');
  paletteMenu.className = 'palette-menu'; paletteMenu.setAttribute('role', 'menu'); paletteMenu.setAttribute('aria-label', '色板操作');
  paletteMenu.innerHTML = item('lock', locked ? '解锁' : '锁定', 'lock') + (listed ? item('hide', isPaletteHidden(id) ? '在分享页显示' : '在分享页隐藏', 'eyeOff') : '') + (own ? '<div class="palette-menu-line" role="separator"></div>' + item('rename', '重命名', 'pencil', locked) + item('delete', '删除', 'trash', locked) : '');
  document.body.append(paletteMenu);
  const box = paletteMenu.getBoundingClientRect();
  paletteMenu.style.left = Math.max(8, Math.min(x, innerWidth - box.width - 8)) + 'px';
  paletteMenu.style.top = Math.max(8, Math.min(y, innerHeight - box.height - 8)) + 'px';
  paletteMenu.addEventListener('click', event => {
    const choice = event.target.closest('[data-menu]')?.dataset.menu; if (!choice) return;
    closePaletteMenu();
    if (choice === 'lock') togglePaletteLock(id);
    if (choice === 'hide') togglePaletteHidden(id);
    if (choice === 'rename') openRenameModal(id);
    if (choice === 'delete') deletePalette(id);
  });
  paletteMenu.addEventListener('keydown', event => {
    const items = [...paletteMenu.querySelectorAll('button:not(:disabled)')], at = items.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); closePaletteMenu(); tab.focus?.({ preventScroll: true }); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
  });
  paletteMenu.querySelector('button:not(:disabled)').focus({ preventScroll: true });
  addEventListener('pointerdown', onPaletteMenuOutside, true); addEventListener('scroll', closePaletteMenu, true); addEventListener('resize', closePaletteMenu); addEventListener('blur', closePaletteMenu);
}
function deletePalette(id) {
  if(isPaletteLocked(id)){toast('已锁定的方案不能删除，请先右键解锁');return;}
  const index=state.saved.findIndex(p=>p.id===id);if(index<0)return;
  const active=state.draft.id===id;
  deletedScheme={palette:clone(state.saved[index]),index,snapshot:active?{baseline:clone(state.baseline),draft:clone(state.draft),role:state.role,selected:state.selected,editorOpen:state.editorOpen,history:history.map(clone),future:future.map(clone)}:null};
  state.saved.splice(index,1);
  if(active){state.baseline=clone(presets[0]);state.draft=clone(state.presetEdits[presets[0].id]||presets[0]);state.role='categorical';state.selected=0;state.editorOpen=false;history=[];future=[];}
  persist();render();toast('已删除方案');
  const notice=document.querySelector('#toast'),undo=document.createElement('button');undo.textContent='撤销删除';undo.className='toast-undo';undo.addEventListener('click',undoDeletePalette);notice.append(undo);notice.classList.add('actionable');clearTimeout(toastTimer);toastTimer=setTimeout(()=>notice.classList.remove('visible'),8000);
}
function undoDeletePalette(){
  if(!deletedScheme)return;
  const removed=deletedScheme;deletedScheme=null;
  if(!state.saved.some(p=>p.id===removed.palette.id))state.saved.splice(Math.min(removed.index,state.saved.length),0,removed.palette);
  if(removed.snapshot&&state.draft.id===presets[0].id&&!changedCount()){
    const {history:oldHistory,future:oldFuture,...paletteState}=removed.snapshot;Object.assign(state,paletteState);history=oldHistory;future=oldFuture;
  }
  persist();render();toast('已恢复方案');
}
function remember(snapshot = state.draft) { history.push(clone(snapshot)); if (history.length > 60) history.shift(); future = []; }
function changedCount() { return countColorChanges(state.baseline, state.draft); }
// History and the baseline hold colors only; the open palette keeps its own id and name.
const onOpenPalette = snapshot => ({ ...clone(snapshot), id: state.draft.id, name: state.draft.name });
function restoreOriginal() {
  if (isPaletteLocked()) return;
  remember(); const preset = presets.some(p => p.id === state.draft.id);
  state.draft = onOpenPalette(state.baseline);
  toast(preset ? '已恢复原始色板，可撤销此操作' : '已恢复到打开时的颜色，可撤销此操作');
}
function globalChartStylePanel(){
  const style=state.globalChartStyle;
  return `<details class="panel-section compact-settings chart-style-panel" ${state.chartStyleOpen?'open':''}><summary><span class="section-label">全局图表样式</span>${style.lineWidth!=='inherit'||style.texture!=='inherit'?'<span class="chart-style-active">已设置</span>':''}</summary><label>线条粗细<select data-global-chart-style="lineWidth" aria-label="全局线条粗细">${[['inherit','按模块设置'],['auto','统一默认'],...[.5,1,1.5,2,3].map(v=>[v,v+' px'])].map(([value,label])=>`<option value="${value}" ${style.lineWidth===value?'selected':''}>${label}</option>`).join('')}</select></label><label>面积纹理<select data-global-chart-style="texture" aria-label="全局面积纹理">${[['inherit','按模块设置'],['none','无纹理'],['stripes','斜线'],['cross','交叉线'],['dots','圆点']].map(([value,label])=>`<option value="${value}" ${style.texture===value?'selected':''}>${label}</option>`).join('')}</select></label><p class="editor-footnote">所有预览界面同步生效；全局设置优先于模块设置。</p></details>`;
}
function moduleSettingsPanel(){return globalChartStylePanel()+(['terminal','workspace'].includes(state.scene)?sceneChartPanel():state.scene==='custom'?comparisonTemplatePanel(state.customTemplate)+compactBoardPanel(activeCustomBoard()):state.scene==='aime'?aimeBoardPanel(state.aimeBoard):financialDensityPanel());}
function selectPreviewModule(id){
  if (isLiveReadOnly()) return;
  const board=activeModuleBoard();if(!board.modules.some(module=>module.id===id))return;
  if(board.selected===id&&state.panel==='palette'&&!state.editorOpen&&!state.collapsed)return;
  const shellChanged=state.collapsed||state.previewFullscreen||state.panel!=='palette';
  board.selected=id;state.panel='palette';state.editorOpen=false;state.collapsed=false;
  if(shellChanged){state.previewFullscreen=false;persist();render();return;}
  // Update only the selection and sidebar. Keep live chart nodes, legend state and scroll position.
  for(const card of document.querySelectorAll('[data-module-id]')){
    const selected=card.dataset.moduleId===id;card.classList.toggle('is-selected',selected);
    for(const button of card.querySelectorAll('[data-action="module-select"][aria-pressed]'))button.setAttribute('aria-pressed',String(selected));
  }
  document.querySelector('.sidebar>.color-editor')?.remove();
  const side=document.querySelector('.side-scroll');side.innerHTML=moduleSettingsPanel()+palettePanel();side.scrollTop=0;
  bindInputs();persist();
}
function render() {
  cancelAnimationFrame(compactColorFrame);
  loadLazyScene(state.scene);
  const scroll = document.querySelector('.side-scroll')?.scrollTop || 0;
  const paletteTabsScroll = document.querySelector('.palette-tabs')?.scrollTop || 0;
  const viewerRowScroll = [...document.querySelectorAll('.aime-viewer-palettes')].map(row => row.scrollLeft);
  const oldCanvas = document.querySelector('#preview-canvas');
  const oldSceneScroller = oldCanvas?.querySelector('.financial-content-frame, .terminal-content-frame, .workspace-terminal-scroll, .compact-board-scroll, .aime-content-scroll') || oldCanvas;
  const canvasScroll = { top: oldCanvas?.dataset.scene===state.scene ? oldSceneScroller?.scrollTop || 0 : 0, left: oldSceneScroller?.scrollLeft || 0, sceneHeight: oldSceneScroller?.scrollHeight || 0 };
  const oldCustomFrame = oldCanvas?.dataset.scene===state.scene ? oldCanvas?.querySelector('.compact-board-scroll, .aime-content-scroll') : null;
  const visibleCard = oldCustomFrame && [...oldCustomFrame.querySelectorAll('[data-module-id]')].find(card => card.getBoundingClientRect().bottom > oldCustomFrame.getBoundingClientRect().top);
  const customAnchor = visibleCard && { id: visibleCard.dataset.moduleId, offset: visibleCard.getBoundingClientRect().top - oldCustomFrame.getBoundingClientRect().top };
  destroyCompactCharts();
  const scene = scenes.find(s => s.id === state.scene), palette = current(), mobileAime = isMobileAime(), readOnly = isLiveReadOnly();
  app.innerHTML = `<main class="app-shell two-pane ${mobileAime ? 'aime-mobile' : ''} ${readOnly ? 'live-viewer' : ''} ${isDesktopViewer() ? 'desktop-viewer' : ''} ${readOnly && !live.ready ? 'live-unavailable' : ''} ${state.collapsed ? 'panel-collapsed' : ''} ${state.previewFullscreen ? 'preview-fullscreen' : ''}">
    ${state.previewFullscreen ? `<button class="button fullscreen-exit" data-action="exit-fullscreen" aria-label="退出全屏预览">${icon('close')}退出全屏 <kbd>Esc</kbd></button>` : ''}
    ${state.collapsed && !state.previewFullscreen && !mobileAime ? `<button class="icon-button workbench-launcher" data-action="${readOnly ? 'viewer-collapse' : 'collapse'}" aria-label="${readOnly ? '展开工具栏' : '展开颜色工作台'}" title="${readOnly ? '展开工具栏' : '展开颜色工作台'}" aria-expanded="false">${icon('panel')}</button>` : ''}
    ${mobileAime && !readOnly ? `<nav class="aime-preview-controls" aria-label="手机预览工具"><span>Aime 预览</span><button data-action="share-mobile">分享</button><button data-action="collapse" aria-expanded="${!state.collapsed}" aria-controls="color-workbench">调色</button></nav>` : ''}
    ${live.role ? `<div class="live-sync-bar" ${liveBarHidden()?'hidden':''}><span class="live-sync-status" role="status">${esc(live.status)}</span>${live.error||live.conflict?'<button data-action="live-reload">重新载入</button>':''}${live.role==='owner'?'<button data-action="live-copy">复制为新方案</button>':''}</div>` : ''}
    <div class="workspace">
      ${readOnly && !live.ready ? `<div class="live-viewer-notice"><p>${esc(live.error || '正在载入共享方案…')}</p>${live.error?'<button class="button" data-action="live-reload">重试</button>':''}</div>` : ''}
      ${mobileAime && !state.collapsed ? '<button class="aime-workbench-backdrop" data-action="collapse" aria-label="关闭颜色工作台"></button>' : ''}
      <section class="preview-workspace" aria-label="场景预览工作区">
        <div class="preview-canvas ${['financial','custom','aime','terminal','workspace'].includes(state.scene) ? 'has-scene' : ''}" id="preview-canvas" role="region" aria-label="${scene.name}${['financial','custom','aime','terminal','workspace'].includes(state.scene) ? '，图表预览' : '，内容待添加'}" style="--canvas-bg:${palette.themes[state.theme].surface[0].hex}" data-scene="${state.scene}" data-theme="${state.theme}">${state.scene === 'financial' ? renderFinancialScene(renderFinancialExtras(state.financialBoard)) : state.scene === 'custom' ? renderCompactBoard(activeCustomBoard(),state.customTemplate==='free'?{}:{title:comparisonTemplates.find(t=>t.id===state.customTemplate).name,description:`全部 ${compactTypes.length} 种图表 · 每种少量 / 大量数据对比`}) : state.scene === 'aime' ? renderAimeScene(state.aimeBoard,state.theme,{themeSwitch:mobileAime?{disabled:readOnly&&!live.ready,status:readOnly&&live.id?liveDot():'',palettes:readOnly&&live.ready?viewerPaletteBar():''}:null}) : state.scene === 'terminal' ? (lazyScenes.terminal.module?.renderTerminalScene() ?? lazySceneHolder('terminal')) : state.scene === 'workspace' ? (lazyScenes.workspace.module?.renderWorkspaceTerminal({pnlTrend:state.pnlTrend}) ?? lazySceneHolder('workspace')) : ''}</div>
      </section>
      ${isDesktopViewer() ? viewerToolbar() : `<aside class="sidebar" id="color-workbench" aria-label="颜色操作面板" ${readOnly?'inert':''}>
        <div class="sidebar-header">
          <div class="sidebar-title"><div class="workbench-heading"><span>颜色工作台</span><small>Palette Lab <span class="mono">v${VERSION}</span></small></div><div class="workbench-history"><button class="icon-button" data-action="undo" title="撤销（⌘/Ctrl Z）" aria-label="撤销" ${!history.length || isPaletteLocked() ? 'disabled' : ''}>${icon('undo')}</button><button class="icon-button" data-action="redo" title="重做（⌘/Ctrl Shift Z）" aria-label="重做" ${!future.length || isPaletteLocked() ? 'disabled' : ''}>${icon('redo')}</button><button class="icon-button" data-action="collapse" title="收起颜色工作台" aria-label="收起颜色工作台" aria-expanded="true">${icon('panel')}</button></div></div>
          ${mobileEntry ? '' : `<nav class="workbench-scenes" aria-label="产品使用场景">${scenes.map(s => `<button class="scene-tab ${s.id === state.scene ? 'active' : ''}" data-action="scene" data-value="${s.id}" aria-current="${s.id === state.scene ? 'page' : 'false'}">${s.name}</button>`).join('')}</nav>`}
          <div class="workbench-controls">${themeSegment()}</div>
          <div class="workbench-actions"><button class="button primary" data-action="save" aria-label="另存为新方案">${icon('save')}另存为</button></div>
          <button class="button mobile-share-button" data-action="share-mobile">分享预览</button>
          ${paletteTabs()}
          <div class="sidebar-tabs" role="tablist" aria-label="颜色操作"><button role="tab" aria-selected="${state.panel === 'palette'}" class="${state.panel === 'palette' ? 'active' : ''}" data-action="panel" data-value="palette">${icon('sliders')}编辑色板</button><button role="tab" aria-selected="${state.panel === 'import'}" class="${state.panel === 'import' ? 'active' : ''}" data-action="panel" data-value="import">${icon('upload')}导入颜色</button><button role="tab" aria-selected="${state.panel === 'check'}" class="${state.panel === 'check' ? 'active' : ''}" data-action="panel" data-value="check">色值检验</button></div>
        </div>
        <div class="side-scroll">${state.panel === 'palette' ? moduleSettingsPanel() + palettePanel() : state.panel === 'check' ? renderColorChecks(shownPalette(),state.theme,state.role,state.checkSettings) : importPanel()}</div>
        <div class="sidebar-footer"><span id="save-status">${state.panel === 'import' ? (live.role==='owner'?'应用导入后将同步至共享方案':'本地解析 · 文件内容不会上传') : storageAvailable ? `已自动保存 · ${changedCount()} 处颜色修改` : '浏览器存储不可用，请导出保存'}</span></div>
      </aside>`}
    </div>
  </main>`;
  document.querySelector('.side-scroll').scrollTop = scroll;
  const tabStrip = document.querySelector('.palette-tabs'), activeTab = tabStrip.querySelector('[aria-selected="true"]')?.closest('.palette-tab-item');
  tabStrip.scrollTop = paletteTabsScroll;
  document.querySelectorAll('.aime-viewer-palettes').forEach((row, i) => {
    row.scrollLeft = viewerRowScroll[i] || 0;
    const chip = row.querySelector('.active');
    if (chip) {
      const end = chip.offsetLeft + chip.offsetWidth - row.clientWidth;
      if (row.scrollLeft > chip.offsetLeft) row.scrollLeft = chip.offsetLeft;
      else if (row.scrollLeft < end) row.scrollLeft = end;
    }
  });
  if (activeTab && (activeTab.offsetTop < tabStrip.scrollTop || activeTab.offsetTop + activeTab.offsetHeight > tabStrip.scrollTop + tabStrip.clientHeight)) tabStrip.scrollTop = activeTab.offsetTop - 3;
  const editor = document.querySelector(".color-editor");
  if (editor) document.querySelector(".sidebar-footer").before(editor);
  const canvas = document.querySelector('#preview-canvas');
  if (state.scene === 'financial') { applyFinancialPalette(canvas, palette, state.theme); repaintFinancialCharts(); }
  if (state.scene === 'terminal') lazyScenes.terminal.module?.applyTerminalPalette(canvas,palette,state.theme,state.globalChartStyle);
  if (state.scene === 'workspace') lazyScenes.workspace.module?.applyWorkspacePalette(canvas,palette,state.theme,state.globalChartStyle);
  if (state.scene === 'terminal' || state.scene === 'workspace') repaintSceneCharts();
  // Charts stay hidden until a shared link connects, so skip drawing them twice.
  if (['custom','aime'].includes(state.scene) && !(isLiveReadOnly() && !live.ready)) repaintCompactBoard();
  const sceneScroller = canvas.querySelector('.financial-content-frame, .terminal-content-frame, .workspace-terminal-scroll, .compact-board-scroll, .aime-content-scroll') || canvas;
  const newSceneHeight = sceneScroller.scrollHeight;
  if (['custom','aime'].includes(state.scene)) {
    sceneScroller.scrollTop = canvasScroll.top;
    const anchor = customAnchor && [...sceneScroller.querySelectorAll('[data-module-id]')].find(card => card.dataset.moduleId === customAnchor.id);
    if (anchor) sceneScroller.scrollTop += anchor.getBoundingClientRect().top - sceneScroller.getBoundingClientRect().top - customAnchor.offset;
  } else sceneScroller.scrollTop = canvasScroll.sceneHeight && newSceneHeight ? canvasScroll.top * newSceneHeight / canvasScroll.sceneHeight : canvasScroll.top;
  sceneScroller.scrollLeft = canvasScroll.left;
  bindInputs();
}
const paletteLabel = p => p.id === 'ainvest' ? '原始' : presets.find(v => v.id === p.id)?.name || p.name;
const viewerLockMark = p => live.sharedLocks.includes(p.id === 'current' ? state.draft.id : p.id) ? `<span class="palette-tab-lock" aria-label="已锁定">${icon('lock')}</span>` : '';
function viewerChoices() {
  const options = viewerOptions(), ownerTab = ownerTabId(), selected = viewerPick()?.id || ownerTab;
  if (ownerTab === 'current') options.push({ ...sharedPalette(), id: 'current', name: paletteLabel(state.draft) });
  return { options, selected };
}
const themeSegment = () => `<div class="segment" aria-label="预览主题"><button data-action="theme" data-value="light" class="${state.theme === 'light' ? 'active' : ''}" aria-pressed="${state.theme === 'light'}">${icon('sun')}浅色</button><button data-action="theme" data-value="dark" class="${state.theme === 'dark' ? 'active' : ''}" aria-pressed="${state.theme === 'dark'}">${icon('moon')}深色</button></div>`;
// Computers get the choices a phone has plus the scenes; nothing here edits or saves the shared plan.
function viewerToolbar() {
  const { options, selected } = viewerChoices();
  return `<aside class="sidebar viewer-toolbar" id="color-workbench" aria-label="查看工具"><div class="sidebar-header"><div class="sidebar-title"><div class="workbench-heading"><span>查看配色</span><small>只读，你的选择不会影响原方案</small></div><div class="workbench-history"><button class="icon-button" data-action="viewer-collapse" title="收起工具栏" aria-label="收起工具栏" aria-expanded="true">${icon('panel')}</button></div></div><nav class="workbench-scenes" aria-label="产品使用场景">${scenes.map(s => `<button class="scene-tab ${s.id === state.scene ? 'active' : ''}" data-action="viewer-scene" data-value="${s.id}" aria-current="${s.id === state.scene ? 'page' : 'false'}">${s.name}</button>`).join('')}</nav><div class="workbench-controls">${themeSegment()}</div></div><div class="side-scroll"><div class="palette-tab-heading"><span>色板方案</span></div><div class="palette-tabs" role="tablist" aria-label="色板方案">${paletteGroups(options, p => `<div class="palette-tab-item"><button role="tab" data-action="viewer-palette" data-value="${esc(p.id)}" aria-selected="${p.id === selected}" tabindex="${p.id === selected ? 0 : -1}" class="palette-tab ${p.id === selected ? 'active' : ''}" title="${esc(p.name)}">${viewerLockMark(p)}<span>${esc(p.id === 'current' ? p.name : paletteLabel(p))}</span></button></div>`)}</div></div><div class="sidebar-footer"><span class="live-sync-status">${esc(live.status)}</span></div></aside>`;
}
// Presets on the first row, the user's own schemes on a second one when there are any.
function viewerPaletteBar() {
  const { options, selected } = viewerChoices();
  const chip = p => `<button data-action="viewer-palette" data-value="${esc(p.id)}" aria-pressed="${p.id === selected}" class="${p.id === selected ? 'active' : ''}">${viewerLockMark(p)}${esc(p.id === 'current' ? p.name : paletteLabel(p))}</button>`;
  const row = (list, label) => list.length ? `<div class="aime-viewer-palettes" role="group" aria-label="${label}">${list.map(chip).join('')}</div>` : '';
  return row(options.filter(isPresetOption), '切换默认色板') + row(options.filter(p => !isPresetOption(p)), '切换修改的色板');
}
const editedMark = '<em class="palette-tab-edited">已修改</em>';
const isPresetOption = p => presets.some(v => v.id === p.id);
// Presets first; everything below the line is a scheme of the user's own.
const paletteGroups = (options, item) => { const items = options.map(item), first = options.filter(isPresetOption).length; if (first && options.length > first) items.splice(first, 0, '<div class="palette-divider" role="separator"></div>'); return items.join(''); };
function paletteTabs() {
  const options = [...presets, ...state.saved].map(p => p.id === state.draft.id ? state.draft : state.presetEdits[p.id] || p);
  const known = options.some(p => p.id === state.draft.id);
  if (!known) options.push({...state.draft, id:'current', name:paletteLabel(state.draft)});
  const selected = known ? state.draft.id : 'current';
  return `<div class="palette-tab-heading"><span>色板方案</span><div class="palette-heading-actions">${state.saved.some(p=>p.id===state.draft.id)&&!isPaletteLocked()?`<button class="text-button" data-action="rename-palette" aria-label="重命名当前色板">重命名</button>`:''}<button class="text-button" data-action="panel" data-value="import">＋ 导入</button></div></div><div class="palette-tabs" role="tablist" aria-label="色板方案">${paletteGroups(options,p=>`<div class="palette-tab-item ${state.saved.some(v=>v.id===p.id)?'can-delete':''}"><button role="tab" data-action="palette-tab" data-value="${esc(p.id)}" aria-selected="${p.id===selected}" tabindex="${p.id===selected?0:-1}" class="palette-tab ${p.id===selected?'active':''} ${isPaletteHidden(p.id)?'is-hidden':''}" title="${esc(p.name)}${isPaletteLocked(p.id)?'（已锁定）':''}${isPaletteHidden(p.id)?'（分享页已隐藏）':''}">${isPaletteHidden(p.id)?`<span class="palette-tab-lock" aria-label="分享页已隐藏">${icon('eyeOff')}</span>`:''}${isPaletteLocked(p.id)?`<span class="palette-tab-lock" aria-label="已锁定">${icon('lock')}</span>`:''}<span>${esc(p.id==='current'?p.name:paletteLabel(p))}</span>${state.presetEdits[p.id]?editedMark:''}</button></div>`)}</div>`;
}
function compactOklch(hex){
  const value=hexToOklch(hex);
  return `<span>L${(value.l*100).toFixed(1)}% C${value.c.toFixed(3).replace(/^0/,'')} h${value.h===null?'—':value.h.toFixed(1)}</span>`;
}
function oklchDetails(hex){
  const value=hexToOklch(hex),check=checkOklch(value);
  return `<div class="oklch-heading"><span>OKLCH 换算</span><span class="oklch-pass">${check.valid?'数值有效':'数值无效'}</span></div><div class="oklch-components"><span>L 明度<strong>${(value.l*100).toFixed(2)}%</strong></span><span>C 彩度<strong>${value.c.toFixed(5)}</strong></span><span>h 色相<strong>${value.h===null?'无彩色':value.h.toFixed(2)+'°'}</strong></span></div><div class="oklch-css"><code>${oklchCss(value)}</code><button class="icon-button" data-action="copy-oklch" aria-label="复制 OKLCH 色值">${icon('copy')}</button></div><p class="oklch-note">OKLCH 判断数值有效性；ΔE 和对比度按「色值检验」设置判断。<a href="https://www.w3.org/TR/css-color-4/#ok-lab" target="_blank" rel="noopener noreferrer">计算依据</a></p>`;
}
// Rise, neutral and fall are one list in the console, though neutral is stored as its own role.
const listRole = role => role === 'neutral' ? 'semantic' : role;
const colorRowKey = (role, i) => role === 'neutral' ? `neutral-${i}` : i;
// Rows shown in the console list, as [role, index]; the badges are checked among these rows.
const listRows = p => listRole(state.role) === 'semantic' ? [['semantic', 0], ['neutral', 0], ['semantic', 1]] : p.themes[state.theme][state.role].map((_, i) => [state.role, i]);
const listCheckReport = p => buildRowsCheckReport(p, state.theme, listRows(p), state.checkSettings);
const listRowIndex = (rows, role, i) => rows.findIndex(([r, j]) => r === role && j === i);
function palettePanel() {
  const p = shownPalette(), colors = p.themes[state.theme][state.role], rows = listRows(p), report = listCheckReport(p);
  state.selected = Math.min(state.selected, colors.length - 1);
  const color = colors[state.selected], base = shownPalette(state.baseline).themes[state.theme][state.role][state.selected], hsv = hexToHsv(color.hex), locked = isPaletteLocked(), editable = seriesRoles.includes(state.role) && !locked, hsb = state.editorModel === 'hsb';
  return `<section class="panel-section"><div class="section-heading"><span class="section-label">Palette / 当前色板</span><button class="text-button" data-action="reset" ${!changedCount() || locked ? 'disabled' : ''}>恢复原始</button></div><div class="active-palette-name">${esc(p.name)}</div>${locked ? `<div class="palette-lock-note">${icon('lock')}已锁定，不会被修改。右键色板标签可解锁，或用「另存为」复制一份再改</div>` : ''}<div class="preset-source">${esc(p.source)}</div>${!p.availableThemes.includes(state.theme) ? '<div class="theme-warning">当前主题为实验复用色值，未经竞品来源确认。</div>' : ''}</section>
    <section class="panel-section"><div class="section-heading"><span class="section-label">Colors / 颜色角色</span><span class="mono muted" style="font-size:9px">${state.theme === 'light' ? 'LIGHT' : 'DARK'}</span></div><div class="role-tabs" aria-label="颜色角色">${Object.entries(roles).filter(([id]) => id !== 'neutral').map(([id, name]) => `<button class="${listRole(state.role) === id ? 'active' : ''}" data-action="role" data-value="${id}" aria-pressed="${listRole(state.role) === id}">${name}<small>${p.themes[state.theme][id].length + (id === 'semantic' ? 1 : 0)}</small></button>`).join('')}</div><div class="color-list">${rows.map(([role, i], row) => { const c = p.themes[state.theme][role][i], key = colorRowKey(role, i), open = state.editorOpen && state.role === role && state.selected === i; return `<div class="color-item">${editable && colors.length > 1 ? `<button class="color-drag" data-color-drag="${i}" aria-label="调整「${esc(c.name)}」的顺序，可拖动或按上下方向键" title="拖动调整顺序">${icon('grip')}</button>` : ''}<button class="color-row ${open ? 'selected' : ''}" data-action="color" data-value="${i}" data-role="${role}" aria-label="${esc(c.name)} ${c.hex}" aria-pressed="${open}" aria-expanded="${open}"><span class="color-index mono">${String(i + 1).padStart(2, '0')}</span><i class="swatch" style="background:${c.hex}" data-swatch="${key}"></i><span class="color-description"><span class="color-main"><span class="color-name">${esc(c.name)}</span><span class="color-value mono" data-color-value="${key}">${c.hex}</span></span><span class="color-oklch mono" data-oklch="${key}">${compactOklch(c.hex)}</span><span class="color-check-badges" data-color-checks="${row}">${renderColorCheckBadges(report.entries[row],report)}</span></span>${c.hex !== state.baseline.themes[state.theme][role][i]?.hex ? '<i class="changed-dot"></i>' : ''}${open ? icon('sliders') : ''}</button>${editable && colors.length > 1 ? `<button class="color-remove" data-action="color-remove" data-value="${i}" aria-label="删除「${esc(c.name)}」" title="删除颜色">${icon('close')}</button>` : ''}</div>`; }).join('')}</div>${editable && colors.length < 64 ? '<button class="text-button color-add" data-action="color-add">＋ 添加颜色</button>' : ''}<div class="colors-note">${icon('info')}${state.role === 'line' ? '只用于折柱图里的折线，柱子用分类色；顺序和增删同时作用于浅色、深色' : state.role === 'categorical' ? '顺序和增删同时作用于浅色、深色；色值分主题修改' : state.role === 'heatmap' ? '用于 web 的 Stock Heatmap，涨跌各三档加一档平盘；数量和顺序固定' : '仅修改当前角色，其他用途保持独立'}</div></section>
    ${state.editorOpen ? `<section class="panel-section color-editor"><div class="editor-heading"><span class="editor-name"><span>编辑</span>${esc(color.name)}</span><div class="editor-tools"><div class="segment editor-model" aria-label="调色模式">${[['oklch', 'OKLCH'], ['hsb', 'HSB']].map(([id, name]) => `<button data-action="editor-model" data-value="${id}" class="${state.editorModel === id ? 'active' : ''}" aria-pressed="${state.editorModel === id}">${name}</button>`).join('')}</div>${editable && colors.length > 1 ? `<button class="icon-button" data-action="color-remove" data-value="${state.selected}" aria-label="删除此颜色" title="删除此颜色">${icon('trash')}</button>` : ''}<button class="icon-button" data-action="editor-close" aria-label="收起颜色编辑器">${icon('close')}</button></div></div><div class="color-inputs"><label class="picker-wrap" style="background:${color.hex}" title="打开颜色选择器"><input type="color" id="native-color" value="${color.hex}" aria-label="${esc(color.name)}颜色选择器" ${locked ? 'disabled' : ''}></label><label class="hex-field"><span>HEX</span><input class="mono" id="hex-input" value="${color.hex}" maxlength="64" aria-label="色值，支持 HEX、RGB、HSL" spellcheck="false" ${locked ? 'disabled' : ''}></label><button class="icon-button" data-action="copy-color" title="复制色值" aria-label="复制色值">${icon('copy')}</button></div><div class="colorjs-picker-shell" ${hsb ? '' : 'data-colorjs-picker'}>${hsb ? '' : `<color-picker space="oklch" color="${color.hex}" gamut="none" aria-label="OKLCH 颜色选择器"><span slot="color-space" class="picker-space-name">OKLCH</span></color-picker>`}<div class="hsb-fallback">${['H 色相', 'S 饱和', 'B 亮度'].map((label, i) => `<div class="slider-row"><label for="slider-${i}" title="${label}">${label[0]}</label><input id="slider-${i}" data-hsv="${i}" type="range" min="0" max="${i === 0 ? 359 : 100}" step="1" value="${Math.round(hsv[i])}" aria-label="${label}" ${locked ? 'disabled' : ''} style="background:${i === 0 ? 'linear-gradient(to right,#ff7777,#dddd55,#55cc88,#55cddd,#7777ee,#dd77dd,#ff7777)' : i === 1 ? `linear-gradient(to right,#ddd,${hsvToHex(hsv[0], 100, 100)})` : `linear-gradient(to right,#222,${hsvToHex(hsv[0], hsv[1], 100)})`}"><span class="hsv-number mono"><input id="output-${i}" data-hsv-number="${i}" type="number" min="0" max="${i === 0 ? 359 : 100}" step="1" value="${Math.round(hsv[i])}" aria-label="${label}数值" ${locked ? 'disabled' : ''}><span aria-hidden="true">${i === 0 ? '°' : '%'}</span></span></div>`).join('')}</div>${hsb ? '' : '<p class="picker-status" data-picker-status role="status">正在加载 Color.js 选色器…</p>'}</div><div class="oklch-readout" id="oklch-readout">${oklchDetails(color.hex)}<div class="color-check-badges" data-editor-checks>${renderColorCheckBadges(report.entries[listRowIndex(rows, state.role, state.selected)],report)}</div></div><div class="mini-diff"><i style="background:${base?.hex || '#FFFFFF'}"></i><span class="mono">${base?.hex || '新增'}</span>${icon('arrow')}<i id="after-swatch" style="background:${color.hex}"></i><span id="after-hex" class="mono">${color.hex}</span></div><div class="editor-footnote">修改应用于${state.theme === 'light' ? '浅色' : '深色'}主题的「${roles[state.role]}」。<br>RGB <span class="mono" id="rgb-value">${rgbText(color.hex)}</span></div></section>` : ''}`;
}
let importText = '', importError = '', importInputMode = 'text', importLightText = '', importDarkText = '', importName = '';
function importPanel() {
  const textMode = importInputMode === 'text';
  return `<section class="panel-section"><div class="section-heading"><span class="section-label">Import / 导入颜色</span></div><label class="import-name-label" for="import-name">色板名称</label><input id="import-name" class="import-name-input" maxlength="80" value="${esc(importName)}" placeholder="例如：测试版1029（留空自动命名）" autocomplete="off"><div class="segment import-modes" aria-label="颜色导入方式"><button data-action="import-mode" data-value="text" class="${textMode?'active':''}" aria-pressed="${textMode}">色值文本</button><button data-action="import-mode" data-value="code" class="${!textMode?'active':''}" aria-pressed="${!textMode}">JSON / 配置</button></div>${textMode?`<p class="import-intro">直接输入色值，用空格、逗号或换行分隔。支持 HEX、RGB、HSL。</p><div class="import-label"><label for="import-light">浅色色值</label><button class="text-button" data-action="example">填入示例</button></div><textarea id="import-light" class="code-area color-text-area" spellcheck="false" placeholder="#265FFC #38D1FF #F564B9">${esc(importLightText)}</textarea><div class="import-label"><label for="import-dark">深色色值（留空则与浅色相同）</label></div><textarea id="import-dark" class="code-area color-text-area" spellcheck="false" placeholder="可选：输入深色主题的色值">${esc(importDarkText)}</textarea>`:`<p class="import-intro">上传 JSON，或粘贴颜色数组、CSS 变量与色值。</p><label class="drop-zone" id="drop-zone">${icon('upload')}<strong>点击选择，或拖入 JSON 文件</strong><small>.json · 最大 500 KB</small><input type="file" id="file-input" accept=".json,application/json" hidden></label><div class="import-label"><span>粘贴色值 / 配置代码</span><button class="text-button" data-action="example">填入示例</button></div><textarea id="import-code" class="code-area" aria-label="粘贴色板配置" spellcheck="false" placeholder='["#265FFC", "#38D1FF"]'>${esc(importText)}</textarea>`}<button class="button primary import-action" data-action="parse">${icon('check')}解析颜色</button>${importError?`<div class="inline-error" role="alert">${esc(importError)}</div>`:''}${pendingImport?importPreview():''}<div class="editor-footnote">导入前会预览解析结果。<br>已有的修改会自动保留为草稿。</div></section>`;
}

function importPreview() {
  if (pendingImport.session) return `<div class="import-preview"><div class="import-preview-title">已识别完整实验文件</div><div style="font-size:11px;color:#999">恢复基线、候选色板、场景与主题。</div><button class="button accent import-action" data-action="apply-import">恢复此实验</button></div>`;
  const p = pendingImport.candidates[importedIndex], colors = p.themes[state.theme].categorical;
  return `<div class="import-preview"><div class="import-preview-title">已识别 ${pendingImport.candidates.length > 1 ? `${pendingImport.candidates.length} 组色板，请选择` : `${colors.length} 个分类色`}</div>${pendingImport.candidates.length > 1 ? `<div class="select-wrap"><select id="import-group" aria-label="选择导入颜色组">${pendingImport.candidates.map((c, i) => `<option value="${i}" ${i === importedIndex ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>${icon('chevron')}</div>` : `<div class="import-preview-name" style="font-size:11px;color:#89899b">${esc(importName.trim()||p.name)}</div>`}<div class="import-swatches">${colors.map(c => `<i style="background:${c.hex}" title="${c.hex}"></i>`).join('')}</div><button class="button accent import-action" data-action="apply-import">应用此色板</button></div>`;
}
let nativePreviewFullscreen = false;
async function setPreviewFullscreen(enabled) {
  state.previewFullscreen = enabled;
  if (!enabled) {
    const url = new URL(location.href);
    if (url.searchParams.get('preview') === 'fullscreen') { url.searchParams.delete('preview'); window.history.replaceState(null, '', url); }
    nativePreviewFullscreen = false;
  }
  render();
  if (enabled && document.documentElement.requestFullscreen) {
    try { await document.documentElement.requestFullscreen(); nativePreviewFullscreen = Boolean(document.fullscreenElement); }
    catch { /* The in-window fullscreen layout remains available when native fullscreen is unavailable. */ }
  } else if (!enabled && document.fullscreenElement && document.exitFullscreen) {
    try { await document.exitFullscreen(); } catch { /* The normal workbench is already restored. */ }
  }
}
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && nativePreviewFullscreen) { nativePreviewFullscreen = false; state.previewFullscreen = false; render(); }
});
// A draft outside the lists (imported session, live copy) would be lost on switching, so it joins the schemes.
function adoptDraft() {
  if ([...presets, ...state.saved].some(p => p.id === state.draft.id)) return;
  state.saved.push({ ...clone(state.draft), id: state.draft.id === 'imported' ? crypto.randomUUID() : state.draft.id });
  state.saved = state.saved.slice(-30);
}
function applyPalette(p) {
  writeBackDraft(state, presets); adoptDraft(); state.editorOpen = false; state.draft = clone(state.presetEdits[p.id] || p); state.baseline = clone(p); state.role = 'categorical'; state.selected = 0; history = []; future = []; persist(); render();
}
function setColor(value, record = true, repaint = true) {
  if (isLiveReadOnly() || isPaletteLocked()) return;
  const hex = normalizeColor(value);
  if (hex === selectedColor().hex || hex === shownPalette().themes[state.theme][state.role][state.selected].hex) return;
  if (record) remember(); selectedColor().hex = hex; persist(); if (repaint) render(); else liveColor(hex);
}
function liveColor(hex) {
  const i = state.selected;
  const key = colorRowKey(state.role, i);
  document.querySelector(`[data-swatch="${key}"]`).style.background = hex;
  document.querySelector(`[data-color-value="${key}"]`).textContent = hex;
  document.querySelector('#hex-input').value = hex;
  document.querySelector('#native-color').value = hex;
  document.querySelector('#after-swatch').style.background = hex;
  document.querySelector('#after-hex').textContent = hex;
  document.querySelector('#rgb-value').textContent = rgbText(hex);
  document.querySelector(`[data-oklch="${key}"]`).innerHTML = compactOklch(hex);
  const p = shownPalette(), report = listCheckReport(p), row = listRowIndex(listRows(p), state.role, i);
  document.querySelector('#oklch-readout').innerHTML = oklchDetails(hex)+`<div class="color-check-badges" data-editor-checks>${renderColorCheckBadges(report.entries[row],report)}</div>`;
  // A changed color can become another color's closest neighbor; recalculate every badge.
  for(const badges of document.querySelectorAll('[data-color-checks]'))badges.innerHTML=renderColorCheckBadges(report.entries[Number(badges.dataset.colorChecks)],report);
  // The picker keeps its DOM during a drag, so the edited mark updates without a render.
  const tab = document.querySelector('.palette-tab.active');
  if (tab) {
    const mark = tab.querySelector('.palette-tab-edited');
    if (state.presetEdits[state.draft.id] && !mark) tab.insertAdjacentHTML('beforeend', editedMark);
    else if (!state.presetEdits[state.draft.id]) mark?.remove();
  }
  if (state.role === 'surface' && i === 0) document.querySelector('#preview-canvas').style.setProperty('--canvas-bg', hex);
  if (state.scene === 'financial') { applyFinancialPalette(document.querySelector('#preview-canvas'), current(), state.theme); cancelAnimationFrame(compactColorFrame);compactColorFrame=requestAnimationFrame(repaintFinancialCharts); }
  if (state.scene === 'terminal') lazyScenes.terminal.module?.applyTerminalPalette(document.querySelector('#preview-canvas'),current(),state.theme,state.globalChartStyle);
  if (state.scene === 'workspace') lazyScenes.workspace.module?.applyWorkspacePalette(document.querySelector('#preview-canvas'),current(),state.theme,state.globalChartStyle);
  if (state.scene === 'terminal' || state.scene === 'workspace') { cancelAnimationFrame(compactColorFrame); compactColorFrame = requestAnimationFrame(repaintSceneCharts); }
  if (['custom','aime'].includes(state.scene)) { cancelAnimationFrame(compactColorFrame); compactColorFrame = requestAnimationFrame(repaintCompactBoard); }
}
function bindInputs() {
  if (isLiveReadOnly()) return;
  const pickerShell=document.querySelector('[data-colorjs-picker]');
  let pickerRecorded=false;
  if(pickerShell)bindColorJsPicker(pickerShell,{
    hex:shownPalette().themes[state.theme][state.role][state.selected].hex,readonly:isPaletteLocked(),
    onBegin:()=>{editorTransaction=clone(state.draft);pickerRecorded=false;},
    onInput:hex=>{
      if(hex!==selectedColor().hex&&!pickerRecorded){remember(editorTransaction);pickerRecorded=true;}
      setColor(hex,false,false);
      document.querySelector('#save-status').textContent=`已自动保存 · ${changedCount()} 处颜色修改`;
      document.querySelector('[data-action="undo"]').disabled=!history.length;
      document.querySelector('[data-action="redo"]').disabled=!future.length;
    },
    onCommit:()=>{
      editorTransaction=null;
      document.querySelector('[data-action="undo"]').disabled=!history.length;
      document.querySelector('[data-action="redo"]').disabled=!future.length;
    },
    onError:()=>toast('选色值暂不可用，请继续调整或使用 HEX 输入')
  });
  document.querySelector('[data-comparison-template]')?.addEventListener('change',event=>{
    const id=event.target.value;if(![...comparisonTemplates.map(t=>t.id),'free'].includes(id))return;
    state.customTemplate=id;state.editorOpen=false;
    // Switching templates starts at its heading; changing module settings still preserves position.
    document.querySelector('#preview-canvas').dataset.scene='';persist();render();
  });
  document.querySelector('[data-module-position]')?.addEventListener('change',event=>{
    const board=activeModuleBoard();moveCompactModule(board,board.selected,Number(event.target.value));persist();render();
    document.querySelector(`[data-module-id="${board.selected}"]`)?.scrollIntoView({block:'nearest'});
  });
  for(const input of document.querySelectorAll('[data-global-chart-style]'))input.addEventListener('change',()=>{
    state.globalChartStyle=normalizeGlobalChartStyle({...state.globalChartStyle,[input.dataset.globalChartStyle]:input.value});
    persist();render();
  });
  for(const input of document.querySelectorAll('[data-check-field]'))input.addEventListener('change',()=>{
    const field=input.dataset.checkField;
    if(field==='role')state.role=Object.hasOwn(roles,input.value)?input.value:'categorical';
    else state.checkSettings=normalizeCheckSettings({...state.checkSettings,[field]:field==='opacity'?Number(input.value)/100:input.value});
    persist();const side=document.querySelector('.side-scroll'),scroll=side.scrollTop;side.innerHTML=renderColorChecks(shownPalette(),state.theme,state.role,state.checkSettings);side.scrollTop=scroll;bindInputs();
  });
  document.querySelector('#import-name')?.addEventListener('input',e=>{importName=e.target.value;const preview=document.querySelector('.import-preview-name');if(preview&&pendingImport?.candidates?.[importedIndex])preview.textContent=importName.trim()||pendingImport.candidates[importedIndex].name;});
  for (const input of document.querySelectorAll('[data-scene-field]')) input.addEventListener('change', () => {
    const id = state.sceneSelected; if (!id) return;
    const field = input.dataset.sceneField, value = input.type === 'number' ? Math.min(Number(input.max), Math.max(Number(input.min), Math.round(Number(input.value) || Number(input.min)))) : input.value;
    state.sceneCharts = normalizeSceneCharts({ ...state.sceneCharts, [id]: { ...state.sceneCharts[id], [field]: value } });
    persist(); render();
  });
  for (const input of document.querySelectorAll('[data-module-field]')) input.addEventListener('change', () => {
    const module = activeModuleBoard().modules.find(m => m.id === activeModuleBoard().selected);
    const field = input.dataset.moduleField;
    if(field==='count')module.fixtureCustomized=true;
    if(field==='lineWidth')module.lineWidth=input.value==='auto'?'auto':Math.max(.5,Math.min(8,Number(input.value)));
    else module[field] = field==='height'&&input.value==='auto'?'auto':['count','series','height'].includes(field) ? Math.max(Number(input.min)||1, Math.min(Number(input.max)||400, Math.round(Number(input.value)||1))) : input.value;
    persist(); render();
  });
  document.querySelector('#hex-input')?.addEventListener('change', e => { try { setColor(e.target.value); } catch (error) { e.target.setAttribute('aria-invalid', 'true'); toast(error.message); } });
  document.querySelector('#hex-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
  for (const id of ['import-light','import-dark']) document.querySelector('#'+id)?.addEventListener('input',e=>{if(id==='import-light')importLightText=e.target.value;else importDarkText=e.target.value;pendingImport=null;importError='';document.querySelector('.import-preview')?.remove();document.querySelector('.inline-error')?.remove();});
  document.querySelector('#import-code')?.addEventListener('input', e => { importText = e.target.value; pendingImport = null; importError = ''; document.querySelector('.import-preview')?.remove(); document.querySelector('.inline-error')?.remove(); });
  document.querySelector('#import-group')?.addEventListener('change', e => { importedIndex = Number(e.target.value); render(); });
  document.querySelector('#file-input')?.addEventListener('change', e => readFile(e.target.files[0]));
  const zone = document.querySelector('#drop-zone');
  zone?.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragging'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone?.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragging'); readFile(e.dataTransfer.files[0]); });
  const colorInput = document.querySelector('#native-color');
  const sliders = [...document.querySelectorAll('[data-hsv]')];
  for (const numberInput of document.querySelectorAll('[data-hsv-number]')) {
    const index = Number(numberInput.dataset.hsvNumber);
    let numberEdited = false;
    const applyNumber = (commit = false) => {
      if (!numberEdited) return;
      const parsed = numberInput.value.trim() === '' ? NaN : Number(numberInput.value);
      if (!Number.isFinite(parsed)) { if (commit) numberInput.value = sliders[index].value; return; }
      const value = Math.round(Math.min(Number(numberInput.max), Math.max(0, parsed)));
      if (!commit && (parsed < 0 || parsed > Number(numberInput.max))) return;
      if (!editorTransaction) editorTransaction = clone(state.draft);
      sliders[index].value = value;
      if (commit) numberInput.value = value;
      setColor(hsvToHex(...sliders.map(slider => Number(slider.value))), false, false);
    };
    numberInput.addEventListener('focus', () => { numberEdited = false; editorTransaction = clone(state.draft); });
    numberInput.addEventListener('input', () => { numberEdited = true; applyNumber(); });
    numberInput.addEventListener('change', () => { numberEdited = true; applyNumber(true); });
    numberInput.addEventListener('keydown', event => { if (event.key === 'Enter') numberInput.blur(); });
    numberInput.addEventListener('blur', () => {
      applyNumber(true);
      if (editorTransaction && JSON.stringify(editorTransaction.themes) !== JSON.stringify(state.draft.themes)) remember(editorTransaction);
      editorTransaction = null;
      render();
    });
  }
  for (const input of [colorInput, ...sliders].filter(Boolean)) {
    input.addEventListener('focus', () => { editorTransaction = clone(state.draft); });
    input.addEventListener('pointerdown', () => { editorTransaction = clone(state.draft); });
    input.addEventListener('input', () => {
      if (!editorTransaction) editorTransaction = clone(state.draft);
      let hex;
      if (input === colorInput) {
        hex = input.value; const values = hexToHsv(hex); sliders.forEach((s, i) => { s.value = Math.round(values[i]); document.querySelector(`#output-${i}`).value = Math.round(values[i]); });
      } else {
        const values = sliders.map(s => Number(s.value)); hex = hsvToHex(...values); sliders.forEach((s, i) => { document.querySelector(`#output-${i}`).value = values[i]; });
      }
      setColor(hex, false, false);
    });
    input.addEventListener('change', () => {
      if (editorTransaction && JSON.stringify(editorTransaction.themes) !== JSON.stringify(state.draft.themes)) remember(editorTransaction);
      editorTransaction = null; render();
    });
  }
}
async function readFile(file) {
  if (!file) return;
  try {
    if (!file.name.toLowerCase().endsWith('.json')) throw new Error('请选择 JSON 文件');
    if (file.size > 500000) throw new Error('文件大小不能超过 500 KB');
    importText = await file.text(); importInputMode = 'code'; pendingImport = parseImport(importText); importedIndex = 0; importError = '';
  } catch (error) { pendingImport = null; importError = error.message; }
  render();
}
function openModal(html) { modal.innerHTML = html; modal.showModal(); }
function modalHead(title) { return `<div class="modal-heading"><h2 id="modal-title">${title}</h2><button class="icon-button" data-modal-action="close" aria-label="关闭">${icon('close')}</button></div>`; }
function download(value, name) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function commitColorMove(from, to) {
  if (isPaletteLocked()) return false;
  if (from === to || to < 0 || to >= state.draft.themes[state.theme][state.role].length) return false;
  remember(); moveSeriesColor(state.draft, from, to, state.role);
  state.selected = indexAfterMove(state.selected, from, to);
  persist(); render();
  return true;
}
// Reorders with flex `order` during the drag, so the pressed element stays in the DOM until drop.
function startColorDrag(handle, event) {
  const from = Number(handle.dataset.colorDrag), item = handle.closest('.color-item'), list = item.parentElement, items = [...list.children], scroller = document.querySelector('.side-scroll');
  const others = items.filter(element => element !== item);
  let to = from;
  const place = () => { others.forEach((element, i) => { element.style.order = i < to ? i : i + 1; }); item.style.order = to; };
  const move = moveEvent => {
    const rect = scroller.getBoundingClientRect();
    if (moveEvent.clientY < rect.top + 24) scroller.scrollTop -= 8; else if (moveEvent.clientY > rect.bottom - 24) scroller.scrollTop += 8;
    to = others.filter(element => { const box = element.getBoundingClientRect(); return moveEvent.clientY > box.top + box.height / 2; }).length;
    place();
  };
  const finish = endEvent => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', finish); removeEventListener('pointercancel', finish);
    item.classList.remove('dragging');
    if (endEvent.type === 'pointercancel' || !commitColorMove(from, to)) render();
  };
  event.preventDefault(); item.classList.add('dragging');
  addEventListener('pointermove', move); addEventListener('pointerup', finish); addEventListener('pointercancel', finish);
}
// Moves the tab in the DOM while dragging, so the pressed element survives until drop; a short press stays a click.
function startSchemeDrag(item, event) {
  const strip = item.parentElement, startX = event.clientX, startY = event.clientY;
  let dragging = false;
  const schemes = () => [...strip.querySelectorAll('.palette-tab-item.can-delete')];
  const move = moveEvent => {
    if (!dragging && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 5) return;
    if (!dragging) { dragging = true; item.classList.add('dragging'); }
    const over = schemes().find(other => { if (other === item) return false; const box = other.getBoundingClientRect(); return moveEvent.clientX >= box.left && moveEvent.clientX <= box.right && moveEvent.clientY >= box.top && moveEvent.clientY <= box.bottom; });
    if (!over) return;
    const box = over.getBoundingClientRect();
    strip.insertBefore(item, moveEvent.clientX < box.left + box.width / 2 ? over : over.nextSibling);
  };
  const finish = endEvent => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', finish); removeEventListener('pointercancel', finish);
    if (!dragging) return;
    item.classList.remove('dragging');
    // The drop must not also count as choosing the tab.
    addEventListener('click', stop => { stop.stopPropagation(); stop.preventDefault(); }, { capture: true, once: true });
    setTimeout(() => { if (endEvent.type === 'pointerup') state.saved = orderSavedPalettes(state.saved, schemes().map(el => el.querySelector('.palette-tab').dataset.value)); persist(); render(); });
  };
  addEventListener('pointermove', move); addEventListener('pointerup', finish); addEventListener('pointercancel', finish);
}
app.addEventListener('contextmenu', event => {
  const tab = event.target.closest?.('.palette-tab[data-action="palette-tab"]');
  if (!tab || isLiveReadOnly()) return;
  event.preventDefault();
  const listed = tab.dataset.value !== 'current', box = tab.getBoundingClientRect();
  // The keyboard's menu key fires without a pointer position, so the menu opens under the tab.
  const byPointer = event.clientX || event.clientY;
  openPaletteMenu(listed ? tab.dataset.value : state.draft.id, listed, byPointer ? event.clientX : box.left, byPointer ? event.clientY : box.bottom + 4, tab);
});
app.addEventListener('pointerdown', event => {
  const handle = event.target.closest?.('[data-color-drag]');
  if (handle && !event.button && !isLiveReadOnly()) startColorDrag(handle, event);
  const scheme = event.target.closest?.('.palette-tab-item.can-delete');
  if (scheme && !event.button && !isLiveReadOnly()) startSchemeDrag(scheme, event);
});
app.addEventListener('keydown', event => {
  const handle = event.target.closest?.('[data-color-drag]');
  if (!handle || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const from = Number(handle.dataset.colorDrag), to = from + (event.key === 'ArrowUp' ? -1 : 1);
  if (commitColorMove(from, to)) document.querySelector(`[data-color-drag="${to}"]`)?.focus();
});
function copyLiveSession() {
  if (!live.ready) return;
  clearActiveOwner(localStorage, live.base);
  detachLive();
  const url = new URL(location.href); url.searchParams.delete('edit'); url.hash = ''; historyReplaceLive(url);
  state.baseline.id = crypto.randomUUID(); state.draft.id = state.baseline.id; state.draft.name += ' · 我的副本'; state.collapsed = false; state.editorOpen = false; history = []; future = [];
  persist(); render(); toast('已复制为独立方案，不会修改原方案');
}
app.addEventListener('toggle', e => { if (e.target.matches?.('.chart-style-panel')) state.chartStyleOpen = e.target.open; }, true);
app.addEventListener('click', async e => {
  const liveAction = e.target.closest('[data-action]')?.dataset.action;
  // A preview switch rather than an edit, so viewers can use it too.
  if (liveAction === 'pnl-trend') { state.pnlTrend = e.target.closest('[data-action]').dataset.value === 'down' ? 'down' : 'up'; render(); return; }
  if (liveAction === 'live-reload') { await connectLive(); return; }
  if (liveAction === 'live-copy') { copyLiveSession(); return; }
  if (liveAction === 'theme' && live.role === 'viewer' && live.ready) {
    live.viewerTheme = e.target.closest('[data-action]').dataset.value;
    saveViewerTheme(localStorage, live.viewerTheme); state.theme = live.viewerTheme; render(); return;
  }
  if (liveAction === 'viewer-palette' && live.role === 'viewer' && live.ready) {
    const value = e.target.closest('[data-action]').dataset.value;
    live.viewerPalette = value === ownerTabId() ? null : value;
    if (live.id) saveViewerPalette(localStorage, live.id, live.viewerPalette);
    render(); return;
  }
  if (live.role === 'viewer' && live.ready && !mobileEntry) {
    const viewerTarget = e.target.closest('[data-action]');
    if (liveAction === 'viewer-scene' && scenes.some(s => s.id === viewerTarget.dataset.value)) { live.viewerScene = viewerTarget.dataset.value; saveViewerScene(localStorage, live.id, live.viewerScene); state.scene = viewerSceneNow(); render(); return; }
    if (liveAction === 'viewer-collapse') { state.collapsed = !state.collapsed; render(); return; }
    if (liveAction === 'scene-retry') { lazyScenes[viewerTarget.dataset.value].failed = false; render(); return; }
  }
  if (isLiveReadOnly()) return;
  const sceneSlot = e.target.closest('.scene-chart-slot');
  if (sceneSlot && ['terminal', 'workspace'].includes(state.scene)) { selectSceneChart(sceneSlot.dataset.chartId); return; }
  const card=e.target.closest('[data-module-id]'),cardAction=e.target.closest('[data-action]');
  if(card&&(!cardAction||cardAction.dataset.action==='module-select')){selectPreviewModule(card.dataset.moduleId);return;}
  const mark = e.target.closest('[data-color-role]');
  if (mark) {
    const role = mark.dataset.colorRole, index = Number(mark.dataset.colorIndex);
    if (current().themes[state.theme][role]?.[index]) { state.editorOpen = true; state.role = role; state.selected = index; state.panel = 'palette'; state.collapsed = false; if (state.previewFullscreen) await setPreviewFullscreen(false); else render(); }
    else toast('当前色板缺少此颜色，请先导入完整色板');
    return;
  }
  const target = e.target.closest('[data-action]'); if (!target || target.disabled) return;
  const { action, value } = target.dataset;
  if (action === 'fullscreen' || action === 'exit-fullscreen') { await setPreviewFullscreen(action === 'fullscreen'); return; }
  if (action === 'share-mobile') {
    if (!/^https?:$/.test(location.protocol)) { toast('请通过已部署的网址分享，离线文件可导出实验 JSON'); return; }
    openModal(`${modalHead('分享预览')}<p>固定链接只读，配色和各场景的模块布局都会自动同步。手机打开只看 Aime 对话，可以切换主题和色板；电脑打开还能切换场景。查看者都不能编辑。</p><button class="button primary" data-modal-action="live-share">${live.role==='owner'?'复制固定链接':'获取固定链接'}</button><p class="editor-footnote">${live.role==='owner'?esc(backupNote()):'同一浏览器会复用上次创建的链接；首次使用才新建。创建后色板会自动备份到云端。'}</p><button class="button" data-modal-action="snapshot-share">分享静态快照</button><p class="editor-footnote">静态快照只包含 Aime 对话；后续改色仍需重新分享。</p>${live.role==='owner'?'<button class="button" data-modal-action="live-copy">复制为新方案</button><p class="editor-footnote">生成独立副本，之后可创建新的固定链接，不影响当前链接。</p>':''}`);
    return;
  }
  if (action === 'scene') { state.scene = value; state.editorOpen = false; }
  if (action === 'scene-retry') lazyScenes[value].failed = false;
  if (action === 'rename-palette') {
    openRenameModal(state.draft.id);return;
  }
  if (action === 'editor-close') state.editorOpen = false;
  if (action === 'editor-model') state.editorModel = value === 'hsb' ? 'hsb' : 'oklch';
  if (action === 'color-add' && !isPaletteLocked() && seriesRoles.includes(state.role)) {
    remember(); addSeriesColor(state.draft, state.role);
    state.selected = state.draft.themes[state.theme][state.role].length - 1; state.editorOpen = true;
  }
  if (action === 'color-remove' && !isPaletteLocked() && seriesRoles.includes(state.role)) {
    const index = Number(value);
    remember(); removeSeriesColor(state.draft, index, state.role);
    if (state.selected === index) state.editorOpen = false;
    else if (state.selected > index) state.selected--;
    toast('已删除颜色，可撤销此操作');
  }
  if (action === 'palette-tab') {
    if (value === 'current') return;
    // Clicking the open preset again goes back to its original colors; a double click must not do that by accident.
    if (value === state.draft.id) {
      state.panel = state.panel === 'check' ? 'check' : 'palette';
      if (state.presetEdits[value] && e.detail < 2 && !isPaletteLocked(value)) restoreOriginal();
      persist(); render(); document.querySelector('.palette-tabs [aria-selected="true"]')?.focus({preventScroll:true}); return;
    }
    const palette = [...presets,...state.saved].find(p=>p.id===value);
    if (palette) { state.panel=state.panel==='check'?'check':'palette';applyPalette(palette);document.querySelector('.palette-tabs [aria-selected="true"]')?.focus({preventScroll:true}); }
    return;
  }
  if (action === 'module-picker' && value && state.scene==='aime') activeModuleBoard().selected=value;
  if (action === 'financial-density' && ['compact','standard'].includes(value)) state.financialDensity = value;
  if (action === 'board-density' && ['compact','standard'].includes(value)) activeModuleBoard().density = value;
  if (action === 'board-columns' && [1,2,3,4,5].includes(Number(value))) activeModuleBoard().columns = Number(value);
  if (action === 'module-select') { selectPreviewModule(value);return; }
  if (action === 'module-picker') { openModal(`${modalHead('添加可视化模块')}<p>Ainvest · ${state.scene==='aime'?'对话组件':'可视化组件'} · 共 ${compactTypes.length} 种</p>${[...new Set(compactTypes.map(t=>t.group))].map(group=>`<div class="compact-picker-group"><h3>${group}</h3>${compactTypes.filter(t=>t.group===group).map(t=>`<button class="export-choice" data-modal-action="add-module" data-value="${t.id}"><span><strong>${t.name}</strong></span></button>`).join('')}</div>`).join('')}`); return; }
  if(['module-move-up','module-move-down','module-hide','module-show','module-show-all'].includes(action)){
    const board=activeModuleBoard(),id=value||board.selected;
    if(action==='module-show-all'){for(const module of board.modules)module.hidden=false;board.selected||=board.modules[0]?.id;}
    else if(action==='module-hide'||action==='module-show')setCompactModuleHidden(board,id,action==='module-hide');
    else {const visible=board.modules.filter(m=>!m.hidden);moveCompactModule(board,id,visible.findIndex(m=>m.id===id)+(action==='module-move-up'?-1:1));board.selected=id;}
    persist();render();
    if(action==='module-show'||action.startsWith('module-move'))document.querySelector(`[data-module-id="${id}"]`)?.scrollIntoView({block:'nearest'});
    return;
  }
  if (action === 'module-duplicate') { const selected = activeModuleBoard().modules.find(m => m.id === activeModuleBoard().selected); if(selected && activeModuleBoard().modules.length < 60) { const added = {...selected, id:crypto.randomUUID()}; activeModuleBoard().modules.splice(activeModuleBoard().modules.indexOf(selected)+1,0,added); activeModuleBoard().selected=added.id; } }
  if (action === 'module-remove') { activeModuleBoard().modules=activeModuleBoard().modules.filter(m=>m.id!==activeModuleBoard().selected); activeModuleBoard().selected=activeModuleBoard().modules.find(m=>!m.hidden)?.id; }
  if (action === 'scene-chart-reset') delete state.sceneCharts[state.sceneSelected];
  if (action === 'theme') { state.theme = value; state.editorOpen = false; }
  if (action === 'collapse') state.collapsed = !state.collapsed;
  if (action === 'panel') { state.panel = value; state.editorOpen = false; }
  if (action === 'role') { state.role = value; state.selected = 0; state.editorOpen = false; }
  if (action === 'color') { state.role = target.dataset.role || state.role; state.selected = Number(value); state.editorOpen = true; }
  if (action === 'undo' && history.length && !isPaletteLocked()) { future.push(clone(state.draft)); state.draft = onOpenPalette(history.pop()); }
  if (action === 'redo' && future.length && !isPaletteLocked()) { history.push(clone(state.draft)); state.draft = onOpenPalette(future.pop()); }
  if (action === 'reset' && changedCount()) restoreOriginal();
  if (action === 'copy-oklch') {
    try { await navigator.clipboard.writeText(oklchCss(hexToOklch(shownPalette().themes[state.theme][state.role][state.selected].hex)));toast('已复制 OKLCH 色值'); } catch {toast('无法访问剪贴板，请从 OKLCH 文本手动复制');}
    return;
  }
  if (action === 'copy-color') {
    const hex = shownPalette().themes[state.theme][state.role][state.selected].hex;
    try { await navigator.clipboard.writeText(hex); toast(`已复制 ${hex}`); } catch { toast('无法访问剪贴板，请从色值输入框手动复制'); }
    return;
  }
  if (action === 'save') {
    openModal(`${modalHead('另存为新方案')}<p>把当前颜色存成一个新方案并切换过去。方案里的修改会自动保存，不需要再点保存。</p><label for="save-name">方案名称</label><input id="save-name" class="modal-input" maxlength="80" value="${esc(state.draft.name + ' · 调整版')}"><div class="modal-actions"><button class="button" data-modal-action="close">取消</button><button class="button primary" data-modal-action="save">另存为</button></div>`); return;
  }
  if (action === 'export') {
    openModal(`${modalHead('导出与分享')}<p>导出的 JSON 可在其他设备上导入。完整实验文件可以复现本次比较条件。</p><button class="export-choice" data-modal-action="export-palette">${icon('file')}<span><strong>导出当前色板</strong><small>颜色角色、浅深主题、来源信息</small></span></button><button class="export-choice" data-modal-action="export-session">${icon('copy')}<span><strong>导出完整实验</strong><small>色板、当前场景、主题与工具版本</small></span></button>`); return;
  }
  if (action === 'import-mode' && ['text','code'].includes(value)) { importInputMode=value;pendingImport=null;importError=''; }
  if (action === 'example' && importInputMode === 'text') { importLightText='#265FFC #38D1FF #F564B9 #733ED6 #00CCC3 #273D8F #FF7040';importDarkText='';pendingImport=null;importError=''; }
  if (action === 'example' && importInputMode === 'code') { importText = '[\n  "#265FFC",\n  "#38D1FF",\n  "#F564B9",\n  "#733ED6",\n  "#00CCC3"\n]'; pendingImport = null; importError = ''; }
  if (action === 'parse') { try { pendingImport = importInputMode === 'text' ? {candidates:[parseTextPalette(importLightText,importDarkText)]} : parseImport(importText); importedIndex = 0; importError = ''; } catch (error) { pendingImport = null; importError = error.message; } }
  if (action === 'apply-import' && pendingImport) {
    if (pendingImport.session) {
      const s = pendingImport.session; state.customTemplate=[...comparisonTemplates.map(t=>t.id),'free'].includes(s.customTemplate)?s.customTemplate:'all';state.comparisonBoards=validateComparisonBoards(s.comparisonBoards); state.globalChartStyle=normalizeGlobalChartStyle(s.globalChartStyle); state.checkSettings=normalizeCheckSettings(s.checkSettings); state.sceneCharts=normalizeSceneCharts(s.sceneCharts); state.financialBoard = validateFinancialBoard(s.financialBoard); state.financialDensity = s.financialDensity === 'standard' ? 'standard' : 'compact'; if (s.customBoard) state.customBoard = validateCompactBoard(s.customBoard); if(s.aimeBoard)state.aimeBoard=validateAimeBoard(s.aimeBoard); writeBackDraft(state, presets); adoptDraft(); state.baseline = clone(s.baseline); state.draft = clone(s.draft); state.draft.id = crypto.randomUUID(); state.baseline.id = state.draft.id;
      state.scene = mobileEntry ? 'aime' : scenes.some(v => v.id === s.scene) ? s.scene : 'financial'; state.theme = ['light', 'dark'].includes(s.theme) ? s.theme : 'light'; history = []; future = [];
    } else { const p = clone(pendingImport.candidates[importedIndex]); p.name = importName.trim() || p.name; p.id = crypto.randomUUID(); const sourceName=p.name;let suffix=2;while([...presets,...state.saved].some(v=>v.name===p.name))p.name=sourceName+' '+suffix++;state.saved.push(clone(p)); state.saved = state.saved.slice(-30); applyPalette(p); }
    state.panel = 'palette'; state.editorOpen = false; state.role = 'categorical'; state.selected = 0; pendingImport = null; toast('已导入，可以开始调整颜色');
  }
  persist(); render();
});
modal.addEventListener('click', async e => {
  if (e.target.closest('[data-modal-action="live-copy"]')) { modal.close(); copyLiveSession(); return; }
  const shareButton = e.target.closest('[data-modal-action="live-share"]');
  if (shareButton) {
    shareButton.disabled = true;
    try {
      await ensureLiveOwner();
      openModal(`${modalHead('固定只读链接')}<p>发给其他人，手机和电脑都能打开。当前浏览器调色后，查看页面会自动更新；查看者无法覆盖你的方案。</p><textarea class="code-area" id="mobile-share-url" readonly aria-label="手机预览链接">${esc(liveViewerURL())}</textarea><div class="modal-actions"><button class="button" data-modal-action="close">关闭</button><button class="button primary" data-modal-action="copy-mobile-link">复制链接</button></div>`);
      const field = document.querySelector('#mobile-share-url'); field.focus(); field.select();
    } catch (error) { shareButton.disabled = false; toast(error.message); }
    return;
  }
  if (e.target.closest('[data-modal-action="snapshot-share"]')) {
    const url = new URL('aime.html', location.href);
    try { url.hash = 'aime=' + encodeMobilePreview({ ...liveSnapshot(), saved: undefined }); }
    catch (error) { toast(error.message); return; }
    openModal(`${modalHead('静态快照链接')}<p>这是分享时的快照，后续改色请重新分享。</p><textarea class="code-area" id="mobile-share-url" readonly aria-label="手机预览链接">${esc(url.href)}</textarea><div class="modal-actions"><button class="button" data-modal-action="close">关闭</button><button class="button primary" data-modal-action="copy-mobile-link">复制链接</button></div>`);
    return;
  }
  if (isLiveReadOnly()) return;
  if (e.target.closest('[data-modal-action="copy-mobile-link"]')) {
    const field = document.querySelector('#mobile-share-url');
    try { await navigator.clipboard.writeText(field.value); toast('已复制预览链接'); }
    catch { field.focus(); field.select(); toast('请复制已选中的链接'); }
    return;
  }
  const target = e.target.closest('[data-modal-action]'); if (!target) return;
  const action = target.dataset.modalAction;
  if (action === 'rename-palette') {
    const palette=state.saved.find(p=>p.id===target.dataset.value);if(!palette)return;
    const name=document.querySelector('#rename-name').value.trim();
    const error=document.querySelector('#rename-error');
    if(!name){error.textContent='请输入色板名称';document.querySelector('#rename-name').focus();return;}
    if([...presets,...state.saved].some(p=>p.id!==palette.id&&p.name===name)){error.textContent='已有同名色板，请换一个名称';return;}
    palette.name=name;
    if(state.draft.id===palette.id)state.draft.name=name;
    if(state.baseline.id===palette.id)state.baseline.name=name;
    persist();modal.close();render();toast('色板名称已更新');return;
  }
  if (action === 'close') modal.close();
  if (action === 'add-module') { if(activeModuleBoard().modules.length >= 60) { toast('最多展示 60 个模块'); return; } const added=newCompactModule(target.dataset.value); const board=activeModuleBoard(); const index=board.modules.findIndex(m=>m.id===board.selected); if(state.scene==='aime')board.modules.splice(index+1,0,added);else board.modules.push(added); activeModuleBoard().selected=added.id; persist(); modal.close(); render(); document.querySelector(`[data-module-id="${added.id}"]`)?.scrollIntoView({block:'nearest'}); }
  if (action === 'save') {
    const name = document.querySelector('#save-name').value.trim();
    if (!name) { document.querySelector('#save-name').focus(); return; }
    // The new scheme takes over a preset's edits, so the same colors are not listed twice.
    if (!isPaletteLocked()) delete state.presetEdits[state.draft.id];
    // A copy of a hidden palette stays hidden until someone chooses to show it.
    const copiedHidden = isPaletteHidden(state.draft.id);
    state.draft = { ...clone(state.draft), id: crypto.randomUUID(), name }; if (copiedHidden) state.hiddenPalettes.push(state.draft.id); state.saved.push(clone(state.draft)); state.saved = state.saved.slice(-30); persist(); modal.close(); render(); toast(`已保存「${name}」`);
  }
  if (action === 'export-palette') { download(current(), 'palette-lab-colors.json'); modal.close(); toast('已导出色板文件'); }
  if (action === 'export-session') {
    download({ kind: 'palette-lab-session', schemaVersion: 1, toolVersion: VERSION, exportedAt: new Date().toISOString(), scene: state.scene, theme: state.theme, baseline: state.baseline, draft: state.draft, customTemplate:state.customTemplate, comparisonBoards:state.comparisonBoards, customBoard: state.customBoard, aimeBoard: state.aimeBoard, financialDensity: state.financialDensity, financialBoard: state.financialBoard, checkSettings: state.checkSettings, globalChartStyle: state.globalChartStyle, sceneCharts: state.sceneCharts }, 'palette-lab-experiment.json'); modal.close(); toast('已导出完整实验文件');
  }
});
modal.addEventListener('click', e => { if (e.target === modal) { const r = modal.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) modal.close(); } });
document.addEventListener('keydown', async e => {
  // Alt with an arrow moves a saved scheme; plain arrows keep switching tabs.
  if (e.altKey && ['ArrowLeft','ArrowRight'].includes(e.key) && e.target.closest?.('.palette-tab-item.can-delete') && !isLiveReadOnly()) {
    e.preventDefault();
    const id = e.target.closest('.palette-tab-item').querySelector('.palette-tab').dataset.value, ids = state.saved.map(p => p.id), from = ids.indexOf(id), to = from + (e.key === 'ArrowRight' ? 1 : -1);
    if (to >= 0 && to < ids.length) { ids.splice(to, 0, ids.splice(from, 1)[0]); state.saved = orderSavedPalettes(state.saved, ids); persist(); render(); document.querySelector(`.palette-tab[data-value="${CSS.escape(id)}"]`)?.focus({preventScroll:true}); }
    return;
  }
  if (e.target.closest?.('.palette-tabs') && ['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
    e.preventDefault();const tabs=[...document.querySelectorAll('.palette-tab')],index=tabs.indexOf(e.target.closest('.palette-tab'));
    const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;if(next!==index)tabs[next]?.click();document.querySelectorAll('.palette-tab')[next]?.focus({preventScroll:true});return;
  }
  if (e.key === 'Escape' && state.previewFullscreen && !modal.open) { e.preventDefault(); await setPreviewFullscreen(false); return; }
  if (e.target.closest?.('[data-color-role]') && ['Enter', ' '].includes(e.key)) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
  if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || modal.open) return;
  e.preventDefault(); document.querySelector(`[data-action="${e.shiftKey ? 'redo' : 'undo'}"]`)?.click();
});
render();
// Load the OKLCH picker ahead of the first edit, so opening a color does not wait for the network.
if (!mobileEntry && !liveParams.has('live')) (globalThis.requestIdleCallback || setTimeout)(() => loadColorJsPicker().catch(() => {}));
if (requestedLiveId) connectLive();
else if (mobileShareError) toast(mobileShareError);
else if (sharedPreviewLoaded) toast('已载入分享的 Aime 方案');
else if (loaded) toast('已恢复上次的色板与实验设置');

matchMedia('(max-width:650px)').addEventListener('change', () => {
  if (live.role === 'viewer' && live.ready && !mobileEntry) state.scene = viewerSceneNow();
  if (state.scene === 'aime' || live.role === 'viewer') { if (innerWidth <= 650) state.collapsed = true; render(); }
});
