// Two modes, and they never populate the same scope at the same time — that's
// the whole point. Discord does NOT dedupe a command that's registered both
// globally and in a guild: it shows up twice in that guild's command list.
// So each mode clears the *other* scope in the dev guilds as it goes, meaning
// a command can never be live in both places at once.
//
//   node src/deploy-commands.js            Dev mode (default): clears global,
//                                           pushes only to GUILD_ID/GUILD2_ID.
//                                           Instant, but only visible there.
//
//   node src/deploy-commands.js --release  Release mode: pushes globally,
//                                           clears the guild-specific copies
//                                           in GUILD_ID/GUILD2_ID so they fall
//                                           back to the (slower) global set.

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const log = require('./utils/logger');

const isRelease = process.argv.includes('--release');

const commands = [];
const foldersPath = path.join(__dirname, 'commands');

for (const entry of fs.readdirSync(foldersPath, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const commandsPath = path.join(foldersPath, entry.name);
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      log.warn(`${file} is missing "data" or "execute" — skipped.`);
    }
  }
}

const rest = new REST().setToken(process.env.BOT_TOKEN);

const DEV_GUILD_IDS = [...new Set([process.env.GUILD_ID, process.env.GUILD2_ID].filter(Boolean))];

// Bots only get 200 guilds per page from this endpoint, so page through with
// the `after` cursor until a short page tells us we've hit the end.
async function countGuilds() {
  const PAGE_SIZE = 200;
  let total = 0;
  let after;

  for (;;) {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (after) query.set('after', after);

    const page = await rest.get(Routes.userGuilds(), { query });
    total += page.length;

    if (page.length < PAGE_SIZE) break;
    after = page[page.length - 1].id;
  }

  return total;
}

async function guildLabel(guildId) {
  try {
    const guild = await rest.get(Routes.guild(guildId));
    return `${guild.name} (${guildId})`;
  } catch {
    // Bot may not be a member, or lacks access to fetch the guild — fall back to the raw ID.
    return guildId;
  }
}

async function putGuildCommands(guildId, body) {
  return rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body });
}

async function releaseGlobally() {
  log.info(`Releasing ${commands.length} commands globally: ${commands.map(c => c.name).join(', ')}`);

  const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  log.success(`Deployed ${data.length} commands globally.`);

  try {
    const guildCount = await countGuilds();
    log.info(`This will roll out to ${guildCount} server${guildCount === 1 ? '' : 's'} (global updates can take up to an hour to fully propagate).`);
  } catch (error) {
    log.warn('Deployed successfully, but could not fetch guild count:', error);
  }

  if (DEV_GUILD_IDS.length === 0) return;

  for (const guildId of DEV_GUILD_IDS) {
    try {
      await putGuildCommands(guildId, []); // clear the guild-specific copies so only the global set remains
      log.success(`Cleared guild-specific commands in ${await guildLabel(guildId)} — now relying on global there too.`);
    } catch (error) {
      log.error(`Failed to clear guild commands for ${guildId}:`, error);
    }
  }
}

async function deployToDevGuilds() {
  log.info(`Deploying ${commands.length} commands to dev guild(s): ${commands.map(c => c.name).join(', ')}`);

  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    log.debug('Cleared global commands for dev mode.');
  } catch (error) {
    log.warn('Could not clear global commands before dev deploy (they may still collide with guild copies):', error);
  }

  if (DEV_GUILD_IDS.length === 0) {
    log.warn('No GUILD_ID/GUILD2_ID set in .env — nothing to deploy. Set them in .env, or run with --release to deploy globally.');
    return;
  }

  for (const guildId of DEV_GUILD_IDS) {
    try {
      const data = await putGuildCommands(guildId, commands);
      log.success(`Deployed ${data.length} commands instantly to ${await guildLabel(guildId)}.`);
    } catch (error) {
      log.error(`Failed to deploy to guild ${guildId}:`, error);
    }
  }

  log.info('Dev deploy complete. Run with --release (e.g. `npm run deploy-commands -- --release`) to publish globally.');
}

(async () => {
  try {
    if (isRelease) {
      await releaseGlobally();
    } else {
      await deployToDevGuilds();
    }
  } catch (error) {
    log.error('Failed to deploy commands:', error);
  }
})();
