importScripts('shared-scripts/auth.js', 'shared-scripts/drive.js', 'shared-scripts/bookmarks.js');

// NEW: Setup the 6-hour automatic backup alarm (360 minutes)
function resetAutoBackupAlarm() {
    chrome.alarms.create('autoBackup', { periodInMinutes: 360 });
}

// Ensure alarm is created when extension wakes up
chrome.runtime.onStartup.addListener(resetAutoBackupAlarm);
chrome.runtime.onInstalled.addListener(resetAutoBackupAlarm);

// Listen for the 6-hour alarm to trigger
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'autoBackup') {
        console.log("6-hour auto-backup triggered in background.");
        Auth.getToken().then(token => {
            if (token) {
                // By default, Auto-backup uses "merge" so it never overwrites other devices
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
         resetAutoBackupAlarm(); // Start timer after login
         sendResponse({ success: true, token: result.token });
      } else {
         sendResponse({ success: false, error: "Web Auth flow failed or was canceled." });
      }
    }).catch(err => {
      sendResponse({ success: false, error: err.toString() });
    });
    return true; 
  }

  if (request.action === 'startBackup') {
    // Reset the 6-hour timer whenever they manually backup
    resetAutoBackupAlarm(); 
    
    Bookmarks.getTree()
      .then(tree => Drive.uploadBackup(tree, request.mode)) // Pass merge or replace mode
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
