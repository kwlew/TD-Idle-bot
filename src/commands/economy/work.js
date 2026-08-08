const { SlashCommandBuilder } = require("discord.js");
const { baseEmbed, COLORS } = require("../../bot/theme");
const { formatDuration } = require("../../utils/format");
const { claimWork, COIN, validUser, CURRENCY_NAME } = require("../../persistence/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("work")
        .setDescription(`Work to earn ${CURRENCY_NAME}. Can be done once per hour.`),
    async execute(interaction) {
        if (!validUser(interaction.user.bot)) {
            await interaction.reply({ content: 'Bots do not have wallets.', ephemeral: true });
            return;
        }
        const result = await claimWork(interaction.user.id);

        const embed = result.claimed
            ? baseEmbed(interaction, { color: COLORS.success })
                .setTitle(`${COIN} Work ${CURRENCY_NAME}`)
                .setDescription(`You worked and earned **${result.amount.toLocaleString()}** ${CURRENCY_NAME}!`)
            : baseEmbed(interaction, { color: COLORS.warning })
                .setTitle(`${COIN} Work ${CURRENCY_NAME}`)
                .setDescription(`You've already worked today. Come back in **${formatDuration(result.remainingMs)}**.`);

        embed.addFields({ name: 'Balance', value: `${COIN} ${result.balance.toLocaleString()}`, inline: true });

        await interaction.reply({ embeds: [embed] });
    },
};