let onlineUsers = 0;
let stars = 0;
let golden = 0;

async function getStats() {
    try {
        const response = await fetch("https://tdidle-presence.kwlew.workers.dev/stats");

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        onlineUsers = Number.parseInt(data.online, 10);
        stars = Number.parseInt(data.stars, 10);
        golden = Number.parseInt(data.golden, 10);
        console.log(`Stars: ${stars}, Golden: ${golden}, Online: ${onlineUsers}`);
    } catch (error) {
        console.error("Error fetching stats:", error);
    }
}

async function updateStats(interval) {
    setInterval(async () => {
        getStats()
    }, interval * 1000); // Update every interval seconds.
}

async function getCachedOnlineUsers() {
    return onlineUsers;
}

async function getCachedStars() {
    return stars;
}

async function getCachedGolden() {
    return golden;
}

module.exports = { getStats, updateStats, getCachedOnlineUsers, getCachedStars, getCachedGolden };