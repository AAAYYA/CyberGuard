require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { client } = require('./bot'); 

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Password protection middleware
const PASSWORD = "David*Lucy!";
app.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${PASSWORD}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
});

// Store messages
let messages = [];

// API to get messages
app.get('/messages', (req, res) => {
    res.json(messages);
});

app.post('/send-message', async (req, res) => {
    const { channelId, message } = req.body;

    if (!channelId || !message) {
        return res.status(400).json({ success: false, error: "Channel ID and message are required" });
    }

    try {
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            return res.status(404).json({ success: false, error: "Invalid channel ID" });
        }

        await channel.send(message);
        res.json({ success: true });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ success: false, error: "Failed to send message" });
    }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
    console.log('New client connected');
    socket.emit('messageHistory', messages);

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { io, messages };

client.on('ready', () => {
    console.log(`Bot connected as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
    if (!message.author.bot && [
        "1294639801815007305",
        "1294632351103582258",
        "1307395383428780073",
        "1294642281415970907",
        "1307328647610499102",
        "1307115358767022120"
    ].includes(message.channel.id)) {
        const msgData = {
            username: message.author.username,
            content: message.content,
            channelId: message.channel.id,
            channelName: message.channel.name,        
            timestamp: new Date().toISOString()
        };
        messages.push(msgData);
        io.emit('newMessage', msgData);
    }
});

client.login(process.env.BOT_TOKEN);

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', async (input) => {
    if (!input.startsWith("send ")) {
        console.log("Usage: send <channelID> <message>");
        return;
    }

    const parts = input.split(' ');
    const channelId = parts[1];
    const message = parts.slice(2).join(' ');

    if (!channelId || !message) {
        console.log("Usage: send <channelID> <message>");
        return;
    }

    const channel = client.channels.cache.get(channelId);
    if (!channel) {
        console.log("❌ Invalid channel ID.");
        return;
    }

    try {
        await channel.send(message);
        console.log(`✅ Message sent to ${channelId}: ${message}`);
    } catch (error) {
        console.error("❌ Failed to send message:", error);
    }
});

module.exports = { io, messages, client };
