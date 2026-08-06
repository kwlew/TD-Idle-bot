const { SlashCommandBuilder } = require("discord.js");
const { getCachedOnlineUsers } = require("../../utils/onlineUsers");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("online")
        .setDescription("Replies with the number of online users."),

    async execute(interaction) {
        await interaction.deferReply();
        const onlineUsers = await getCachedOnlineUsers();
        await interaction.editReply(`There are currently ${onlineUsers} users online.`);
    }
}