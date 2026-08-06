require('dotenv').config();

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
} = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const { updatePresence } = require('./bot/presence');
const { updateStats, getStats } = require('./api/stats');

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// Load commands
const foldersPath = path.join(__dirname, 'commands');

for (const folder of fs.readdirSync(foldersPath)) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`Loaded command: ${command.data.name}`);
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
    await getStats(); // Cache stats.
    console.log("Initial stats fetched and cached.");
    await updateStats(20); // Update stats every 20 seconds.
    console.log("Stats updater started with a 20-second interval.");
    await updatePresence(client, 20);
    console.log("Presence updater started with a 20-second interval.");
});

process.on("SIGINT", () => {
    client.destroy();
    process.exit(0);
});

client.login(process.env.BOT_TOKEN);