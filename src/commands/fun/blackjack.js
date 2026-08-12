const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');
const { getBalance, addCoins, removeCoins, COIN } = require('../../persistence/economy');
const { baseEmbed, COLORS } = require('../../bot/theme');
const log = require('../../utils/logger');

const NAME = 'blackjack';
const DEALER_STANDS_AT = 17;
const WIN_PAYOUT = 2;          // even money, same doubling scheme as /coinflip
const BLACKJACK_PAYOUT = 2.5;  // 3:2
const INACTIVITY_MS = 2 * 60 * 1000;

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['♠', '♥', '♦', '♣'];

const OUTCOME_META = {
    blackjack: { title: 'Blackjack!', color: COLORS.success },
    win: { title: 'You won!', color: COLORS.success },
    push: { title: 'Push.', color: COLORS.brand },
    loss: { title: 'You lost.', color: COLORS.error },
    bust: { title: 'You busted.', color: COLORS.error },
};

// One hand per user at a time, keyed by user ID rather than message ID — a
// bystander clicking Hit/Stand on someone else's game just finds nothing
// under their own ID, so no extra ownership check is needed on top of this.
// In-memory only: a restart mid-hand would otherwise strand the bet, which is
// why index.js calls refundActiveGames() during shutdown.
const games = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName(NAME)
        .setDescription('Play a game of blackjack.')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('How many coins to wager.')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        const bet = interaction.options.getInteger('bet', true);
        const userId = interaction.user.id;

        if (games.has(userId)) {
            const embed = baseEmbed(interaction, { color: COLORS.error })
                .setTitle(`${COIN} Blackjack`)
                .setDescription('Finish your current game before starting another.');
            await interaction.reply({ embeds: [embed] });
            return;
        }

        // Deduct up front — the DB-side WHERE balance >= amount check makes this
        // atomic even under concurrent requests, so nothing changes if it fails.
        if (!await removeCoins(userId, bet)) {
            const embed = baseEmbed(interaction, { color: COLORS.error })
                .setTitle(`${COIN} Blackjack`)
                .setDescription(`You don't have enough coins for that bet.\nYour balance: **${(await getBalance(userId)).toLocaleString()}** ${COIN}`);
            await interaction.reply({ embeds: [embed] });
            return;
        }

        const deck = createDeck();
        const game = {
            bet,
            deck,
            player: [draw(deck), draw(deck)],
            dealer: [draw(deck), draw(deck)],
            timer: null,
            message: null,
        };

        const playerNatural = value(game.player) === 21;
        const dealerNatural = value(game.dealer) === 21;

        // A natural resolves on the deal — no buttons, nothing to track.
        if (playerNatural || dealerNatural) {
            const outcome = playerNatural && dealerNatural ? 'push' : playerNatural ? 'blackjack' : 'loss';
            await interaction.reply({ embeds: [await settle(interaction, userId, game, outcome)] });
            return;
        }

        const sent = await interaction.reply({
            embeds: [buildEmbed(interaction, game)],
            components: [buildButtons()],
            withResponse: true,
        });

        games.set(userId, game);
        arm(userId, game, sent.resource.message);
    },

    async handleComponent(interaction) {
        const userId = interaction.user.id;
        const game = games.get(userId);

        if (!game) {
            await interaction.reply({
                embeds: [baseEmbed(interaction, { color: COLORS.error })
                    .setTitle(`${COIN} Blackjack`)
                    .setDescription("You don't have an active blackjack game.")],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const [, action] = interaction.customId.split(':');

        if (action === 'hit') {
            game.player.push(draw(game.deck));

            if (value(game.player) > 21) {
                clearTimeout(game.timer);
                await interaction.update({ embeds: [await settle(interaction, userId, game, 'bust')], components: [] });
                return;
            }

            await interaction.update({ embeds: [buildEmbed(interaction, game)], components: [buildButtons()] });
            arm(userId, game, interaction.message);
            return;
        }

        if (action === 'stand') {
            clearTimeout(game.timer);
            playDealer(game);
            await interaction.update({ embeds: [await settle(interaction, userId, game, outcomeForFinishedHand(game))], components: [] });
            return;
        }

        log.warn(`Ignoring unexpected blackjack component: ${interaction.customId}`);
    },
};

// Called from index.js's shutdown hook so a restart (pm2 restart, a deploy)
// doesn't strand anyone's bet — games only live in memory, so anything still
// open when the process exits would otherwise just vanish along with it.
async function refundActiveGames() {
    for (const [userId, game] of games) {
        clearTimeout(game.timer);
        games.delete(userId);

        try {
            await addCoins(userId, game.bet);
            log.info(`Refunded ${game.bet} to ${userId} for a blackjack hand interrupted by shutdown.`);
        } catch (error) {
            log.error(`Failed to refund blackjack bet for ${userId} on shutdown:`, error);
        }
    }
}

module.exports.refundActiveGames = refundActiveGames;

// (Re)schedules the inactivity timeout and remembers the message to edit if
// it fires. Called after every non-terminal move, so a player who's still
// hitting keeps getting the full window rather than a fixed deadline.
function arm(userId, game, message) {
    clearTimeout(game.timer);
    game.message = message;

    game.timer = setTimeout(async () => {
        const current = games.get(userId);
        if (!current || !current.message) return;

        playDealer(current);
        const embed = await settle(current.message, userId, current, outcomeForFinishedHand(current));

        await current.message.edit({ embeds: [embed], components: [] }).catch(error => {
            log.debug(`Could not edit expired blackjack game for ${userId}: ${error.message}`);
        });
    }, INACTIVITY_MS);
}

function outcomeForFinishedHand(game) {
    const playerTotal = value(game.player);
    const dealerTotal = value(game.dealer);

    if (dealerTotal > 21 || playerTotal > dealerTotal) return 'win';
    if (playerTotal < dealerTotal) return 'loss';
    return 'push';
}

function payout(bet, outcome) {
    switch (outcome) {
        case 'blackjack': return Math.floor(bet * BLACKJACK_PAYOUT);
        case 'win': return bet * WIN_PAYOUT;
        case 'push': return bet;
        default: return 0; // 'loss' or 'bust' — the up-front deduction stands
    }
}

// Pays out, removes the hand from `games`, and builds the result embed.
// `source` just needs a `.client` (an interaction or a Message both qualify)
// since this is also called from the inactivity timer, which has no interaction.
async function settle(source, userId, game, outcome) {
    games.delete(userId);

    const paid = payout(game.bet, outcome);
    const balance = paid > 0 ? await addCoins(userId, paid) : await getBalance(userId);

    return buildResultEmbed(source, game, outcome, paid, balance);
}

function buildEmbed(interaction, game) {
    const embed = baseEmbed(interaction)
        .setTitle(`${COIN} Blackjack`)
        .addFields(
            { name: `Your hand (${value(game.player)})`, value: formatHand(game.player), inline: false },
            { name: 'Dealer shows', value: `${formatCard(game.dealer[0])}  🂠`, inline: false },
        );

    embed.setFooter({
        text: `Bet: ${game.bet.toLocaleString()} ${COIN}`,
        iconURL: embed.data.footer?.icon_url,
    });

    return embed;
}

function buildResultEmbed(source, game, outcome, paid, balance) {
    const meta = OUTCOME_META[outcome];
    const net = paid - game.bet;

    const embed = baseEmbed(source, { color: meta.color })
        .setTitle(`${COIN} ${meta.title}`)
        .addFields(
            { name: `Your hand (${value(game.player)})`, value: formatHand(game.player), inline: false },
            { name: `Dealer (${value(game.dealer)})`, value: formatHand(game.dealer), inline: false },
            {
                name: net > 0 ? 'Winnings' : net < 0 ? 'Lost' : 'Result',
                value: net === 0 ? 'Bet returned.' : `${COIN} ${Math.abs(net).toLocaleString()}`,
                inline: true,
            },
            { name: 'Balance', value: `${COIN} ${balance.toLocaleString()}`, inline: true },
        );

    embed.setFooter({
        text: `Bet: ${game.bet.toLocaleString()} ${COIN}`,
        iconURL: embed.data.footer?.icon_url,
    });

    return embed;
}

function buildButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`${NAME}:hit`).setLabel('Hit').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`${NAME}:stand`).setLabel('Stand').setStyle(ButtonStyle.Secondary),
    );
}

function createDeck() {
    const deck = [];

    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit });
        }
    }

    return shuffle(deck);
}

function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

function draw(deck) {
    return deck.pop();
}

function playDealer(game) {
    while (value(game.dealer) < DEALER_STANDS_AT) {
        game.dealer.push(draw(game.deck));
    }
}

// Soft-ace-aware total: aces count as 11 unless that would bust the hand, in
// which case they drop to 1 one at a time until it doesn't (or they run out).
function value(hand) {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
        if (card.rank === 'A') {
            total += 11;
            aces++;
        } else if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
            total += 10;
        } else {
            total += Number(card.rank);
        }
    }

    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return total;
}

function formatCard(card) {
    return `${card.rank}${card.suit}`;
}

function formatHand(hand) {
    return hand.map(formatCard).join('  ');
}
