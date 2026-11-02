import { resolve } from 'node:path';
import { createSyncServer } from './sync-server.mjs';
const port = Number(process.env.PORT || 4317), host = process.env.HOST || '127.0.0.1';
const server = createSyncServer({ dataDir: resolve(process.env.SYNC_DATA_DIR || '.data/live-sessions'), allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean) });
server.listen(port, host, () => console.log(`Palette Lab + live sync: http://${host}:${port}`));
