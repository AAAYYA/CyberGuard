const { PermissionsBitField, ChannelType } = require('discord.js');

let valInterval = null;

async function handleCommand(command, message, args) {
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
            await handleClearCommand(message);
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
            await handleSnipeCommand(message);
            break;
        case 'mute':
            await handleMuteCommand(message, args);
            break;
        default:
            message.channel.send("Unknown command.");
    }
}

async function handleSnipeCommand(message) {
    const snipeMessage = message.channel.lastMessage;
    if (!snipeMessage) {
        return message.channel.send("No message to snipe.");
    }

    const { author, content } = snipeMessage;
    message.channel.send(`Sniped message from ${author}: ${content}`);
}

async function handleWarnCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You don't have permission to warn users.");
    }

    const userMention = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!userMention) {
        return message.reply("Please mention a valid user to warn.");
    }

    try {
        await userMention.send(`You have been warned for the following reason: ${reason}`);
        message.channel.send(`User ${userMention} has been warned.`);
    } catch (error) {
        console.error(error);
        message.channel.send('Error warning the user or the user has DMs disabled.');
    }
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

async function handleClearCommand(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply("You don't have permission to clear messages.");
    }
    
    try {
        const fetched = await message.channel.messages.fetch({ limit: 100 });
        await message.channel.bulkDelete(fetched);
    } catch (error) {
        console.error(error);
        message.channel.send('Error clearing the messages.');
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

    const valentinaMention = '<@1221196916747141182>';
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

    try {
        const muteReason = duration ? `Muted for ${duration} seconds.` : "Muted indefinitely.";

        await userToMute.timeout(duration ? duration * 1000 : null, muteReason);
        message.channel.send(`${userToMute.user.tag} has been muted. ${duration ? `Duration: ${duration} seconds.` : ''}`);

        if (duration) {
            setTimeout(() => {
                if (userToMute.isCommunicationDisabled()) {
                    userToMute.timeout(null, "Mute duration expired.")
                        .catch(err => console.error("Failed to unmute after duration:", err));
                }
            }, duration * 1000);
        }
    } catch (error) {
        console.error(error);
        message.channel.send("An error occurred while muting the user.");
    }
}

module.exports = { handleCommand };
