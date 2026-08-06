const { ActivityType } = require('discord.js');
const { getCachedOnlineUsers } = require('../utils/onlineUsers');

async function setPresence(client, type) {
    try {
        if (type === "online") {
            const onlineUsers = await getCachedOnlineUsers();
            client.user.setActivity(`Online: ${onlineUsers}`, { type: ActivityType.Playing });
        }
        else if (type === "idle") {
            client.user.setActivity(`Idle`, { type: ActivityType.Watching });
        }
    } catch (error) {
        console.error("Error updating presence:", error);
    }
}

async function updatePresence(client, interval) {
    const types = ["online", "idle"];
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