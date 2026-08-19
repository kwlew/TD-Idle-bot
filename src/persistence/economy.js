const log = require('../utils/logger');
const supabase = require('./supabaseClient');

const CURRENCY_NAME = 'gems';
const CURRENCY_NAME_SINGULAR = 'gem';
const COIN = '💎';
const DAILY_AMOUNT = 3000; // 1500 - 4500, randomized per claim
const DAILY_COOLDOWN_SECONDS = 24 * 60 * 60;

const MIN_WORK_AMOUNT = 100;
const MAX_WORK_AMOUNT = 800; // 100 - 800, randomized per claim
const WORK_COOLDOWN_SECONDS = 60 * 60; // 1 hour

// Preference key (what the rest of the bot passes around) -> wallets column.
// Going through this map is what keeps a user-supplied option name from
// reaching the update as a column.
const PREFERENCE_KEYS = Object.freeze({
    payDm: 'pay_dm',
    dailyReminder: 'daily_reminder',
    workReminder: 'work_reminder',
});

const PREFERENCE_COLUMNS = Object.values(PREFERENCE_KEYS).join(', ');

// What a user who has never touched /settings gets. These mirror the column
// defaults in supabase/schema.sql and cover the no-wallet-row-yet case too.
const DEFAULT_PREFERENCES = Object.freeze({
    payDm: true,
    dailyReminder: false,
    workReminder: false,
});

function toPreferences(row) {
    return {
        payDm: row?.pay_dm ?? DEFAULT_PREFERENCES.payDm,
        dailyReminder: row?.daily_reminder ?? DEFAULT_PREFERENCES.dailyReminder,
        workReminder: row?.work_reminder ?? DEFAULT_PREFERENCES.workReminder,
    };
}

async function assertPositiveInteger(amount, fnName) {
    if (!Number.isInteger(amount) || amount <= 0) {
        throw new RangeError(`${fnName} amount must be a positive integer, got ${amount}`);
    }
}

function validUser(user) {
    return !user
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

    return data !== null; // null, shit doesn't work.
}

async function pay(userId, recipientId, amount) {
    await assertPositiveInteger(amount, 'pay');
    await assertPositiveInteger(await getBalance(userId)-amount, 'pay');

    await addCoins(recipientId, amount);
    await removeCoins(userId, amount);
}

// Everything in circulation, for /stats. The RPC is a single-row SELECT SUM(balance) FROM wallets.
async function getTotalCoinsInCirculation() {
    const { data, error } = await supabase.rpc('total_coins');

    if (error) {
        log.error('Failed to read total coins in circulation:', error);
        throw new Error('Could not read the total balance from the database.');
    }

    return Number(data ?? 0);
}

async function getPreferences(userId) {
    const { data, error } = await supabase
        .from('wallets')
        .select(PREFERENCE_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        log.error('Failed to read preferences:', error);
        throw new Error('Could not read your settings from the database.');
    }

    return toPreferences(data);
}

// preferences for /settings
async function setPreferences(userId, changes) {
    const patch = {};

    for (const [key, value] of Object.entries(changes)) {
        const column = PREFERENCE_KEYS[key];

        if (!column) {
            throw new RangeError(`Unknown preference: ${key}`);
        }
        if (typeof value !== 'boolean') {
            throw new RangeError(`Preference ${key} must be a boolean, got ${value}`);
        }

        patch[column] = value;
    }

    if (Object.keys(patch).length === 0) {
        return getPreferences(userId);
    }

    const { data, error } = await supabase
        .from('wallets')
        .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
        .select(PREFERENCE_COLUMNS)
        .single();

    if (error) {
        log.error('Failed to save preferences:', error);
        throw new Error('Could not save your settings.');
    }

    return toPreferences(data);
}

