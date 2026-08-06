let onlineUsers = 0;

async function getOnlineUsers() {
    try {
        const response = await fetch("https://tdidle-presence.kwlew.workers.dev/online");

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        onlineUsers = Number.parseInt(data.online, 10);
        console.log(`Online users: ${onlineUsers}`);
        return onlineUsers;
    } catch (error) {
        console.error("Error fetching online users:", error);
        return null;
    }
}

async function updateOnlineUsers(interval) {
    setInterval(async () => {
        onlineUsers = await getOnlineUsers();
    }, interval * 1000); // Update every interval seconds.
}

async function getCachedOnlineUsers() {
    return onlineUsers;
}

module.exports = { getOnlineUsers, updateOnlineUsers, getCachedOnlineUsers };