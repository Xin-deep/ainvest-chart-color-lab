import { build } from 'esbuild';
await build({ entryPoints: ['scripts/supabase-sdk-entry.js'], outfile: 'dist/vendor/supabase.bundle.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, legalComments: 'eof' });
console.log('已构建 Supabase 浏览器 SDK');
