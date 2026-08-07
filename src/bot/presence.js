const { ActivityType } = require('discord.js');
const { getCachedStats } = require('../api/stats');

const PRESENCE_TYPES = ["online", "stars", "golden", "idle"];

let presenceTimer = null;

function buildActivity(type) {
    const { stars, golden, onlineUsers } = getCachedStats();

    switch (type) {
        case "online":
            return `Online: ${onlineUsers.toLocaleString()}`;
        case "stars":
            return `Stars: ${stars.toLocaleString()}`;
        case "golden":
            return `Golden: ${golden.toLocaleString()}`;
        case "idle":
            return "Idle";
        default:
            return null;
    }
}

function setPresence(client, type) {
    const activity = buildActivity(type);

    if (activity === null) {
        console.error(`Unknown presence type: ${type}`);
        return;
    }

    try {
        client.user.setActivity(activity, { type: ActivityType.Playing });
    } catch (error) {
        console.error("Error updating presence:", error);
    }
}

function updatePresence(client, interval) {
    stopPresenceUpdater();

    let currentIndex = 0;
    setPresence(client, PRESENCE_TYPES[currentIndex]);
    console.log(`Initial presence set to: ${PRESENCE_TYPES[currentIndex]}`);

    presenceTimer = setInterval(() => {
        currentIndex = (currentIndex + 1) % PRESENCE_TYPES.length;
        setPresence(client, PRESENCE_TYPES[currentIndex]);
    }, interval * 1000);
}

function stopPresenceUpdater() {
    if (presenceTimer) {
        clearInterval(presenceTimer);
        presenceTimer = null;
    }
}

module.exports = { setPresence, updatePresence, stopPresenceUpdater };
