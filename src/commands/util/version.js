const { SlashCommandBuilder } = require('discord.js');
const { cacheVersion } = require('../../api/stats');
const { baseEmbed } = require('../../bot/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('version')
        .setDescription('Replies with the current game version.'),

    async execute(interaction) {
        await interaction.reply({ embeds: [await buildEmbed(interaction)] });
    }
}

async function buildEmbed(interaction) {
    const { stable, prerelease } = await cacheVersion();
    const embed = baseEmbed(interaction)
        .setTitle('📝 Current Game Version')
        .addFields(
            { name: 'Stable', value: `\`v${stable}\``, inline: true },
            { name: 'Prerelease', value: `\`v${prerelease}\``, inline: true },
        );
    embed.setFooter({
        text: `TD Idle v${prerelease}`,
        iconURL: embed.data.footer?.icon_url,
    });

    return embed;
}