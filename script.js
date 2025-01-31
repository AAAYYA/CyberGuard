const socket = io();
const messagesContainer = document.getElementById('messages');
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');

function authenticate() {
    const passwordInput = document.getElementById('password').value;
    if (passwordInput === "David*Lucy!") {
        loginContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        fetchMessages();
    } else {
        alert('Incorrect password!');
    }
}

function fetchMessages() {
    fetch('/messages', {
        headers: { 'Authorization': 'Bearer David*Lucy!' }
    })
    .then(response => response.json())
    .then(data => {
        messagesContainer.innerHTML = '';
        data.forEach(displayMessage);
    });
}

socket.on('newMessage', (message) => {
    displayMessage(message);
});

function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerHTML = `<span class="username">${message.username}</span>: ${message.content}`;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
    const channelId = document.getElementById('channel-id').value;
    const message = document.getElementById('message-input').value;

    if (!channelId || !message) {
        alert("Please enter a channel ID and a message.");
        return;
    }

    fetch('/send-message', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer David*Lucy!'
        },
        body: JSON.stringify({ channelId, message })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('message-input').value = "";
        } else {
            alert("Failed to send message: " + data.error);
        }
    })
    .catch(error => console.error("Error sending message:", error));
}
