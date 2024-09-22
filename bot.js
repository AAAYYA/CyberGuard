global.ReadableStream = global.ReadableStream || require('stream/web').ReadableStream;
const { Client, GatewayIntentBits } = require('discord.js');
const { handleCommand } = require('./commands.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.login('YOUR_BOT_TOKEN_HERE');

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('+')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    await handleCommand(command, message, args);
});
