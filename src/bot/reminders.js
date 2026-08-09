const { baseEmbed, COLORS } = require('./theme');
const { claimDueReminders, COIN, CURRENCY_NAME } = require('../persistence/economy');
const log = require('../utils/logger');

let reminderTimer = null;

function buildEmbed(client, { daily, work }) {
    const lines = [];

    if (daily) lines.push(`\`/daily\` — your daily ${CURRENCY_NAME} are ready to claim.`);
    if (work) lines.push('`/work` — you can work again.');

    const embed = baseEmbed(client, { color: COLORS.brand })
        .setTitle(`${COIN} Reminder`)
        .setDescription(lines.join('\n'));

    embed.setFooter({
        text: 'Turn this off any time with /settings.',
        iconURL: embed.data.footer?.icon_url,
    });

    return embed;
}

// One pass over everyone who's due. The RPC marks them reminded as it hands
// them over, so a user who blocked the bot or closed their DMs costs us one
// failed send rather than a retry every minute forever.
async function sweep(client) {
    let due;

    try {
        due = await claimDueReminders();
    } catch (error) {
        log.error('Reminder sweep failed:', error);
        return;
    }

    if (due.length === 0) return;

    let sent = 0;

    for (const entry of due) {
        try {
            const user = await client.users.fetch(entry.userId);
            await user.send({ embeds: [buildEmbed(client, entry)] });
            sent++;
            log.debug(`Reminded ${user.tag} (daily: ${entry.daily}, work: ${entry.work}).`);
        } catch (error) {
            log.debug(`Could not DM a reminder to ${entry.userId}: ${error.message}`);
        }
    }

    log.info(`Reminder sweep: ${sent}/${due.length} DM${due.length === 1 ? '' : 's'} delivered.`);
}

// Self-rescheduling rather than setInterval so a slow sweep (lots of DMs, each
// one a rate-limited API call) can't have a second one starting on top of it.
function startReminders(client, interval) {
    stopReminders();

    const tick = async () => {
        await sweep(client);
        reminderTimer = setTimeout(tick, interval * 1000);
    };

    reminderTimer = setTimeout(tick, interval * 1000);
}

function stopReminders() {
    if (reminderTimer) {
        clearTimeout(reminderTimer);
        reminderTimer = null;
    }
}

module.exports = { startReminders, stopReminders };
