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
            await handleLockdownCommand(message, args);
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
        case 'temp':
            await handleTempCommand(message, args);
            break;
        default:
            message.channel.send("Unknown command.");
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

        message.channel.send('All threads in this channel have been locked.');
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

        message.channel.send('All threads in this channel have been unlocked.');
    } catch (error) {
        console.error(error);
        message.channel.send('Error unlocking the channel and its threads.');
    }
}

async function handleLockdownCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to initiate a lockdown.");
    }

    if (!args[0] || isNaN(parseInt(args[0]))) {
        return message.reply("Please provide a valid time duration in seconds for the lockdown (e.g., +lockdown 60).");
    }

    const duration = parseInt(args[0]);

    try {
        const channels = message.guild.channels.cache;
        channels.forEach(async (channel) => {
            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });
            }
        });

        message.channel.send(`The server has been locked down for ${duration} seconds.`);

        setTimeout(async () => {
            channels.forEach(async (channel) => {
                if (channel.type === ChannelType.GuildText) {
                    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                        SendMessages: true
                    });
                }
            });
            message.channel.send("Lockdown lifted, all channels have been unlocked.");
        }, duration * 1000);
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

async function handleTempCommand(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply("You don't have permission to use this command.");
    }

    const userMention = message.mentions.members.first();
    const duration = parseInt(args[1]);

    if (!userMention || isNaN(duration)) {
        return message.reply("Please mention a valid user and time in seconds (e.g. +temp @user 60).");
    }

    try {
        const channels = message.guild.channels.cache;

        channels.forEach(async (channel) => {
            if (channel.type === ChannelType.GuildText && channel.permissionOverwrites) {
                await channel.permissionOverwrites.edit(userMention, { SendMessages: false });
            }
        });

        setTimeout(async () => {
            channels.forEach(async (channel) => {
                if (channel.type === ChannelType.GuildText && channel.permissionOverwrites) {
                    await channel.permissionOverwrites.edit(userMention, { SendMessages: true });
                }
            });
        }, duration * 1000);
    } catch (error) {
        console.error(error);
        message.channel.send('Error applying the temporary restriction.');
    }
}

module.exports = { handleCommand };
