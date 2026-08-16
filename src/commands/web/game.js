const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed, WEBSITE_URL, GAME_SRC_URL, COLORS } = require('../../bot/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('game')
        .setDescription('Replies with info about the game.'),

    async execute(interaction) {
        const embed = baseEmbed(interaction, { color: COLORS.purple })
            .setTitle('🎮 TD Idle')
            .setDescription(`Visit the website: **[${WEBSITE_URL.replace(/^https?:\/\//, '')}](${WEBSITE_URL})**`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('View Source Code')
                .setStyle(ButtonStyle.Link)
                .setURL(GAME_SRC_URL)
                .setEmoji('🔗'),
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
}