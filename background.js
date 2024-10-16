// Function to get chat history from chrome.storage.local
function getChatHistory(callback) {
  chrome.storage.local.get(['chatHistory'], function(result) {
    callback(result.chatHistory || []);
  });
}

// Function to save chat history to chrome.storage.local
function saveChatHistory(history, callback) {
  chrome.storage.local.set({ chatHistory: history }, callback);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'chat') {
    getChatHistory((chatHistory) => {
      // Add user message to chat history
      chatHistory.push({ role: "user", parts: [{ text: request.message }] });

      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: request.message,
          chatHistory: chatHistory
        })
      };

      fetch('https://gemini-blue-eta.vercel.app/chat', options)
        .then(response => response.json())
        .then(data => {
          // Add model response to chat history
          chatHistory.push({ role: "model", parts: [{ text: data.response }] });
          
          // Save updated chat history
          saveChatHistory(chatHistory, () => {
            sendResponse({ reply: data.response });
          });
        })
        .catch(error => {
          console.error('Error:', error);
          sendResponse({ reply: 'An error occurred while processing your request.' });
        });
    });

    return true; // Indicates that the response will be sent asynchronously
  }
});
