global.ReadableStream = global.ReadableStream || require('stream/web').ReadableStream;
const { Client, GatewayIntentBits } = require('discord.js');
const { handleCommand } = require('./commands.js');

const deletedMessages = new Map();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.login('MTI4NzE0MzYxNDc0NDM2NzIzNA.Gn0hOS.Bip5X3P2CaaFGKX71-1XzkHkb1CAx1jAPc6WuY');

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    await handleCommand(command, message, args, deletedMessages);
});

client.on('messageDelete', (message) => {
    if (message.partial || !message.guild || message.author.bot) return;
    deletedMessages.set(message.channel.id, {
        content: message.content,
        author: message.author.tag,
        timestamp: message.createdTimestamp,
    });

    setTimeout(() => deletedMessages.delete(message.channel.id), 300000);
});
