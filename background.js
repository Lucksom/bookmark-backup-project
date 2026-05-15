chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action);

  if (request.action === 'login') {
    console.log("Starting Google Auth flow...");
    
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError) {
        console.error("Auth Error:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else if (token) {
        console.log("Auth Successful! Token retrieved.");
        sendResponse({ success: true, token: token });
      } else {
        console.error("Auth Failed: No token returned.");
        sendResponse({ success: false, error: "No token returned." });
      }
    });

    return true; 
  }

  if (request.action === 'startBackup') {
    console.log("Starting backup process...");
    sendResponse({ success: true, message: "Backup process started in background." });
    return true; 
  }
});
