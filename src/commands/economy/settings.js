const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { baseEmbed, COLORS } = require('../../bot/theme');
const { getPreferences, setPreferences, COIN, CURRENCY_NAME } = require('../../persistence/economy');
const log = require('../../utils/logger');

// Slash option name -> preference key. Discord option names have to be
// lowercase, so they stay kebab-case while the preference keys stay camelCase.
const OPTIONS = {
    'pay-dm': 'payDm',
    'daily-reminder': 'dailyReminder',
    'work-reminder': 'workReminder',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('View or change your settings. Run it with no options to see where you stand.')
        .addBooleanOption(option =>
            option.setName('pay-dm')
                .setDescription('DM me when someone pays me.')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('daily-reminder')
                .setDescription(`DM me when my daily ${CURRENCY_NAME} are ready to claim.`)
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('work-reminder')
                .setDescription('DM me when I can work again.')
                .setRequired(false)),

    async execute(interaction) {
        const changes = {};

        for (const [optionName, key] of Object.entries(OPTIONS)) {
            const value = interaction.options.getBoolean(optionName);
            if (value !== null) changes[key] = value; // null => option omitted, leave it alone
        }

        const changed = Object.keys(changes).length > 0;

        const preferences = changed
            ? await setPreferences(interaction.user.id, changes)
            : await getPreferences(interaction.user.id);

        if (changed) {
            log.info(`User ${interaction.user.tag} (${interaction.user.id}) updated settings: ${JSON.stringify(changes)}`);
        }

        await interaction.reply({
            embeds: [buildEmbed(interaction, preferences, changed)],
            flags: MessageFlags.Ephemeral,
        });
    },
};

function buildEmbed(interaction, preferences, changed) {
    const embed = baseEmbed(interaction, { color: changed ? COLORS.success : COLORS.brand })
        .setTitle(`${COIN} Your settings`)
        .setDescription(changed
            ? 'Saved.'
            : 'Set any of this command\'s options to change these.')
        .addFields(
            { name: 'Payment DMs', value: state(preferences.payDm), inline: true },
            { name: 'Daily reminder', value: state(preferences.dailyReminder), inline: true },
            { name: 'Work reminder', value: state(preferences.workReminder), inline: true },
        );

    // setFooter replaces the branded one baseEmbed put there, so carry its icon
    // across rather than losing it.
    embed.setFooter({
        text: 'All of these arrive as DMs — keep them open to this server.',
        iconURL: embed.data.footer?.icon_url,
    });

    return embed;
}

function state(enabled) {
    return enabled ? '✅ On' : '❌ Off';
}
