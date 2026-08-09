require('dotenv').config();

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
} = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const log = require('./utils/logger');

const { updatePresence, stopPresenceUpdater } = require('./bot/presence');
const { getStats, startStatsUpdater, stopStatsUpdater, getVersion } = require('./api/stats');
const { setDescription, updateDescription, stopDescriptionUpdater } = require('./bot/description');
const { startReminders, stopReminders } = require('./bot/reminders');
const economy = require('./persistence/economy');

const STATS_ACTIVE_INTERVAL = 3;  // seconds between polls while stats are moving
const STATS_IDLE_INTERVAL = 60;    // backoff once stats go quiet
const DESCRIPTION_INTERVAL = 120;
const PRESENCE_INTERVAL = 20;
const REMINDER_INTERVAL = 60;      // cooldowns are hours long, so a minute of slack is plenty

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
        } else {
            log.warn(`${filePath} is missing "data" or "execute" — skipped.`);
        }
    }
}

log.success(`Loaded ${client.commands.size} command${client.commands.size === 1 ? '' : 's'}: ${[...client.commands.keys()].join(', ')}`);

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
    log.success(`Logged in as ${client.user.tag}`);

    await economy.ensureReady(); // fail loudly now, not on someone's first /daily
    log.success('Connected to Supabase.');

    // Prime the caches before anything reads them.
    await Promise.all([getVersion(), getStats()]);

    await setDescription(client);
    updateDescription(client, DESCRIPTION_INTERVAL);

    // Refresh the description as soon as the numbers actually move, rather than
    // waiting out the full description interval.
    startStatsUpdater({
        activeInterval: STATS_ACTIVE_INTERVAL,
        idleInterval: STATS_IDLE_INTERVAL,
        onChange: () => setDescription(client),
    });

    updatePresence(client, PRESENCE_INTERVAL);
    startReminders(client, REMINDER_INTERVAL);

    log.success(`Bot ready — stats every ${STATS_ACTIVE_INTERVAL}s/${STATS_IDLE_INTERVAL}s, description every ${DESCRIPTION_INTERVAL}s, presence every ${PRESENCE_INTERVAL}s, reminders every ${REMINDER_INTERVAL}s.`);
});

client.on(Events.Error, (error) => log.error("Client error:", error));
process.on("unhandledRejection", (error) => log.error("Unhandled rejection:", error));

let shuttingDown = false;

async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    log.info(`Received ${signal}, shutting down...`);
    stopStatsUpdater();
    stopDescriptionUpdater();
    stopPresenceUpdater();
    stopReminders();
    await client.destroy();
    process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

client.login(process.env.BOT_TOKEN).catch((error) => {
    log.error("Failed to log in. Check BOT_TOKEN in your .env file.", error);
    process.exit(1);
});