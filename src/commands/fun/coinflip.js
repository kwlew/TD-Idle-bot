const { SlashCommandBuilder } = require('discord.js');
const { getBalance, addCoins, removeCoins, COIN } = require('../../persistence/economy');
const { getCachedVersion } = require('../../api/stats');
const { baseEmbed, COLORS } = require('../../bot/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Bet coins on a coin flip.')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('How many coins to wager.')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Heads or tails.')
                .setRequired(true)
                .addChoices(
                    { name: 'Heads', value: 'heads' },
                    { name: 'Tails', value: 'tails' },
                )),

    async execute(interaction) {
        const bet = interaction.options.getInteger('bet', true);
        const choice = interaction.options.getString('choice', true);
        const userId = interaction.user.id;

        // Deduct up front — the DB-side WHERE balance >= amount check makes this
        // atomic even under concurrent requests, so nothing changes if it fails.
        if (!await removeCoins(userId, bet)) {
            const embed = baseEmbed(interaction, { color: COLORS.error })
                .setTitle(`${COIN} Coin Flip`)
                .setDescription(`You don't have enough coins for that bet.\nYour balance: **${(await getBalance(userId)).toLocaleString()}** ${COIN}`);
            await interaction.reply({ embeds: [embed] });
            return;
        }

        await interaction.reply({
            embeds: [baseEmbed(interaction).setTitle(`${COIN} Flipping...`).setDescription(`Betting **${bet.toLocaleString()}** ${COIN} on **${capitalize(choice)}**`)],
        });

        await new Promise(resolve => setTimeout(resolve, 1200));

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = result === choice;
        const balance = won ? await addCoins(userId, bet * 2) : await getBalance(userId);

        await interaction.editReply({ embeds: [await buildResultEmbed(interaction, { bet, choice, result, won, balance })] });
    },
};

async function buildResultEmbed(interaction, { bet, choice, result, won, balance }) {
    const prerelease = await getCachedVersion('prerelease');

    const embed = baseEmbed(interaction, { color: won ? COLORS.success : COLORS.error })
        .setTitle(won ? `${COIN} You won!` : `${COIN} You lost.`)
        .addFields(
            { name: 'Your call', value: capitalize(choice), inline: true },
            { name: 'Result', value: capitalize(result), inline: true },
            { name: won ? 'Winnings' : 'Lost', value: `${COIN} ${bet.toLocaleString()}`, inline: true },
            { name: 'Balance', value: `${COIN} ${balance.toLocaleString()}`, inline: false },
        );

    embed.setFooter({
        text: `TD Idle v${prerelease}`,
        iconURL: embed.data.footer?.icon_url,
    });

    return embed;
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
