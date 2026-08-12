const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../bot/theme');
const { getLeaderboard, getRank, COIN, CURRENCY_NAME } = require('../../persistence/economy');
const log = require('../../utils/logger');

const DEFAULT_COUNT = 10;
const MAX_COUNT = 25;
const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription(`See who's holding the most ${CURRENCY_NAME}.`)
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription(`How many to show (default ${DEFAULT_COUNT}, max ${MAX_COUNT}).`)
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(MAX_COUNT)),

    async execute(interaction) {
        const count = interaction.options.getInteger('count') ?? DEFAULT_COUNT;
        const top = await getLeaderboard(count);

        const embed = baseEmbed(interaction).setTitle(`${COIN} Leaderboard`);

        if (top.length === 0) {
            embed.setDescription(`Nobody has any ${CURRENCY_NAME} yet — be the first with \`/daily\` or \`/work\`.`);
            await interaction.reply({ embeds: [embed] });
            return;
        }

        const rows = [];
        let selfInTop = false;

        // Sequential rather than Promise.all — one REST call per row, and
        // MAX_COUNT keeps this short enough that it isn't worth the burst.
        for (const [index, entry] of top.entries()) {
            if (entry.userId === interaction.user.id) selfInTop = true;
            rows.push(await formatRow(interaction, entry, index));
        }

        embed.setDescription(rows.join('\n'));

        if (!selfInTop) {
            const { rank, balance } = await getRank(interaction.user.id);
            embed.setFooter({
                text: `You're #${rank.toLocaleString()} with ${balance.toLocaleString()} ${CURRENCY_NAME}.`,
                iconURL: embed.data.footer?.icon_url,
            });
        }

        await interaction.reply({ embeds: [embed] });
    },
};

async function formatRow(interaction, entry, index) {
    const rank = MEDALS[index] ?? `**#${index + 1}**`;
    const isSelf = entry.userId === interaction.user.id;

    let name;
    try {
        const user = await interaction.client.users.fetch(entry.userId);
        name = user.username;
    } catch (error) {
        // Deleted account, or some other REST hiccup — keep the row instead
        // of dropping it, since the balance is still real.
        log.debug(`Could not resolve user ${entry.userId} for leaderboard: ${error.message}`);
        name = `Unknown user (${entry.userId})`;
    }

    const label = isSelf ? `**${name}** (you)` : name;
    return `${rank} ${label} — **${entry.balance.toLocaleString()}** ${CURRENCY_NAME}`;
}
