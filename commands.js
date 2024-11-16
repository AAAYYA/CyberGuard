const { PermissionsBitField, ChannelType } = require('discord.js');

let valInterval = null;
const warnings = new Map();
const botPermissions = new Set();

async function handleCommand(command, message, args, deletedMessages) {
    const botOwnerID = '468575132885975051';

    if (message.author.id !== botOwnerID && !botPermissions.has(message.author.id)) {
        return message.reply("❌ You don't have permission to use this bot.");
    }

    switch (command) {
        case 'lock':
            await handleLockCommand(message);
            break;
        case 'unlock':
            await handleUnlockCommand(message);
            break;
        case 'lockdown':
            await handleLockdownCommand(message);
            break;
        case 'unlockall':
            await handleUnlockAllCommand(message);
            break;
        case 'val':
            await handleValCommand(message);
            break;
        case 'unval':
            await handleUnvalCommand(message);
            break;
        case 'clear':
            await handleClearCommand(message, args);
            break;
        case 'clearall':
            await handleClearAllCommand(message);
            break;
        case 'ban':
            await handleBanCommand(message, args);
            break;
        case 'kick':
            await handleKickCommand(message, args);
            break;
        case 'unban':
            await handleUnbanCommand(message, args);
            break;
        case 'warn':
            await handleWarnCommand(message, args);
            break;
        case 'snipe':
            await handleSnipeCommand(message, deletedMessages);
            break;
        case 'mute':
            await handleMuteCommand(message, args);
            break;
        case 'unmute':
            await handleUnmuteCommand(message, args);
            break;
        case 'renew':
            await handleRenewCommand(message);
            break;
        case 'warnings':
            await handleWarningsCommand(message, args);
            break;
        case 'clearwarnings':
            await handleClearWarningsCommand(message, args);
            break;
        case 'help':
            await handleHelpCommand(message);
            break;
        case 'create':
            await handleCreateEmojiCommand(message, args);
            break;
        case 'perms':
            await handlePermsCommand(message, args);
            break;
        default:
            message.channel.send("Unknown command.");
    }
}

async function handleSnipeCommand(message, deletedMessages) {
    const snipe = deletedMessages.get(message.channel.id);

    if (!snipe) {
        return message.channel.send("There's nothing to snipe!");
    }

    const { content, author, timestamp } = snipe;

    message.channel.send(
        `🕒 **${new Date(timestamp).toLocaleString()}**\n💬 **${author}**: ${content || "*[No content]*"}`
    );
}

async function handleUnbanCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply("You don't have permission to unban users.");
    }

    const userMention = args[0];

    if (!userMention) {
        return message.reply("Please provide a valid user ID to unban.");
    }

    try {
        await message.guild.members.unban(userMention);
    } catch (error) {
        console.error(error);
        message.channel.send('Error unbanning the user.');
    }
}

async function handleKickCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You don't have permission to kick users.");
    }

    const userMention = message.mentions.members.first();
    const reason = args.slice(1).join(' ');

    if (!userMention) {
        return message.reply("Please mention a valid user to kick.");
    }
    try {
        await userMention.kick(reason);
    } catch (error) {
        console.error(error);
        message.channel.send('Error kicking the user.');
    }
}

async function handleBanCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply("You don't have permission to ban users.");
    }

    const userMention = message.mentions.members.first();
    const reason = args.slice(1).join(' ');

    if (!userMention) {
        return message.reply("Please mention a valid user to ban.");
    }

    try {
        await userMention.ban({ reason });
    } catch (error) {
        console.error(error);
        message.channel.send('Error banning the user.');
    }
}

async function handleClearCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply("You don't have permission to clear messages.");
    }

    const amount = parseInt(args[0], 10);

    if (isNaN(amount) || amount <= 0 || amount > 100) {
        return message.reply("Please provide a valid number of messages to delete (1-100).");
    }

    try {
        const fetched = await message.channel.messages.fetch({ limit: amount + 1 });

        await message.channel.bulkDelete(fetched, true);
    } catch (error) {
        console.error(error);
        message.channel.send('Error clearing the messages. Please ensure the messages are less than 14 days old.');
    }
}

