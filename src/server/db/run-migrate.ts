import 'dotenv/config';
import { loadConfig } from './env.js';
import { initPool } from './pool.js';
import { runMigrations } from './migrate.js';

const config = loadConfig();
initPool(config.database);
console.log('Connected to database. Running migrations...');

const applied = await runMigrations();
console.log('Migrations applied:', applied.length ? applied : 'none (all up to date)');
process.exit(0);
