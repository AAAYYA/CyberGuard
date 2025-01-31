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

// WebSocket for real-time updates
io.on('connection', (socket) => {
    console.log('New client connected');
    socket.emit('messageHistory', messages);

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3001;
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
            timestamp: new Date().toISOString()
        };
        messages.push(msgData);
        io.emit('newMessage', msgData);
    }
});

client.login(process.env.BOT_TOKEN);

module.exports = { io, messages, client };
