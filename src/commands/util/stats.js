const { SlashCommandBuilder } = require('discord.js');
const { getCachedStats, getCachedVersion } = require('../../api/stats');
const { baseEmbed } = require('../../bot/theme');
const { getTotalCoinsInCirculation, COIN, CURRENCY_NAME } = require('../../persistence/economy');
const log = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Replies with the current stats.'),

    async execute(interaction) {
        await interaction.reply({ embeds: [await buildEmbed(interaction)] });
    }
}

async function buildEmbed(interaction) {
    const { stars, golden, onlineUsers, lastUpdated } = getCachedStats();

    const embed = baseEmbed(interaction)
        .setTitle('📊 Current Stats')
        .addFields(
            { name: '⭐ Stars popped', value: `\`${stars.toLocaleString()}\``, inline: true },
            { name: '🌟 Golden stars popped', value: `\`${golden.toLocaleString()}\``, inline: true },
            { name: '👥 Online users', value: `\`${onlineUsers.toLocaleString()}\``, inline: true },
            { name: `${COIN} Total ${CURRENCY_NAME}`, value: `\`${await totalCoins()}\``, inline: true },
        );

    let version = await getCachedVersion("prerelease");

    embed.setFooter({
        text: lastUpdated ? `TD Idle v${version} • Last updated` : 'TD Idle • No data fetched yet',
        iconURL: embed.data.footer?.icon_url,
    });

    if (lastUpdated) {
        embed.setTimestamp(lastUpdated);
    }

    return embed;
}

// Every other number here comes from the game API, so an unreachable database
// shouldn't take the whole embed down with it — drop to a placeholder instead.
async function totalCoins() {
    try {
        return (await getTotalCoinsInCirculation()).toLocaleString();
    } catch (error) {
        log.error('Could not read the total balance for /stats:', error);
        return 'unknown';
    }
}
