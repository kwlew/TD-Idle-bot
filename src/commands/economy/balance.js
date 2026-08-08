const { SlashCommandBuilder } = require('discord.js');
const { getBalance, COIN } = require('../../persistence/economy');
const { baseEmbed } = require('../../bot/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check your (or someone else's) coin balance.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check (defaults to you).')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        const balance = await getBalance(target.id);
        const isSelf = target.id === interaction.user.id;

        const embed = baseEmbed(interaction)
            .setTitle(`${COIN} Balance`)
            .setDescription(`${isSelf ? 'You have' : `**${target.username}** has`} **${balance.toLocaleString()}** coins.`);

        await interaction.reply({ embeds: [embed] });
    },
};
