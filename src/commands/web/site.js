const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed, WEBSITE_URL } = require('../../bot/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('site')
        .setDescription('Replies with the link to the website.'),

    async execute(interaction) {
        const embed = baseEmbed(interaction)
            .setTitle('🌐 TD Idle')
            .setDescription(`Visit the website: **[${WEBSITE_URL.replace(/^https?:\/\//, '')}](${WEBSITE_URL})**`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Open Website')
                .setStyle(ButtonStyle.Link)
                .setURL(WEBSITE_URL)
                .setEmoji('🔗'),
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
}
