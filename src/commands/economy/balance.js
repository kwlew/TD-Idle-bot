const { SlashCommandBuilder } = require('discord.js');
const { getBalance, COIN, CURRENCY_NAME, CURRENCY_NAME_SINGULAR, validUser } = require('../../persistence/economy');
const { baseEmbed, COLORS } = require('../../bot/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription(`Check your (or someone else's) ${CURRENCY_NAME_SINGULAR} balance.`)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check (defaults to you).')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        if (!validUser(target.bot)) {
            const embed = baseEmbed(interaction, { color: COLORS.error })
                .setTitle(`${COIN} Error`)
                .setDescription('Bots do not have wallets.');
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        const balance = await getBalance(target.id);
        const isSelf = target.id === interaction.user.id;

        const embed = baseEmbed(interaction)
            .setTitle(`${COIN} Balance`)
            .setDescription(`${isSelf ? 'You have' : `**${target.username}** has`} **${balance.toLocaleString()}** ${CURRENCY_NAME}.`)
            .setFooter({
                text: isSelf ? messages[Math.floor(Math.random() * messages.length)] : `${target.username}'s balance`,
                iconURL: isSelf ? null : target.displayAvatarURL()
            })

        await interaction.reply({ embeds: [embed] });
    },
};

let messages = [
    'You can earn more by using the /work command!',
    'You can earn more by using the /daily command!'
]