const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { COIN, CURRENCY_NAME } = require('../../persistence/economy');
const { getCachedVersion } = require('../../api/stats');
const { baseEmbed } = require('../../bot/theme');

const REPO_URL = 'https://github.com/kwlew/TD-Idle-bot';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with the bot.'),
    async execute(interaction) {
        await interaction.reply({ embeds: [await buildEmbed(interaction)], flags: MessageFlags.Ephemeral });
    }
}

async function buildEmbed(interaction) {
    const prerelease = await getCachedVersion('prerelease');

    const embed = baseEmbed(interaction)
        .setTitle('🆘 Help')
        .setDescription(`TD Idle is a Discord bot for the idle game TD Idle. Here's everything it can do:`)
        .addFields(
            {
                name: `${COIN} Economy`,
                value: `**/balance** — Check your (or someone else's) ${CURRENCY_NAME} balance.\n` +
                    `**/daily** — Claim your daily ${CURRENCY_NAME}.\n` +
                    `**/work** — Work to earn ${CURRENCY_NAME}. Once per hour.\n` +
                    `**/pay** — Pay another user some of your ${CURRENCY_NAME}.\n` +
                    `**/leaderboard** — See who's holding the most ${CURRENCY_NAME}.\n` +
                    `**/profile** — See your (or someone else's) balance, rank, and cooldowns.\n` +
                    `**/settings** — Turn payment and reminder DMs on or off.`,
            },
            {
                name: '🎲 Fun',
                value: `**/coinflip** — Bet ${CURRENCY_NAME} on a coin flip.\n` +
                    `**/slots** — Bet ${CURRENCY_NAME} on the slot machine.\n` +
                    `**/blackjack** — Play a game of blackjack.`,
            },
            {
                name: '📊 Game info',
                value: `**/stats** — Get the current stats of the game.\n` +
                    `**/version** — Get the current game version.`,
            },
            {
                name: '🤖 Bot',
                value: `**/bot** — Get information about the bot.\n` +
                    `**/site** — Get a link to the website.\n` +
                    `**/help** — Show this message.\n\n` +
                    `For more information, visit the [GitHub repository](${REPO_URL}).`,
            },
        );

    embed.setFooter({
        text: `TD Idle v${prerelease}`,
        iconURL: embed.data.footer?.icon_url,
    });

    return embed;
}
