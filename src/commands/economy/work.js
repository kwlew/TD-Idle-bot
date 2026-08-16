const { SlashCommandBuilder, MessageFlags, InteractionContextType } = require("discord.js");
const { baseEmbed, COLORS } = require("../../bot/theme");
const { formatDuration } = require("../../utils/format");
const { claimWork, COIN, validUser, CURRENCY_NAME } = require("../../persistence/economy");
const log = require("../../utils/logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("work")
        .setDescription(`Work to earn ${CURRENCY_NAME}. Can be done once per hour.`)
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
    async execute(interaction) {
        if (!validUser(interaction.user.bot)) {
            await interaction.reply({ content: 'Bots do not have wallets.', flags: MessageFlags.Ephemeral });
            return;
        }
        const result = await claimWork(interaction.user.id);

        log.info(`User ${interaction.user.tag} (${interaction.user.id}) worked and earned ${result.amount} ${CURRENCY_NAME}. Claimed: ${result.claimed}, RemainingMs: ${result.remainingMs}, Balance: ${result.balance}`);

        const embed = result.claimed
            ? baseEmbed(interaction, { color: COLORS.success })
                .setTitle(`${COIN} Work ${CURRENCY_NAME}`)
                .setDescription(`You worked and earned **${result.amount.toLocaleString()}** ${CURRENCY_NAME}!`)
            : baseEmbed(interaction, { color: COLORS.delay })
                .setTitle(`${COIN} Work ${CURRENCY_NAME}`)
                .setDescription(`You've already worked today. Come back in **${formatDuration(result.remainingMs)}**.`);

        embed.addFields({ name: 'Balance', value: `${COIN} ${result.balance.toLocaleString()}`, inline: true });
        const flag = result.claimed ? MessageFlags.None : MessageFlags.Ephemeral;

        await interaction.reply({ embeds: [embed], flags: flag });
    },
};