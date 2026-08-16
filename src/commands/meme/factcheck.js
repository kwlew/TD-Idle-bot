const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../../bot/theme');

// meme command.

module.exports = {
    data: new SlashCommandBuilder()
        .setName('factcheck')
        .setDescription('FACT CHECK!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check.')
                .setRequired(false)),
        
    async execute(interaction) {
        let target;
        if (interaction.options.getUser('user')) {
            target = interaction.options.getUser('user');
        }
        if (!target) {
            let isLiar = Math.random() > 0.1;
            let color = isLiar ? COLORS.error : COLORS.success;
            const embed = baseEmbed(interaction, { color: color })
                .setTitle('📝 FACT CHECK!')
                .setDescription(`**LIE**`);
            await interaction.reply({ embeds: [embed] });
            return;
        }
        if (target.id == 1528201797863473362) {
            const embed = baseEmbed(interaction, { color: COLORS.error })
                .setTitle('📝 FACT CHECK!')
                .setDescription(`**I DON'T LIE!1!!!**`);
            await interaction.reply({ embeds: [embed] });
            return;
        }
    }
}