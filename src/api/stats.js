const STATS_URL = process.env.STATS_URL || "https://tdidle-presence.kwlew.workers.dev/stats";
const VERSION_URL = process.env.VERSION_URL || "https://tdidle-presence.kwlew.workers.dev/version";
const FETCH_TIMEOUT_MS = 5000;

let version = "unknown";
let stats = { stars: 0, golden: 0, onlineUsers: 0 };
let lastUpdated = null;
let updaterTimer = null;

function toCount(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

// Fetches the latest stats and refreshes the cache. Returns the new stats, or
// the last known good values if the request fails.
async function getStats() {
    try {
        const response = await fetch(STATS_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        stats = {
            stars: toCount(data.stars),
            golden: toCount(data.golden),
            onlineUsers: toCount(data.online),
        };
        lastUpdated = new Date();

        console.log(`Stars: ${stats.stars}, Golden: ${stats.golden}, Online: ${stats.onlineUsers}`);
    } catch (error) {
        console.error("Error fetching stats:", error);
    }

    return getCachedStats();
}

async function getVersion() {
    try {
        const response = await fetch(VERSION_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Fetched version: ${data.version}`);
        version = data.version || "unknown";
    } catch (error) {
        console.error("Error fetching version:", error);
        version = "unknown";
    }
}

async function cacheVersion() {
    console.log(`Version cached: ${version}`);
    return version
}

// True when any of the tracked stats differ.
function verifyStats(pastStats) {
    return pastStats.stars !== stats.stars
        || pastStats.golden !== stats.golden
        || pastStats.onlineUsers !== stats.onlineUsers;
}

// Polls the stats endpoint, backing off to `idleInterval` while nothing changes
// and dropping back to `activeInterval` as soon as it does. `onChange` is called
// with the fresh stats whenever a poll produces new values.
function startStatsUpdater({ activeInterval = 20, idleInterval = 60, onChange } = {}) {
    stopStatsUpdater();

    let interval = activeInterval;

    const tick = async () => {
        const pastStats = getCachedStats();
        await getStats();
        const changed = verifyStats(pastStats);

        if (changed) {
            interval = activeInterval;
            if (onChange) {
                try {
                    await onChange(getCachedStats());
                } catch (error) {
                    console.error("Error in stats onChange handler:", error);
                }
            }
        } else {
            interval = idleInterval;
            console.log(`Stats unchanged. Next check in ${interval}s.`);
        }

        updaterTimer = setTimeout(tick, interval * 1000);
    };

    updaterTimer = setTimeout(tick, interval * 1000);
    return () => stopStatsUpdater();
}

function stopStatsUpdater() {
    if (updaterTimer) {
        clearTimeout(updaterTimer);
        updaterTimer = null;
    }
}

function getCachedStats() {
    return { ...stats, lastUpdated };
}

function getCachedOnlineUsers() {
    return stats.onlineUsers;
}

function getCachedStars() {
    return stats.stars;
}

function getCachedGolden() {
    return stats.golden;
}

module.exports = {
    getStats,
    getVersion,
    verifyStats,
    startStatsUpdater,
    stopStatsUpdater,
    cacheVersion,
    getCachedStats,
    getCachedOnlineUsers,
    getCachedStars,
    getCachedGolden,
};
