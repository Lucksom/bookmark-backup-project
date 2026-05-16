importScripts('shared-scripts/auth.js', 'shared-scripts/drive.js', 'shared-scripts/bookmarks.js');

function resetAutoBackupAlarm() {
    chrome.alarms.create('autoBackup', { periodInMinutes: 360 });
}

chrome.runtime.onStartup.addListener(resetAutoBackupAlarm);
chrome.runtime.onInstalled.addListener(resetAutoBackupAlarm);

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'autoBackup') {
        console.log("6-hour auto-backup triggered in background.");
        Auth.getToken().then(token => {
            if (token) {
                Bookmarks.getTree()
                    .then(tree => Drive.uploadBackup(tree, 'merge'))
                    .then(() => console.log("Auto-backup successful!"))
                    .catch(err => console.error("Auto-backup failed:", err));
            }
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === 'login') {
    Auth.login().then((result) => {
      if (result && result.success) {
         resetAutoBackupAlarm(); 
         sendResponse({ success: true, token: result.token });
      } else {
         sendResponse({ success: false, error: "Web Auth flow failed or was canceled." });
      }
    }).catch(err => {
      sendResponse({ success: false, error: err.toString() });
    });
    return true; 
  }

  if (request.action === 'logout') {
      chrome.storage.local.remove(['drive_token'], () => {
          chrome.identity.clearAllCachedAuthTokens(() => {
              sendResponse({ success: true });
          });
      });
      return true;
  }

  // NEW: Fetch actual Google Profile Picture and Email
  if (request.action === 'getUserInfo') {
      Auth.getToken().then(token => {
          if (!token) throw new Error("Not authenticated");
          return fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
      })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, info: data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
  }

  if (request.action === 'startBackup') {
    resetAutoBackupAlarm(); 
    
    Bookmarks.getTree()
      .then(tree => Drive.uploadBackup(tree, request.mode)) 
      .then(fileId => sendResponse({ success: true, fileId: fileId }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; 
  }

  if (request.action === 'listBackups') {
    Drive.listBackups()
      .then(files => sendResponse({ success: true, files: files }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'restoreBackup') {
    Drive.downloadBackup(request.fileId)
      .then(data => Bookmarks.restore(data))
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'deleteBackup') {
    Drive.deleteBackup(request.fileId)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'restoreLocal') {
    Bookmarks.restore(request.data)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
