const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../../bot/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),

    async execute(interaction) {
        // Send first, then edit in real numbers — the edit's round-trip time
        // is itself a decent proxy for latency, and it lets the message change
        // once the "real" values are known instead of being stale on arrival.
        const sent = await interaction.reply({
            embeds: [baseEmbed(interaction).setDescription('🏓 Pinging...')],
            fetchReply: true,
        });

        const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
        const wsPing = Math.round(interaction.client.ws.ping);

        await interaction.editReply({ embeds: [buildEmbed(interaction, roundTrip, wsPing)] });
    },
};

function speedIndicator(ms) {
    if (ms < 150) return { emoji: '🟢', color: COLORS.success };
    if (ms < 400) return { emoji: '🟡', color: COLORS.warning };
    return { emoji: '🔴', color: COLORS.error };
}

function buildEmbed(interaction, roundTrip, wsPing) {
    const { emoji, color } = speedIndicator(Math.max(roundTrip, wsPing));

    return baseEmbed(interaction, { color })
        .setTitle(`${emoji} Pong!`)
        .addFields(
            { name: 'Round-trip', value: `\`${roundTrip}ms\``, inline: true },
            { name: 'WebSocket', value: `\`${wsPing}ms\``, inline: true },
        );
}
