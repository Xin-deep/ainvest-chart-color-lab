import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');
const modules = ['dist/lib/mobile-preview.js', 'dist/lib/colorjs-picker.js', 'dist/lib/chart-style.js', 'dist/lib/colors.js', 'dist/lib/oklch.js', 'dist/lib/palette-checks.js', 'dist/lib/palettes.js', 'dist/data/presets.js', 'dist/data/financial-reference.js', 'dist/data/financial-shared.js', 'dist/scenes/financial.js', 'dist/scenes/custom.js', 'dist/scenes/comparison.js', 'dist/scenes/financial-extras.js', 'dist/scenes/color-checks.js', 'dist/data/aime-reference.js', 'dist/scenes/aime.js', 'dist/app.js'];
const code = (await Promise.all(modules.map(read))).map(source => source.replace(/^import .*;\s*$/gm, '').replace(/^export /gm, '')).join('\n');
const css = await read('dist/styles.css');
const engine = await read('dist/vendor/vis-lab.bundle.js');
const html = (await read('dist/index.html'))
  .replace('<link rel="stylesheet" href="./styles.css" />', () => `<style>${css}</style>`)
  .replace('<script src="./vendor/vis-lab.bundle.js"></script>', () => `<script>${engine.replaceAll('</script', '<\\/script')}</script>`)
  .replace('<script type="module" src="./app.js"></script>', () => `<script type="module">${code.replaceAll('</script', '<\\/script')}</script>`);
await writeFile(new URL('preview.html', root), html);
console.log('已生成离线预览：preview.html');
