const { EmbedBuilder } = require('discord.js');

const COLORS = {
    brand: 0x38FF30,
    success: 0x38FF30,
    warning: 0xFFC93C,
    delay: 0xFA9B05,
    error: 0xFF4F4F,
};

const WEBSITE_URL = 'https://kwlew.dev';

// Base embed every command starts from, so footer/branding stay consistent
// without every command file repeating itself. Takes an interaction, or a bare
// client for embeds that aren't a reply to anything (the reminder DMs).
function baseEmbed(source, { color = COLORS.brand } = {}) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTimestamp();

    const client = source?.client ?? source;
    const icon = client?.user?.displayAvatarURL?.();
    if (icon) {
        embed.setFooter({ text: 'TD Idle', iconURL: icon });
    } else {
        embed.setFooter({ text: 'TD Idle' });
    }

    return embed;
}

function errorEmbed(message) {
    return new EmbedBuilder()
        .setColor(COLORS.error)
        .setDescription(`❌ ${message}`)
        .setTimestamp();
}

module.exports = { COLORS, WEBSITE_URL, baseEmbed, errorEmbed };
