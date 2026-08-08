const { SlashCommandBuilder } = require('discord.js');
const { claimDaily, COIN, CURRENCY_NAME, validUser } = require('../../persistence/economy');
const { baseEmbed, COLORS } = require('../../bot/theme');
const { formatDuration } = require('../../utils/format');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription(`Claim your daily ${CURRENCY_NAME}.`),

    async execute(interaction) {
        const result = await claimDaily(interaction.user.id);

        const embed = result.claimed
            ? baseEmbed(interaction, { color: COLORS.success })
                .setTitle(`${COIN} Daily ${CURRENCY_NAME}`)
                .setDescription(`You claimed **${result.amount.toLocaleString()}** ${CURRENCY_NAME}.`)
            : baseEmbed(interaction, { color: COLORS.warning })
                .setTitle(`${COIN} Daily ${CURRENCY_NAME}`)
                .setDescription(`You've already claimed today's ${CURRENCY_NAME}. Come back in **${formatDuration(result.remainingMs)}**.`);

        embed.addFields({ name: 'Balance', value: `${COIN} ${result.balance.toLocaleString()}`, inline: true });

        await interaction.reply({ embeds: [embed] });
    },
};
