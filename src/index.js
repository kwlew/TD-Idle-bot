require('dotenv').config();

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
} = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const { updatePresence, stopPresenceUpdater } = require('./bot/presence');
const { getStats, startStatsUpdater, stopStatsUpdater, getVersion } = require('./api/stats');
const { setDescription, updateDescription, stopDescriptionUpdater } = require('./bot/description');

const STATS_ACTIVE_INTERVAL = 3;  // seconds between polls while stats are moving
const STATS_IDLE_INTERVAL = 60;    // backoff once stats go quiet
const DESCRIPTION_INTERVAL = 120;
const PRESENCE_INTERVAL = 20;

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// Load commands
const foldersPath = path.join(__dirname, 'commands');

for (const entry of fs.readdirSync(foldersPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const commandsPath = path.join(foldersPath, entry.name);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.warn(`[WARN] ${filePath} is missing "data" or "execute".`);
        }
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.once(Events.ClientReady, async (client) => {
    console.log(`Logged in as ${client.user.tag}`);

    await getVersion(); // Prime the version cache before anything reads it.
    console.log("Initial version fetched and cached.");

    await getStats(); // Prime the cache before anything reads it.
    console.log("Initial stats fetched and cached.");

    await setDescription(client);
    updateDescription(client, DESCRIPTION_INTERVAL);
    console.log(`Description updater started with a ${DESCRIPTION_INTERVAL}-second interval.`);

    // Refresh the description as soon as the numbers actually move, rather than
    // waiting out the full description interval.
    startStatsUpdater({
        activeInterval: STATS_ACTIVE_INTERVAL,
        idleInterval: STATS_IDLE_INTERVAL,
        onChange: () => setDescription(client),
    });
    console.log(`Stats updater started (${STATS_ACTIVE_INTERVAL}s active / ${STATS_IDLE_INTERVAL}s idle).`);

    updatePresence(client, PRESENCE_INTERVAL);
    console.log(`Presence updater started with a ${PRESENCE_INTERVAL}-second interval.`);
});

client.on(Events.Error, (error) => console.error("Client error:", error));
process.on("unhandledRejection", (error) => console.error("Unhandled rejection:", error));

let shuttingDown = false;

async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`Received ${signal}, shutting down...`);
    stopStatsUpdater();
    stopDescriptionUpdater();
    stopPresenceUpdater();
    await client.destroy();
    process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

client.login(process.env.BOT_TOKEN).catch((error) => {
    console.error("Failed to log in. Check BOT_TOKEN in your .env file.", error);
    process.exit(1);
});