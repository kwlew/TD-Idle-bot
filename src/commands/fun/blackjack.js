const { SlashCommandBuilder } = require('discord.js');
const { getBalance, addCoins, removeCoins, COIN } = require('../../persistence/economy');
const { getCachedVersion } = require('../../api/stats');
const { baseEmbed, COLORS } = require('../../bot/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of blackjack.'),

    async execute(interaction) {
        const embed = await baseEmbed(interaction, { color: COLORS.success })
            .setTitle(`${COIN} Blackjack`)
            .setDescription('This command is not yet implemented. Please check back later.');
        await interaction.reply({ embeds: [embed] });
    },
};