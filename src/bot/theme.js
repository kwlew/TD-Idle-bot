const { EmbedBuilder } = require('discord.js');

const COLORS = {
    brand: 0x38FF30,
    success: 0x38FF30,
    warning: 0xFFC93C,
    delay: 0xFA9B05,
    error: 0xFF4F4F,
    purple: 0x9B59B6,
    pink: 0xFF69B4,
};

const WEBSITE_URL = 'https://kwlew.dev';
const GAME_SRC_URL = 'https://github.com/kwlew/TD-Idle/tree/main';

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

module.exports = { COLORS, WEBSITE_URL, GAME_SRC_URL, baseEmbed, errorEmbed };
