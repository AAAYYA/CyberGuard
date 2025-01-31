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
