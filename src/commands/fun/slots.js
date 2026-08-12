const { SlashCommandBuilder } = require('discord.js');
const { getBalance, addCoins, removeCoins, COIN } = require('../../persistence/economy');
const { getCachedVersion } = require('../../api/stats');
const { baseEmbed, COLORS } = require('../../bot/theme');

// Weight is out of 100, so it doubles as a percentage. Multiplier is the total
// payout (not net profit) for landing three of that symbol. Rarer symbols pay
// more, like a real slot machine — unlike /coinflip's fair 50/50, this one has
// a real house edge: only a full three-of-a-kind pays out at all.
const SYMBOLS = [
    { emoji: '🍒', weight: 40, multiplier: 2 },
    { emoji: '🍋', weight: 25, multiplier: 4 },
    { emoji: '🔔', weight: 18, multiplier: 8 },
    { emoji: '⭐', weight: 11, multiplier: 15 },
    { emoji: '💎', weight: 5, multiplier: 30 },
    { emoji: '7️⃣', weight: 1, multiplier: 100 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
const SPIN_DELAY_MS = 1200;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Bet coins on the slot machine.')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('How many coins to wager.')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        const bet = interaction.options.getInteger('bet', true);
        const userId = interaction.user.id;

        // Deduct up front — the DB-side WHERE balance >= amount check makes this
        // atomic even under concurrent requests, so nothing changes if it fails.
        if (!await removeCoins(userId, bet)) {
            const embed = baseEmbed(interaction, { color: COLORS.error })
                .setTitle(`${COIN} Slots`)
                .setDescription(`You don't have enough coins for that bet.\nYour balance: **${(await getBalance(userId)).toLocaleString()}** ${COIN}`);
            await interaction.reply({ embeds: [embed] });
            return;
        }

        await interaction.reply({
            embeds: [baseEmbed(interaction)
                .setTitle('🎰 Spinning...')
                .setDescription(`Betting **${bet.toLocaleString()}** ${COIN}\n\n❓ ❓ ❓`)],
        });

        await new Promise(resolve => setTimeout(resolve, SPIN_DELAY_MS));

        const reels = [spin(), spin(), spin()];
        const won = reels[0].emoji === reels[1].emoji && reels[1].emoji === reels[2].emoji;
        const payout = won ? bet * reels[0].multiplier : 0;
        const balance = won ? await addCoins(userId, payout) : await getBalance(userId);

        await interaction.editReply({ embeds: [await buildResultEmbed(interaction, { bet, reels, won, payout, balance })] });
    },
};

// Picks one symbol per reel, weighted the same way a physical reel strip
// would be — commons come up often, the jackpot symbol almost never does.
function spin() {
    const roll = Math.random() * TOTAL_WEIGHT;
    let cumulative = 0;

    for (const symbol of SYMBOLS) {
        cumulative += symbol.weight;
        if (roll < cumulative) return symbol;
    }

    return SYMBOLS[SYMBOLS.length - 1]; // float rounding safety net
}

async function buildResultEmbed(interaction, { bet, reels, won, payout, balance }) {
    const prerelease = await getCachedVersion('prerelease');
    const jackpot = won && reels[0].emoji === '7️⃣';
    const net = payout - bet;

    const embed = baseEmbed(interaction, { color: won ? COLORS.success : COLORS.error })
        .setTitle(jackpot ? '🎰 JACKPOT!' : won ? '🎰 You won!' : '🎰 You lost.')
        .setDescription(reels.map(reel => reel.emoji).join('   '))
        .addFields(
            { name: 'Bet', value: `${COIN} ${bet.toLocaleString()}`, inline: true },
            { name: won ? 'Multiplier' : 'Result', value: won ? `x${reels[0].multiplier}` : 'No match', inline: true },
            { name: won ? 'Winnings' : 'Lost', value: `${COIN} ${(won ? net : bet).toLocaleString()}`, inline: true },
            { name: 'Balance', value: `${COIN} ${balance.toLocaleString()}`, inline: false },
        );

    embed.setFooter({
        text: `TD Idle v${prerelease}`,
        iconURL: embed.data.footer?.icon_url,
    });

    return embed;
}
