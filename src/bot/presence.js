const { ActivityType } = require('discord.js');
const { getCachedOnlineUsers } = require('../api/stats');

async function setPresence(client, type) {
    try {
        if (type === "online") {
            const onlineUsers = await getCachedOnlineUsers();
            client.user.setActivity(`Online: ${onlineUsers}`, { type: ActivityType.Playing });
        }
        else if (type === "stars") {
            const { getCachedStars } = require('../api/stats');
            const stars = await getCachedStars();
            client.user.setActivity(`Stars: ${stars}`, { type: ActivityType.Playing });
        }
        else if (type === "golden") {
            const { getCachedGolden } = require('../api/stats');
            const golden = await getCachedGolden();
            client.user.setActivity(`Golden: ${golden}`, { type: ActivityType.Playing });
        }
        else if (type === "idle") {
            client.user.setActivity(`Idle`, { type: ActivityType.Playing });
        }
        else {
            console.error(`Unknown presence type: ${type}`);
        }
    } catch (error) {
        console.error("Error updating presence:", error);
    }
}

async function updatePresence(client, interval) {
    const types = ["online", "stars", "golden", "idle"];
    let currentIndex = 0;

    await setPresence(client, "online");
    console.log(`Initial presence set to: ${types[currentIndex]}`);

    setInterval(() => {
        currentIndex = (currentIndex + 1) % types.length;
        console.log(`Switching presence to: ${types[currentIndex]}`);
        const newType = types[currentIndex];
        setPresence(client, newType);
    }, interval * 1000);
}

module.exports = { setPresence, 
    updatePresence,
 };