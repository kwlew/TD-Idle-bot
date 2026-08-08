const log = require('../utils/logger');
const { getCachedStats, getCachedVersion } = require('../api/stats');

let lastDescription = null;
let descriptionTimer = null;

async function buildDescription() {
    const { stars, golden, onlineUsers } = await getCachedStats();
    const stable = await getCachedVersion("stable");
    const prerelease = await getCachedVersion("prerelease");
    return `**Stars**: ${stars.toLocaleString()}, **Golden**: ${golden.toLocaleString()}, **Online**: ${onlineUsers.toLocaleString()}`
        + `\nBot created by: **https://kwlew.dev**`
        + `\nGame Version: **v${stable}** (stable) | **v${prerelease}** (prerelease)`;
}

// Edits the application description, skipping the API call when nothing changed
// so we don't burn rate limit on identical writes.
async function setDescription(client) {
    const description = await buildDescription();

    if (description === lastDescription) {
        return false;
    }

    try {
        await client.application.edit({ description });
        lastDescription = description;
        return true;
    } catch (error) {
        log.error('Error setting description:', error);
        return false;
    }
}

function updateDescription(client, interval) {
    stopDescriptionUpdater();
    descriptionTimer = setInterval(() => {
        setDescription(client);
    }, interval * 1000);
}

function stopDescriptionUpdater() {
    if (descriptionTimer) {
        clearInterval(descriptionTimer);
        descriptionTimer = null;
    }
}

module.exports = { setDescription, updateDescription, stopDescriptionUpdater };
