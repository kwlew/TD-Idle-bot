const { SlashCommandBuilder } = require("discord.js");
const { baseEmbed, COLORS } = require("../../bot/theme");
const { formatDuration } = require("../../utils/format");
const { claimWork, COIN } = require("../../persistence/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("work")
        .setDescription("Work to earn coins. Can be done once per hour."),
    async execute(interaction) {
        const result = await claimWork(interaction.user.id);

        const embed = result.claimed
            ? baseEmbed(interaction, { color: COLORS.success })
                .setTitle(`${COIN} Work Coins`)
                .setDescription(`You worked and earned **${result.amount.toLocaleString()}** coins!`)
            : baseEmbed(interaction, { color: COLORS.warning })
                .setTitle(`${COIN} Work Coins`)
                .setDescription(`You've already worked today. Come back in **${formatDuration(result.remainingMs)}**.`);

        embed.addFields({ name: 'Balance', value: `${COIN} ${result.balance.toLocaleString()}`, inline: true });

        await interaction.reply({ embeds: [embed] });
    },
};