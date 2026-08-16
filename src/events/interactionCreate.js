const { Events, MessageFlags } = require('discord.js');
const { errorEmbed } = require('../bot/theme');
const log = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                log.warn(`No command matching ${interaction.commandName}`);
                return;
            }

            await dispatch(interaction, interaction.commandName, () => command.execute(interaction));
            return;
        }

        if (interaction.isMessageComponent()) {
            // Custom IDs are namespaced `<command>:<whatever the command wants>`,
            // so the command that rendered a component is the one that handles
            // the click. Link buttons never get here — they don't fire events.
            const name = interaction.customId.split(':')[0];
            const command = interaction.client.commands.get(name);

            if (!command?.handleComponent) {
                log.warn(`No component handler for ${interaction.customId}`);
                return;
            }

            await dispatch(interaction, interaction.customId, () => command.handleComponent(interaction));
        }
    },
};

async function dispatch(interaction, label, run) {
    try {
        await run();
    } catch (error) {
        log.error(`Error handling ${label} for ${interaction.user.tag} (${interaction.user.id}):`, error);

        const payload = {
            embeds: [errorEmbed('There was an error while executing this command.')],
            flags: MessageFlags.Ephemeral,
        };

        // The interaction may already be dead (3s ack window, or an expired
        // 15-minute component token); don't let the error reply throw a second,
        // unhandled error.
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload);
            } else {
                await interaction.reply(payload);
            }
        } catch (replyError) {
            log.error('Failed to send error reply:', replyError);
        }
    }
}