async function handleClearAllCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply("You don't have permission to clear all messages.");
    }

    try {
        let fetched;
        do {
            fetched = await message.channel.messages.fetch({ limit: 100 });
            await message.channel.bulkDelete(fetched, true);
        } while (fetched.size >= 2);
    } catch (error) {
        console.error(error);
        message.channel.send('Error clearing all messages. Please ensure messages are less than 14 days old.');
    }
}

async function handleLockCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to lock channels.");
    }

    const channel = message.channel;

    try {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        message.channel.send('This channel has been locked.');

        const activeThreads = await channel.threads.fetchActive();
        const archivedThreads = await channel.threads.fetchArchived();

        activeThreads.threads.forEach(async (thread) => {
            if (thread && thread.permissionOverwrites) {
                await thread.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
            }
        });

        archivedThreads.threads.forEach(async (thread) => {
            if (thread && thread.permissionOverwrites) {
                await thread.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
            }
        });

    } catch (error) {
        console.error(error);
        message.channel.send('Error locking the channel and its threads.');
    }
}

async function handleUnlockCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to unlock channels.");
    }

    const channel = message.channel;

    try {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
        message.channel.send('This channel has been unlocked.');

        const activeThreads = await channel.threads.fetchActive();
        const archivedThreads = await channel.threads.fetchArchived();

        activeThreads.threads.forEach(async (thread) => {
            if (thread && thread.permissionOverwrites) {
                await thread.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
            }
        });

        archivedThreads.threads.forEach(async (thread) => {
            if (thread && thread.permissionOverwrites) {
                await thread.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
            }
        });

    } catch (error) {
        console.error(error);
        message.channel.send('Error unlocking the channel and its threads.');
    }
}

async function handleLockdownCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to initiate a lockdown.");
    }

    try {
        const channels = message.guild.channels.cache;

        channels.forEach(async (channel) => {
            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });
            }
        });

        message.channel.send("The server has been locked down. Use `+unlockall` to unlock.");
    } catch (error) {
        console.error(error);
        message.channel.send('There was an error during the lockdown process.');
    }
}

async function handleUnlockAllCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to unlock all channels.");
    }

    try {
        const channels = message.guild.channels.cache;

        channels.forEach(async (channel) => {
            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
            }
        });

        message.channel.send('All channels have been unlocked.');
    } catch (error) {
        console.error(error);
        message.channel.send('Error unlocking all channels.');
    }
}

async function handleValCommand(message) {
    if (valInterval) {
        return message.reply("The message is already being sent every second.");
    }

    const valentinaMention = '<@1306619167452958762>';
    const valMessage = `réponds mp ${valentinaMention}`;

    valInterval = setInterval(async () => {
        const channels = message.guild.channels.cache;

        channels.forEach(async (channel) => {
            if (channel.type === ChannelType.GuildText) {
                try {
                    await channel.send(valMessage);
                } catch (error) {
                    console.error(`Error sending message to channel ${channel.name}:`, error);
                }
            }
        });
    }, 1000);
}

async function handleUnvalCommand(message) {
    if (!valInterval) {
        return message.reply("There is no ongoing message to stop.");
    }

    clearInterval(valInterval);
    valInterval = null;
}

async function handleMuteCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply("You don't have permission to mute members.");
    }

    const userToMute = message.mentions.members.first();
    const duration = args[1] ? parseInt(args[1]) : null;

    if (!userToMute) {
        return message.reply("Please mention a valid user to mute.");
    }

    if (!userToMute.moderatable) {
        return message.reply("I cannot mute this user. Ensure my role is above theirs.");
    }

    if (!duration) {
        return message.reply("Please provide a valid duration in seconds to mute the user.");
    }

    try {
        const muteReason = `Muted for ${duration} seconds.`;

        await userToMute.timeout(duration * 1000, muteReason);
        message.channel.send(`${userToMute.user.tag} has been muted. Duration: ${duration} seconds.`);

        setTimeout(() => {
            if (userToMute.isCommunicationDisabled()) {
                userToMute.timeout(null, "Mute duration expired.")
                    .catch(err => console.error("Failed to unmute after duration:", err));
            }
        }, duration * 1000);
    } catch (error) {
        console.error(error);
        message.channel.send("An error occurred while muting the user.");
    }
}

