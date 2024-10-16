function loadChatHistory() {
    const chatHistoryContainer = document.getElementById('chatHistory');
    
    chrome.storage.local.get(['chatHistory'], function(result) {
        const chatHistory = result.chatHistory || [];
        
        chatHistoryContainer.innerHTML = '';
        chatHistory.forEach(message => {
            appendMessageToChat(message);
        });

        // Scroll to the bottom of the chat history
        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
    });
}

function appendMessageToChat(message) {
    const chatHistoryContainer = document.getElementById('chatHistory');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.role === 'user' ? 'user-message' : 'model-message'}`;
    messageElement.textContent = message.parts[0].text;
    chatHistoryContainer.appendChild(messageElement);
}

function saveChatHistory(newMessage) {
    chrome.storage.local.get(['chatHistory'], function(result) {
        let chatHistory = result.chatHistory || [];
        chatHistory.push(newMessage);
        chrome.storage.local.set({ chatHistory: chatHistory }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error saving chat history:', chrome.runtime.lastError);
            }
        });
    });
}

window.onload = loadChatHistory;

document.getElementById('sendButton').addEventListener('click', sendMessage);
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) {
        return;
    }

    // Show loading message
    document.getElementById('loading').style.display = 'block';

    // Add user message to chat history immediately
    const userMessage = { role: 'user', parts: [{ text: message }] };
    appendMessageToChat(userMessage);

    // Scroll to the bottom of the chat history
    const chatHistoryContainer = document.getElementById('chatHistory');
    chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;

    chrome.runtime.sendMessage({ type: 'chat', message: message }, (response) => {
        // Hide loading message
        document.getElementById('loading').style.display = 'none';

        if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
        } else {
            // Add model response to chat history
            const modelMessage = { role: 'model', parts: [{ text: response.reply }] };
            appendMessageToChat(modelMessage);

            // Scroll to the bottom of the chat history
            chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
        }
    });

    messageInput.value = '';
}

// Function to delete all previous messages
document.getElementById('clearButton').addEventListener('click', () => {
    chrome.storage.local.remove('chatHistory', function() {
        if (chrome.runtime.lastError) {
            console.error('Error clearing chat history:', chrome.runtime.lastError);
        } else {
            document.getElementById('chatHistory').innerHTML = '';
        }
    });
});
