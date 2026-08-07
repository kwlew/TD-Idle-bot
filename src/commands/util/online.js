const { SlashCommandBuilder } = require("discord.js");
const { getCachedOnlineUsers } = require("../../api/stats");
const { baseEmbed } = require("../../bot/theme");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("online")
        .setDescription("Replies with the number of online users."),

    async execute(interaction) {
        const onlineUsers = getCachedOnlineUsers();

        const embed = baseEmbed(interaction)
            .setTitle('👥 Online Now')
            .setDescription(`**${onlineUsers.toLocaleString()}** ${onlineUsers === 1 ? 'user is' : 'users are'} currently playing TD Idle.`);

        await interaction.reply({ embeds: [embed] });
    }
}
