require('dotenv').config();
global.ReadableStream = global.ReadableStream || require('stream/web').ReadableStream;
const { Client, GatewayIntentBits } = require('discord.js');
const { handleCommand, filterBlacklistedWords } = require('./commands.js');
const express = require('express');

const deletedMessages = new Map();

const app = express();
app.get('/', (req, res) => {
    res.send('Bot is running!');
});
app.listen(3000, () => {
    console.log('HTTP server running on port 3000');
});

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.login(process.env.BOT_TOKEN);

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    await filterBlacklistedWords(message);

    if (message.content.startsWith('+')) {
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        await handleCommand(command, message, args, deletedMessages);
    }
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