// All reminders n shit.
async function claimDueReminders() {
    const { data, error } = await supabase.rpc('claim_due_reminders', {
        p_daily_cooldown_seconds: DAILY_COOLDOWN_SECONDS,
        p_work_cooldown_seconds: WORK_COOLDOWN_SECONDS,
    });

    if (error) {
        log.error('Failed to load due reminders:', error);
        throw new Error('Could not load due reminders.');
    }

    return (data ?? []).map(row => ({
        userId: row.reminder_user_id,
        daily: row.daily_due === true,
        work: row.work_due === true,
    }));
}

async function claimDaily(userId) {
    const { data, error } = await supabase
        .rpc('claim_daily', {
            p_user_id: userId,
            p_amount: Math.round(DAILY_AMOUNT * (Math.random() + 0.5)),
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

async function claimWork(userId) {
    const { data, error } = await supabase
        .rpc('claim_work', {
            p_user_id: userId,
            p_min: MIN_WORK_AMOUNT,
            p_max: MAX_WORK_AMOUNT,
            p_cooldown_seconds: WORK_COOLDOWN_SECONDS,
        })
        .single();

    if (error) {
        log.error('Failed to claim work:', error);
        throw new Error('Could not claim work coins.');
    }

    return {
        claimed: data.claimed,
        amount: data.amount,
        balance: data.balance,
        remainingMs: data.remaining_seconds * 1000,
    };
}

// Top wallets, for /leaderboard. Returns an array of { userId, balance } objects.
async function getLeaderboard(limit) {
    const { data, error } = await supabase
        .from('wallets')
        .select('user_id, balance')
        .order('balance', { ascending: false })
        .limit(limit);

    if (error) {
        log.error('Failed to read leaderboard:', error);
        throw new Error('Could not read the leaderboard from the database.');
    }

    return (data ?? []).map(row => ({ userId: row.user_id, balance: row.balance }));
}

// How many wallets outrank this user, so /leaderboard can show "You're #N"
// for someone outside the displayed top. Ties all share a rank rather than
// getting an arbitrary break — count(strictly greater) + 1.
async function getRank(userId) {
    const balance = await getBalance(userId);

    const { count, error } = await supabase
        .from('wallets')
        .select('user_id', { count: 'exact', head: true })
        .gt('balance', balance);

    if (error) {
        log.error('Failed to compute leaderboard rank:', error);
        throw new Error('Could not compute your leaderboard rank.');
    }

    return { rank: (count ?? 0) + 1, balance };
}

// Read-only cooldown check — same math as claim_daily/claim_work's remaining-
// time branch, but without touching the row. Used for display (/profile)
// where actually claiming would be wrong.
function cooldownStatus(lastClaimedAt, cooldownSeconds) {
    if (!lastClaimedAt) return { ready: true, remainingMs: 0 };

    const remainingMs = cooldownSeconds * 1000 - (Date.now() - new Date(lastClaimedAt).getTime());
    return remainingMs > 0 ? { ready: false, remainingMs } : { ready: true, remainingMs: 0 };
}

// Everything /profile shows about a user in one query: balance, both claim
// cooldowns, and preferences. A user who's never earned anything yet gets the
// same defaults getBalance/getPreferences would give them.
async function getProfile(userId) {
    const { data, error } = await supabase
        .from('wallets')
        .select(`balance, last_daily, last_work, ${PREFERENCE_COLUMNS}`)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        log.error('Failed to read profile:', error);
        throw new Error('Could not read that profile from the database.');
    }

    return {
        balance: data?.balance ?? 0,
        daily: cooldownStatus(data?.last_daily, DAILY_COOLDOWN_SECONDS),
        work: cooldownStatus(data?.last_work, WORK_COOLDOWN_SECONDS),
        preferences: toPreferences(data),
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
    assertPositiveInteger,
    CURRENCY_NAME,
    CURRENCY_NAME_SINGULAR,
    COIN,
    DAILY_AMOUNT,
    DEFAULT_PREFERENCES,
    getBalance,
    getTotalCoinsInCirculation,
    getLeaderboard,
    getRank,
    getProfile,
    addCoins,
    removeCoins,
    pay,
    claimDaily,
    claimWork,
    getPreferences,
    setPreferences,
    claimDueReminders,
    ensureReady,
    validUser,
};
