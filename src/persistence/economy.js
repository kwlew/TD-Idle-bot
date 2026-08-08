const log = require('../utils/logger');
const supabase = require('./supabaseClient');

const COIN = '🪙';
const DAILY_AMOUNT = 100;
const DAILY_COOLDOWN_SECONDS = 24 * 60 * 60;

function assertPositiveInteger(amount, fnName) {
    if (!Number.isInteger(amount) || amount <= 0) {
        throw new RangeError(`${fnName} amount must be a positive integer, got ${amount}`);
    }
}

async function getBalance(userId) {
    const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        log.error('Failed to read balance:', error);
        throw new Error('Could not read balance from the database.');
    }

    return data?.balance ?? 0;
}

async function addCoins(userId, amount) {
    assertPositiveInteger(amount, 'addCoins');

    const { data, error } = await supabase.rpc('add_coins', {
        p_user_id: userId,
        p_amount: amount,
    });

    if (error) {
        log.error('Failed to add coins:', error);
        throw new Error('Could not add coins.');
    }

    return data;
}

// Returns false without mutating anything if funds are insufficient.
async function removeCoins(userId, amount) {
    assertPositiveInteger(amount, 'removeCoins');

    const { data, error } = await supabase.rpc('remove_coins', {
        p_user_id: userId,
        p_amount: amount,
    });

    if (error) {
        log.error('Failed to remove coins:', error);
        throw new Error('Could not remove coins.');
    }

    return data !== null; // null => the WHERE clause found no eligible row (insufficient funds)
}

async function claimDaily(userId) {
    const { data, error } = await supabase
        .rpc('claim_daily', {
            p_user_id: userId,
            p_amount: DAILY_AMOUNT,
            p_cooldown_seconds: DAILY_COOLDOWN_SECONDS,
        })
        .single();

    if (error) {
        log.error('Failed to claim daily:', error);
        throw new Error('Could not claim daily coins.');
    }

    return {
        claimed: data.claimed,
        amount: data.amount,
        balance: data.balance,
        remainingMs: data.remaining_seconds * 1000,
    };
}

// Confirms the database is reachable and the RPCs exist — call once at
// startup so a bad SUPABASE_URL/KEY or missing schema fails loudly instead of
// on someone's first /daily.
async function ensureReady() {
    const { error } = await supabase.from('wallets').select('user_id').limit(1);
    if (error) {
        throw new Error(`Supabase connection check failed: ${error.message}`);
    }
}

module.exports = {
    COIN,
    DAILY_AMOUNT,
    getBalance,
    addCoins,
    removeCoins,
    claimDaily,
    ensureReady,
};
