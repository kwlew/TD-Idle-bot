const { SlashCommandBuilder } = require('discord.js');
const { claimDaily, COIN } = require('../../persistence/economy');
const { baseEmbed, COLORS } = require('../../bot/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily coins.'),

    async execute(interaction) {
        const result = await claimDaily(interaction.user.id);

        const embed = result.claimed
            ? baseEmbed(interaction, { color: COLORS.success })
                .setTitle(`${COIN} Daily Coins`)
                .setDescription(`You claimed **${result.amount.toLocaleString()}** coins!`)
            : baseEmbed(interaction, { color: COLORS.warning })
                .setTitle(`${COIN} Daily Coins`)
                .setDescription(`You've already claimed today's coins. Come back in **${formatDuration(result.remainingMs)}**.`);

        embed.addFields({ name: 'Balance', value: `${COIN} ${result.balance.toLocaleString()}`, inline: true });

        await interaction.reply({ embeds: [embed] });
    },
};

function formatDuration(ms) {
    const totalMinutes = Math.ceil(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