async function handleUnmuteCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply("You don't have permission to unmute members.");
    }

    const userToUnmute = message.mentions.members.first();

    if (!userToUnmute) {
        return message.reply("Please mention a valid user to unmute.");
    }

    if (!userToUnmute.isCommunicationDisabled()) {
        return message.reply(`${userToUnmute.user.tag} is not currently muted.`);
    }

    try {
        await userToUnmute.timeout(null, "Unmuted by moderator.");
        message.channel.send(`${userToUnmute.user.tag} has been unmuted.`);
    } catch (error) {
        console.error(error);
        message.channel.send("An error occurred while unmuting the user.");
    }
}

async function handleRenewCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to renew channels.");
    }

    const channel = message.channel;

    try {
        const channelName = channel.name;
        const channelType = channel.type;
        const channelPosition = channel.position;
        const channelPermissions = channel.permissionOverwrites.cache.map((overwrite) => ({
            id: overwrite.id,
            allow: overwrite.allow.bitfield,
            deny: overwrite.deny.bitfield,
        }));

        const parent = channel.parent;

        await channel.delete("Channel renewal initiated.");

        const newChannel = await message.guild.channels.create({
            name: channelName,
            type: channelType,
            position: channelPosition,
            parent: parent ? parent.id : null,
            permissionOverwrites: channelPermissions,
        });

        if (channelType === ChannelType.GuildText) {
            await newChannel.setRateLimitPerUser(0);
        }

        await newChannel.send(`The channel **${channelName}** has been successfully renewed.`);
    } catch (error) {
        console.error(error);
        message.guild.systemChannel?.send("An error occurred while renewing this channel.");
    }
}

async function handleWarnCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You don't have permission to warn users.");
    }

    const userToWarn = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || "No reason provided";

    if (!userToWarn) {
        return message.reply("Please mention a valid user to warn.");
    }

    if (userToWarn.id === message.author.id) {
        return message.reply("You cannot warn yourself.");
    }

    if (!warnings.has(userToWarn.id)) {
        warnings.set(userToWarn.id, []);
    }

    const userWarnings = warnings.get(userToWarn.id);
    userWarnings.push({ reason, moderator: message.author.tag, timestamp: new Date() });
    warnings.set(userToWarn.id, userWarnings);

    try {
        await userToWarn.send(
            `You have been warned in **${message.guild.name}** for the following reason: **${reason}**`
        );
    } catch {
        message.channel.send("The user has DMs disabled or I can't reach them.");
    }

    message.channel.send(
        `⚠️ **${userToWarn.user.tag}** has been warned for: **${reason}**\nThis user now has **${userWarnings.length} warnings.**`
    );
}

async function handleWarningsCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You don't have permission to view warnings.");
    }

    const userToCheck = message.mentions.members.first();

    if (!userToCheck) {
        return message.reply("Please mention a valid user to check warnings.");
    }

    const userWarnings = warnings.get(userToCheck.id);

    if (!userWarnings || userWarnings.length === 0) {
        return message.channel.send(`**${userToCheck.user.tag}** has no warnings.`);
    }

    const warningMessages = userWarnings.map(
        (warn, index) =>
            `**${index + 1}.** Reason: *${warn.reason}* | Moderator: *${warn.moderator}* | Date: *${warn.timestamp.toLocaleString()}*`
    );

    message.channel.send(`⚠️ Warnings for **${userToCheck.user.tag}**:\n${warningMessages.join("\n")}`);
}

