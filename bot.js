global.ReadableStream = global.ReadableStream || require('stream/web').ReadableStream;
const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates // Needed for handling voice channels
    ]
});

let valInterval = null;

// Bot login (replace 'YOUR_BOT_TOKEN_HERE' with your actual bot token)
client.login('MTI4NzE0MzYxNDc0NDM2NzIzNA.Gn0hOS.Bip5X3P2CaaFGKX71-1XzkHkb1CAx1jAPc6WuY');

// Bot ready event
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Command handler
client.on('messageCreate', async (message) => {
    // Ignore messages from bots or messages without the prefix
    if (message.author.bot || !message.content.startsWith('+')) return;

    // Split message content into command and args
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Command execution
    if (command === 'lock') {
        await handleLockCommand(message);
    } else if (command === 'unlock') {
        await handleUnlockCommand(message);
    } else if (command === 'lockall') {
        await handleLockAllCommand(message);
    } else if (command === 'unlockall') {
        await handleUnlockAllCommand(message);
    } else if (command === 'val') {
        await handleValCommand(message);
    } else if (command === 'unval') {
        await handleUnvalCommand(message);
    } else if (command === 'clear') {
        await handleClearCommand(message);
    }
});

// Function to handle the +clear command (deletes up to 100 messages in the channel)
async function handleClearCommand(message) {
    // Check if the user has the right permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply("You don't have permission to clear messages.");
    }

    // Get the current channel
    const channel = message.channel;

    // Try to bulk delete the messages
    try {
        const fetched = await channel.messages.fetch({ limit: 100 });
        await channel.bulkDelete(fetched);
    } catch (error) {
        console.error(error);
        message.channel.send('There was an error clearing the messages.');
    }
}

// Function to handle the +lock command (includes threads)
async function handleLockCommand(message) {
    // Check if the user has the right permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to lock channels.");
    }

    // Get the current channel
    const channel = message.channel;

    // Lock the current channel
    try {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
            SendMessages: false
        });
        message.channel.send('This channel has been locked.');

        // Fetch active and archived threads in the current channel
        const activeThreads = await channel.threads.fetchActive();
        const archivedThreads = await channel.threads.fetchArchived();

        // Lock all active threads
        activeThreads.threads.forEach(async (thread) => {
            if (thread && thread.permissionOverwrites) {
                await thread.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });
            }
        });

        // Lock all archived threads
        archivedThreads.threads.forEach(async (thread) => {
            if (thread && thread.permissionOverwrites) {
                await thread.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });
            }
        });

        message.channel.send('All threads in this channel have been locked.');
    } catch (error) {
        console.error(error);
        message.channel.send('There was an error locking the channel and its threads.');
    }
}

// Function to handle the +unlock command
async function handleUnlockCommand(message) {
    // Check if the user has the right permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to unlock channels.");
    }

    // Get the current channel
    const channel = message.channel;

    // Modify the channel permissions to unlock it for @everyone
    try {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
            SendMessages: true
        });
        message.channel.send('This channel has been unlocked.');

        // Fetch active and archived threads in the current channel
        const activeThreads = await channel.threads.fetchActive();
        const archivedThreads = await channel.threads.fetchArchived();

        // Unlock all active threads
        activeThreads.threads.forEach(async (thread) => {
            if (thread && thread.permissionOverwrites) {
                await thread.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: true
                });
            }
        });

        // Unlock all archived threads
        archivedThreads.threads.forEach(async (thread) => {
            if (thread && thread.permissionOverwrites) {
                await thread.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: true
                });
            }
        });

        message.channel.send('All threads in this channel have been unlocked.');
    } catch (error) {
        console.error(error);
        message.channel.send('There was an error unlocking the channel and its threads.');
    }
}

// Function to handle the +lockall command (locks all channels in the server)
async function handleLockAllCommand(message) {
    // Check if the user has the right permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to lock all channels.");
    }

    try {
        // Fetch all channels in the guild
        const channels = message.guild.channels.cache;

        // Lock each channel (text and voice) for @everyone
        channels.forEach(async (channel) => {
            if (channel.type === ChannelType.GuildText) {
                if (channel.permissionOverwrites) {
                    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                        SendMessages: false
                    });
                }
            } else if (channel.type === ChannelType.GuildVoice) {
                // Keep voice channels active for voice use (don't lock)
            } else if (channel.type === ChannelType.GuildForum) {
                if (channel.permissionOverwrites) {
                    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                        SendMessages: false
                    });
                }
            } else if (channel.isThread()) {
                if (channel.permissionOverwrites) {
                    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                        SendMessages: false
                    });
                }
            }
        });

        message.channel.send('All channels have been locked.');
    } catch (error) {
        console.error(error);
        message.channel.send('There was an error locking all channels.');
    }
}

// Function to handle the +unlockall command (unlocks all channels in the server)
async function handleUnlockAllCommand(message) {
    // Check if the user has the right permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("You don't have permission to unlock all channels.");
    }

    try {
        // Fetch all channels in the guild
        const channels = message.guild.channels.cache;

        // Unlock each channel (text and voice) for @everyone
        channels.forEach(async (channel) => {
            if (channel.type === ChannelType.GuildText) {
                if (channel.permissionOverwrites) {
                    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                        SendMessages: true
                    });
                }
            } else if (channel.type === ChannelType.GuildVoice) {
                // Keep voice channels active (no changes needed for voice)
            } else if (channel.type === ChannelType.GuildForum) {
                if (channel.permissionOverwrites) {
                    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                        SendMessages: true
                    });
                }
            } else if (channel.isThread()) {
                if (channel.permissionOverwrites) {
                    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                        SendMessages: true
                    });
                }
            }
        });

        message.channel.send('All channels have been unlocked.');
    } catch (error) {
        console.error(error);
        message.channel.send('There was an error unlocking all channels.');
    }
}

// Function to handle the +val command
async function handleValCommand(message) {
    // Check if there's already an interval running
    if (valInterval) {
        return message.reply("The message is already being sent every second.");
    }

    // Define the message content (mentioning Valentina)
    const valentinaMention = '<@1221196916747141182>'; // Valentina's actual user ID
    const valMessage = `réponds mp ${valentinaMention}`;

    // Start sending the message in all text channels every second
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
    }, 1000); // 1000ms = 1 second

}

// Function to handle the +unval command
async function handleUnvalCommand(message) {
    // Check if there's an interval running
    if (!valInterval) {
        return message.reply("There is no ongoing message to stop.");
    }

    // Clear the interval to stop sending messages
    clearInterval(valInterval);
    valInterval = null;

}
