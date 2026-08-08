// Command that returns how many guilds the bot is in.
// How many members are in those guilds in total.
// And the ping as well.

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../../bot/theme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot')
    .setDescription('Returns information about the bot.'),
  async execute(interaction) {
        const sent = await interaction.reply({
            embeds: [baseEmbed(interaction).setDescription('🏓 Pinging...')],
            withResponse: true,
        });

        // withResponse gives back an InteractionCallbackResponse, not the
        // Message itself — the sent message lives at sent.resource.message.
        const roundTrip = sent.resource.message.createdTimestamp - interaction.createdTimestamp;
        const wsPing = Math.round(interaction.client.ws.ping);

        await interaction.editReply({ embeds: [buildEmbed(interaction, roundTrip, wsPing)] });
  }
};

function speedIndicator(ms) {
    if (ms < 150) return { emoji: '🟢', color: COLORS.success };
    if (ms < 400) return { emoji: '🟡', color: COLORS.warning };
    return { emoji: '🔴', color: COLORS.error };
}

function buildEmbed(interaction, roundTrip, wsPing) {
    const { emoji, color } = speedIndicator(Math.max(roundTrip, wsPing));

    const guilds = interaction.client.guilds.cache.size;
    const members = interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

    const embed = baseEmbed(interaction)
        .setTitle('📊 Bot stats')
        .addFields(
            { name: 'Guilds', value: `\`${guilds}\``, inline: true },
            { name: 'Members', value: `\`${members}\`\n`, inline: true },
            { name: 'Ping', value: `\`${roundTrip}ms\` (round trip)\n\`${wsPing}ms\` (WS)`, inline: true },
        )
        .setColor(color);
    return embed;
}

