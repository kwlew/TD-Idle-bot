require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
const foldersPath = path.join(__dirname, 'commands');

for (const folder of fs.readdirSync(foldersPath)) {
  const commandsPath = path.join(foldersPath, folder);
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(`[WARN] ${file} is missing "data" or "execute".`);
    }
  }
}

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`Deploying ${commands.length} commands…`);

    // GUILD (instant) — for development
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    // GLOBAL (slow) — for production
    // const data = await rest.put(
    //   Routes.applicationCommands(process.env.CLIENT_ID),
    //   { body: commands },
    // );

    console.log(`✅ Deployed ${data.length} commands.`);
  } catch (error) {
    console.error(error);
  }
})();