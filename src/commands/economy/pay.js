const { SlashCommandBuilder } = require("discord.js");
const { baseEmbed, COLORS } = require("../../bot/theme");
const { pay, assertPositiveInteger, getBalance, COIN, CURRENCY_NAME } = require("../../persistence/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pay")
        .setDescription(`Pay another user some of your ${CURRENCY_NAME}.`)
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to pay")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("amount")
                .setDescription(`The amount of ${CURRENCY_NAME} to pay`)
                .setRequired(true)
        )
    ,
    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");

        if (user === null) {
            const embed = baseEmbed(interaction, { color: COLORS.error })
                .setTitle(`${COIN} Payment Error`)
                .setDescription("The user to pay could not be found.");
            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (user.bot) {
            const embed = baseEmbed(interaction, { color: COLORS.error })
                .setTitle(`${COIN} Payment Error`)
                .setDescription("You cannot pay a bot.");
            await interaction.reply({ embeds: [embed] });
            return;
        }

        // if (user.id === interaction.user.id) {
        //     const embed = await buildYouCannotPayYourselfEmbed(interaction);
        //     await interaction.reply({ embeds: [embed] });
        //     return;
        // }

        if (amount <= 0) {
            const embed = baseEmbed(interaction, { color: COLORS.error })
                .setTitle(`${COIN} Payment Error`)
                .setDescription(`The amount of ${CURRENCY_NAME} to pay must be a positive integer.`);
            await interaction.reply({ embeds: [embed] });
            return;
        }

        await assertPositiveInteger(await getBalance(interaction.user.id), 'pay');
        try {
            await pay(interaction.user.id, user.id, amount);
            await user.send({ embeds: [await buildYouGotPaidEmbed(interaction, interaction.user, amount)] }).catch(() => {
                // Ignore if the user has DMs disabled or blocked the bot
            });
            const embed = await buildEmbed(interaction, user, amount);
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            const errorEmbed = await buildErrorEmbed(interaction, user, amount);
            await interaction.reply({ embeds: [errorEmbed] });
        }
    },
};

async function buildYouGotPaidEmbed(interaction, user, amount) {
    const embed = baseEmbed(interaction, { color: COLORS.success })
        .setTitle(`${COIN} Payment Received`)
        .setDescription(`You have received **${amount.toLocaleString()}** ${CURRENCY_NAME} from **${user.username}**.`);
    return embed;
}

async function buildEmbed(interaction, user, amount) {
    const embed = baseEmbed(interaction, { color: COLORS.success })
        .setTitle(`${COIN} Payment`)
        .setDescription(`You have paid **${user.username}** **${amount.toLocaleString()}** ${CURRENCY_NAME}.`);
    return embed;
}

async function buildErrorEmbed(interaction, user, amount) {
    const embed = baseEmbed(interaction, { color: COLORS.error })
        .setTitle(`${COIN} Payment Error`)
        .setDescription(`Something went wrong while trying to pay **${user.username}** **${amount.toLocaleString()}** ${CURRENCY_NAME}. Please make sure you have enough ${CURRENCY_NAME} and try again.`);
    return embed;
}

async function buildYouCannotPayYourselfEmbed(interaction) {
    const embed = baseEmbed(interaction, { color: COLORS.error })
        .setTitle(`${COIN} Payment Error`)
        .setDescription(`You cannot pay yourself.`);
    return embed;
}