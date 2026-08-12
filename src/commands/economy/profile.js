const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { baseEmbed, COLORS } = require('../../bot/theme');
const { getProfile, getRank, COIN, CURRENCY_NAME, validUser } = require('../../persistence/economy');
const { formatDuration } = require('../../utils/format');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription("Check your (or someone else's) profile.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check (defaults to you).')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;

        if (!validUser(target.bot)) {
            const embed = baseEmbed(interaction, { color: COLORS.error })
                .setTitle(`${COIN} Error`)
                .setDescription('Bots do not have profiles.');
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        const isSelf = target.id === interaction.user.id;
        const [profile, { rank }] = await Promise.all([
            getProfile(target.id),
            getRank(target.id),
        ]);

        const embed = baseEmbed(interaction)
            .setTitle(`${COIN} ${isSelf ? 'Your' : `${target.username}'s`} profile`)
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                // Discord packs up to 3 inline fields per row before wrapping,
                // so 4 separate ones would leave a single field stranded alone
                // on its own row. Pairing them into 2 fields sidesteps that.
                {
                    name: 'Economy',
                    value: `${COIN} **${profile.balance.toLocaleString()}** ${CURRENCY_NAME}\n#${rank.toLocaleString()} on the leaderboard`,
                    inline: true,
                },
                {
                    name: 'Cooldowns',
                    value: `Daily: ${cooldownText(profile.daily)}\nWork: ${cooldownText(profile.work)}`,
                    inline: true,
                },
            );

        // Preferences are only shown for your own profile — they're not
        // something a bystander looking someone else up needs to see.
        if (isSelf) {
            embed.addFields({
                name: 'Settings',
                value: `${mark(profile.preferences.payDm)} Payment DMs\n` +
                    `${mark(profile.preferences.dailyReminder)} Daily reminder\n` +
                    `${mark(profile.preferences.workReminder)} Work reminder`,
            });
            embed.setFooter({
                text: 'Change these any time with /settings.',
                iconURL: embed.data.footer?.icon_url,
            });
        }

        await interaction.reply({ embeds: [embed] });
    },
};

function cooldownText(status) {
    return status.ready ? '✅ Ready' : `⏳ ${formatDuration(status.remainingMs)}`;
}

function mark(enabled) {
    return enabled ? '✅' : '❌';
}
