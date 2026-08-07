const { SlashCommandBuilder } = require('discord.js');
const { getCachedStats, cacheVersion } = require('../../api/stats');
const { baseEmbed } = require('../../bot/theme');

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
        );

    let version = await cacheVersion();

    embed.setFooter({
        text: lastUpdated ? `TD Idle v${version} • Last updated` : 'TD Idle • No data fetched yet',
        iconURL: embed.data.footer?.icon_url,
    });

    if (lastUpdated) {
        embed.setTimestamp(lastUpdated);
    }

    return embed;
}
