let userNickname = 'User'; // Default user nickname
const aiNickname = 'GHOST AI'; // AI nickname

function loadChatHistory() {
    const chatHistoryContainer = document.getElementById('chatHistory');
    
    chrome.storage.local.get(['chatHistory', 'userNickname'], function(result) {
        const chatHistory = result.chatHistory || [];
        userNickname = result.userNickname || userNickname;
        
        chatHistoryContainer.innerHTML = '';
        chatHistory.forEach(message => {
            appendMessageToChat(message);
        });

        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
    });
}

function appendMessageToChat(message) {
    const chatHistoryContainer = document.getElementById('chatHistory');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.role === 'user' ? 'user-message' : 'model-message'}`;
    
    const nicknameElement = document.createElement('div');
    nicknameElement.className = 'nickname';
    nicknameElement.textContent = message.role === 'user' ? userNickname : aiNickname;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    message.parts.forEach(part => {
        if (part.text) {
            const textElement = document.createElement('p');
            textElement.textContent = part.text;
            textElement.className = 'mb-0';
            messageContent.appendChild(textElement);
        } else if (part.image) {
            const imgElement = document.createElement('img');
            imgElement.src = part.image;
            imgElement.alt = 'Generated Image';
            imgElement.className = 'img-fluid mt-2';
            messageContent.appendChild(imgElement);
        }
    });
    
    messageElement.appendChild(nicknameElement);
    messageElement.appendChild(messageContent);
    chatHistoryContainer.appendChild(messageElement);

    chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
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

window.onload = function() {
    loadChatHistory();
    promptForNickname();
};

function promptForNickname() {
    chrome.storage.local.get(['userNickname'], function(result) {
        if (!result.userNickname) {
            const nickname = prompt("Please enter your nickname:", "User");
            if (nickname) {
                userNickname = nickname;
                chrome.storage.local.set({ userNickname: nickname });
            }
        } else {
            userNickname = result.userNickname;
        }
    });
}

document.getElementById('sendButton').addEventListener('click', sendMessage);
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    document.getElementById('loading').style.display = 'block';

    const userMessage = { role: 'user', parts: [{ text: message }] };
    appendMessageToChat(userMessage);

    chrome.runtime.sendMessage({ type: 'chat', message: message }, (response) => {
        document.getElementById('loading').style.display = 'none';

        if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
        } else {
            // Add model response to chat history
            const modelMessage = { role: 'model', parts: [{ text: response.reply }] };
            appendMessageToChat(modelMessage);
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

document.getElementById('imageGenButton').addEventListener('click', generateImage);

function generateImage() {
    const messageInput = document.getElementById('messageInput');
    const prompt = messageInput.value.trim();

    if (!prompt) {
        alert("Please enter a prompt for image generation.");
        return;
    }

    // Show loading message
    document.getElementById('loading').style.display = 'block';

    const options = {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'User-Agent': 'insomnia/10.1.0'},
        body: JSON.stringify({ prompt: prompt })
    };

    fetch('https://gemini-blue-eta.vercel.app/v1/image', options)
        .then(response => response.json())
        .then(response => {
            // Hide loading message
            document.getElementById('loading').style.display = 'none';

            if (response.imageUrl) {
                // Add the generated image to the chat history
                const imageMessage = { 
                    role: 'model', 
                    parts: [
                        { text: `Generated image for prompt: "${prompt}"` },
                        { image: response.imageUrl }
                    ]
                };
                appendMessageToChat(imageMessage);

                // Clear the input field
                messageInput.value = '';
            } else {
                alert("Failed to generate image. Please try again.");
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('loading').style.display = 'none';
            alert("An error occurred while generating the image. Please try again.");
        });
}
