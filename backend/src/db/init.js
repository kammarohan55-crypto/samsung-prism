import { initDb, closeDb, getAll } from './db.js';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', '..', 'data');

mkdirSync(dataDir, { recursive: true });

console.log('[db:init] Initializing database...');
await initDb(join(dataDir, 'itis.db'));
console.log('[db:init] Schema created successfully.');

const tables = getAll("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log('[db:init] Tables:', tables.map(t => t.name).join(', '));

closeDb();
console.log('[db:init] Done.');
