// One-off: imports balances from the old data/economy.json file (used before
// the bot moved to Supabase) into the wallets table. Safe to run more than
// once — it upserts, and renames the source file after a successful run so
// it can't be re-imported by accident.
//
// Usage: npm run migrate-economy

require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const log = require('../utils/logger');
const supabase = require('./supabaseClient');

const LEGACY_FILE = path.join(__dirname, '..', '..', 'data', 'economy.json');

async function main() {
    let raw;
    try {
        raw = fs.readFileSync(LEGACY_FILE, 'utf8');
    } catch (error) {
        if (error.code === 'ENOENT') {
            log.info('No legacy data/economy.json found — nothing to migrate.');
            return;
        }
        throw error;
    }

    const wallets = JSON.parse(raw);
    const entries = Object.entries(wallets);
    log.info(`Migrating ${entries.length} wallet(s) to Supabase...`);

    let failures = 0;

    for (const [userId, wallet] of entries) {
        const { error } = await supabase.from('wallets').upsert({
            user_id: userId,
            balance: wallet.balance ?? 0,
            last_daily: wallet.lastDaily ? new Date(wallet.lastDaily).toISOString() : null,
        });

        if (error) {
            log.error(`Failed to migrate wallet ${userId}:`, error);
            failures++;
            continue;
        }

        log.success(`Migrated ${userId}: ${wallet.balance ?? 0} coins`);
    }

    if (failures > 0) {
        log.warn(`${failures} wallet(s) failed to migrate — left ${LEGACY_FILE} in place, re-run after fixing.`);
        return;
    }

    const migratedPath = `${LEGACY_FILE}.migrated`;
    fs.renameSync(LEGACY_FILE, migratedPath);
    log.success(`Done. Renamed ${LEGACY_FILE} -> ${migratedPath}`);
}

main().catch((error) => {
    log.error('Migration failed:', error);
    process.exit(1);
});
