const { Events, MessageFlags } = require('discord.js');
const { errorEmbed } = require('../bot/theme');

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);

            const payload = {
                embeds: [errorEmbed('There was an error while executing this command.')],
                flags: MessageFlags.Ephemeral,
            };

            // The interaction may already be dead (3s ack window); don't let the
            // error reply throw a second, unhandled error.
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(payload);
                } else {
                    await interaction.reply(payload);
                }
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    },
};