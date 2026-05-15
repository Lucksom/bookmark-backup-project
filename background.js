importScripts('shared-scripts/auth.js', 'shared-scripts/drive.js', 'shared-scripts/bookmarks.js');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === 'login') {
    Auth.login().then((result) => {
      if (result && result.success) {
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
    Bookmarks.getTree()
      .then(tree => Drive.uploadBackup(tree))
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

  // NEW: Handle the delete command
  if (request.action === 'deleteBackup') {
    Drive.deleteBackup(request.fileId)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
