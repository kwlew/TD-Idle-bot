const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../../bot/theme');
const { getCachedVersion } = require('../../api/stats');

const NAME = '8ball';
let answers = [
    "YES", "NO"
];


module.exports = {
    data: new SlashCommandBuilder()
        .setName(NAME)
        .setDescription(`Tells you yes or no.`),

    async execute(interaction) {
        let answer = answers[Math.floor(Math.random() * answers.length)];
        const embed = await buildResultEmbed(interaction, { answer });

        await interaction.reply({ embeds: [embed] });
    }
}

async function buildResultEmbed(interaction, { answer }) {
    const prerelease = await getCachedVersion('prerelease');

    const embed = baseEmbed(interaction, { color: answer === 'YES' ? COLORS.purple : COLORS.error })
        .setTitle(answer === 'YES' ? 'Yes' : 'No');

    embed.setFooter({
        text: `TD Idle v${prerelease}`,
        iconURL: embed.data.footer?.iconURL,
    });

    return embed;
}

