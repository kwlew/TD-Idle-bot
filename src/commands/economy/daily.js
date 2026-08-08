const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { claimDaily, COIN, CURRENCY_NAME, validUser } = require('../../persistence/economy');
const { baseEmbed, COLORS } = require('../../bot/theme');
const { formatDuration } = require('../../utils/format');
const log = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription(`Claim your daily ${CURRENCY_NAME}.`),

    async execute(interaction) {
        const result = await claimDaily(interaction.user.id);

        log.info(`User ${interaction.user.tag} (${interaction.user.id}) claimed daily ${CURRENCY_NAME}. Claimed: ${result.claimed}, RemainingMs: ${result.remainingMs}, Balance: ${result.balance}`);

        const embed = result.claimed
            ? baseEmbed(interaction, { color: COLORS.success })
                .setTitle(`${COIN} Daily ${CURRENCY_NAME}`)
                .setDescription(`You claimed **${result.amount.toLocaleString()}** ${CURRENCY_NAME}.`)
            : baseEmbed(interaction, { color: COLORS.delay })
                .setTitle(`${COIN} Daily ${CURRENCY_NAME}`)
                .setDescription(`You've already claimed today's ${CURRENCY_NAME}. Come back in **${formatDuration(result.remainingMs)}**.`);

        embed.addFields({ name: 'Balance', value: `${COIN} ${result.balance.toLocaleString()}`, inline: true });

        const flag = result.claimed ? MessageFlags.None : MessageFlags.Ephemeral;

        await interaction.reply({ embeds: [embed], flags: flag });
    },
};