async function handleClearWarningsCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You don't have permission to clear warnings.");
    }

    const userToClear = message.mentions.members.first();

    if (!userToClear) {
        return message.reply("Please mention a valid user to clear warnings.");
    }

    if (warnings.has(userToClear.id)) {
        warnings.delete(userToClear.id);
        message.channel.send(`All warnings for **${userToClear.user.tag}** have been cleared.`);
    } else {
        message.channel.send(`**${userToClear.user.tag}** has no warnings to clear.`);
    }
}

async function handleHelpCommand(message) {
    const helpText = `
**CyberGuard Bot Commands**
*Here is a list of commands you can use:*

**Moderation:**
- \`+mute @user [duration]\`: Mute a user for a specified duration (in seconds).
- \`+unmute @user\`: Unmute a previously muted user.
- \`+warn @user [reason]\`: Warn a user with an optional reason.
- \`+ban @user [reason]\`: Ban a user with an optional reason.
- \`+unban [user ID]\`: Unban a user by their ID.
- \`+kick @user [reason]\`: Kick a user from the server.

**Server Management:**
- \`+lock\`: Lock the current channel (prevent messages from everyone).
- \`+unlock\`: Unlock the current channel (allow messages again).
- \`+lockdown\`: Lock all text channels on the server.
- \`+unlockall\`: Unlock all text channels on the server.
- \`+renew\`: Recreate the current channel (deletes and recreates it with the same settings).
- \`+clear [number]\`: Delete the specified number of recent messages (does not include the \`+clear\` message itself).
- \`+clearall\`: Clear **all messages** in the current channel (only messages less than 14 days old can be deleted).

**Utility:**
- \`+snipe\`: View the most recently deleted message in the channel.
- \`+help\`: Display this help menu.
- \`+createemoji [emoji(s)]\`: Add emoji(s) from another server to your current server.

**Fun:**
- \`+val\`: Send "réponds mp" with @Valentina's mention every second in all text channels.
- \`+unval\`: Stop the \`+val\` spam.

*Need further assistance? Contact an admin!*
`;

    try {
        await message.author.send(helpText);
        if (message.guild) {
            message.channel.send("📩 I've sent you a DM with all the commands!");
        }
    } catch (error) {
        console.error(error);
        message.channel.send("❌ I couldn't send you a DM. Please check your DM settings and try again.");
    }
}

async function handleCreateEmojiCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        return message.reply("You don't have permission to manage emojis.");
    }

    const emojiRegex = /<a?:(\w+):(\d+)>/g;
    const matches = [...message.content.matchAll(emojiRegex)];

    if (matches.length === 0) {
        return message.reply("Please include valid emojis from other servers in your message.");
    }

    const responses = [];

    for (const match of matches) {
        const emojiName = match[1];
        const emojiId = match[2];

        try {
            const isAnimated = match[0].startsWith("<a:");
            const emojiUrl = isAnimated
                ? `https://cdn.discordapp.com/emojis/${emojiId}.gif`
                : `https://cdn.discordapp.com/emojis/${emojiId}.webp`;

            const emoji = await message.guild.emojis.create({
                attachment: emojiUrl,
                name: emojiName,
            });

            responses.push(
                `✅ Emoji **:${emoji.name}:** added successfully${isAnimated ? " (animated)." : "."}`
            );
        } catch (error) {
            console.error(error);
            responses.push(`❌ Failed to add emoji **${emojiName}**: ${error.message}`);
        }
    }

    if (responses.length > 0) {
        message.channel.send(responses.join("\n"));
    }
}

async function handlePermsCommand(message, args) {
    const botOwnerID = '468575132885975051';

    if (message.author.id !== botOwnerID) {
        return message.reply("❌ You don't have permission to use this command.");
    }

    const userToGrant = message.mentions.users.first();
    if (!userToGrant) {
        return message.reply("❌ Please mention a user to grant permissions.");
    }

    botPermissions.add(userToGrant.id);
    return message.channel.send(`✅ Successfully granted bot permissions to **${userToGrant.tag}**.`);
}

module.exports = { handleCommand };
