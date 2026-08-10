const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');
const { baseEmbed, COLORS } = require('../../bot/theme');
const { getPreferences, setPreferences, COIN, CURRENCY_NAME } = require('../../persistence/economy');
const log = require('../../utils/logger');

const NAME = 'settings';

// Every toggle the command shows, in display order. `key` is the preference key
// setPreferences understands, and it's also the tail of the button's custom ID —
// nothing outside this list can be toggled, so a hand-crafted ID goes nowhere.
const SETTINGS = [
    {
        key: 'payDm',
        label: 'Payment DMs',
        hint: 'DMs you when someone pays you.',
    },
    {
        key: 'dailyReminder',
        label: 'Daily reminder',
        hint: `DMs you when your daily ${CURRENCY_NAME} are ready to claim.`,
    },
    {
        key: 'workReminder',
        label: 'Work reminder',
        hint: 'DMs you when you can work again.',
    },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName(NAME)
        .setDescription('View and change your settings.'),

    async execute(interaction) {
        const preferences = await getPreferences(interaction.user.id);

        await interaction.reply({
            ...view(interaction, preferences),
            flags: MessageFlags.Ephemeral,
        });
    },

    // Button clicks land here via interactionCreate. The message is ephemeral,
    // so only the user who ran the command can press these in the first place.
    async handleComponent(interaction) {
        const [, action, key] = interaction.customId.split(':');
        const setting = SETTINGS.find(entry => entry.key === key);

        if (action !== 'toggle' || !setting) {
            log.warn(`Ignoring unexpected settings component: ${interaction.customId}`);
            return;
        }

        const current = await getPreferences(interaction.user.id);
        const preferences = await setPreferences(interaction.user.id, { [key]: !current[key] });

        log.info(`User ${interaction.user.tag} (${interaction.user.id}) set ${key} to ${preferences[key]}.`);

        // update() edits the message the button lives on, so the panel stays a
        // single ephemeral reply instead of stacking one per toggle.
        await interaction.update(view(interaction, preferences, setting));
    },
};

// The whole reply — embed plus buttons — rebuilt from the current preferences,
// so the panel and the saved state can't drift apart.
function view(interaction, preferences, changed = null) {
    return {
        embeds: [buildEmbed(interaction, preferences, changed)],
        components: [buildButtons(preferences)],
    };
}

function buildEmbed(interaction, preferences, changed) {
    const embed = baseEmbed(interaction, { color: changed ? COLORS.success : COLORS.brand })
        .setTitle(`${COIN} Your settings`)
        .setDescription(changed
            ? `Saved — **${changed.label}** is now ${preferences[changed.key] ? 'on' : 'off'}.`
            : 'Use the buttons below to turn these on or off.')
        .addFields(SETTINGS.map(setting => ({
            name: `${state(preferences[setting.key])} ${setting.label}`,
            value: setting.hint,
        })));

    // setFooter replaces the branded one baseEmbed put there, so carry its icon
    // across rather than losing it.
    embed.setFooter({
        text: 'All of these arrive as DMs — keep them open to this server.',
        iconURL: embed.data.footer?.icon_url,
    });

    return embed;
}

function buildButtons(preferences) {
    return new ActionRowBuilder().addComponents(SETTINGS.map(setting => {
        const enabled = preferences[setting.key];

        return new ButtonBuilder()
            .setCustomId(`${NAME}:toggle:${setting.key}`)
            .setLabel(setting.label)
            .setEmoji(enabled ? '✅' : '❌')
            .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary);
    }));
}

// Just the mark — each setting's button carries the same ✅/❌ and a matching
// colour, so spelling out "On"/"Off" here only made the field titles clumsy
// ("✅ On Payment DMs").
function state(enabled) {
    return enabled ? '✅' : '❌';
}
