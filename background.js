chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action);

  if (request.action === 'login') {
    console.log("Starting Web Auth flow...");
    
    Auth.login().then((result) => {
      if (result && result.success) {
         console.log("Auth Successful! Token retrieved.");
         sendResponse({ success: true, token: result.token });
      } else {
         console.error("Auth Failed or canceled by user.");
         sendResponse({ success: false, error: "Web Auth flow failed or was canceled." });
      }
    }).catch(err => {
      console.error("Auth Exception:", err);
      sendResponse({ success: false, error: err.toString() });
    });

    return true; 
  }

  if (request.action === 'startBackup') {
    console.log("Starting backup process...");
    sendResponse({ success: true, message: "Backup process started in background." });
    return true; 
  }
});
