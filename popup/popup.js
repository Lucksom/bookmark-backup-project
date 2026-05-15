document.addEventListener('DOMContentLoaded', function() {
  const btnLogin = document.getElementById('btn-login');
  const btnBackup = document.getElementById('btn-backup-drive');
  const btnRestore = document.getElementById('btn-restore-drive');
  const statusText = document.getElementById('status-text');
  const backupList = document.getElementById('backup-list');

  // 1. Auto-check login state when popup opens
  chrome.storage.local.get(['drive_token'], function(result) {
      if (result.drive_token) {
          setConnectedUI();
      } else {
          statusText.textContent = "Not logged in";
      }
  });

  function setConnectedUI() {
      btnLogin.textContent = "Connected to Google";
      btnLogin.style.backgroundColor = "#2e7d32"; // Green success color
      btnBackup.disabled = false;
      statusText.textContent = "Fetching available backups...";

      // Fetch backups from Drive to show in the dropdown
      chrome.runtime.sendMessage({ action: 'listBackups' }, function(response) {
          if (response && response.success && response.files && response.files.length > 0) {
              statusText.textContent = "Ready";
              backupList.style.display = "block";
              backupList.innerHTML = '';
              response.files.forEach(file => {
                  let opt = document.createElement('option');
                  opt.value = file.id;
                  let date = new Date(file.createdTime).toLocaleString();
                  opt.textContent = `Available: ${date}`;
                  backupList.appendChild(opt);
              });
              btnRestore.disabled = false;
          } else {
              statusText.textContent = "No backups found in Drive.";
              backupList.style.display = "none";
              btnRestore.disabled = true;
          }
      });
  }

  // 2. Login Button
  if (btnLogin) {
    btnLogin.addEventListener('click', function() {
      if (btnLogin.textContent === "Connected to Google") return;
      statusText.textContent = "Opening Google Login...";

      chrome.runtime.sendMessage({ action: 'login' }, function(response) {
        if (response && response.success) {
            setConnectedUI();
        } else {
            statusText.textContent = "Login Failed: " + (response ? response.error : "Canceled");
        }
      });
    });
  }

  // 3. Backup Button
  if (btnBackup) {
      btnBackup.addEventListener('click', function() {
          statusText.textContent = "Progress: Preparing & Uploading...";
          btnBackup.disabled = true;
          
          chrome.runtime.sendMessage({ action: 'startBackup' }, function(response) {
              if (response && response.success) {
                  statusText.textContent = "Success: Backup saved to Drive!";
                  setConnectedUI(); // Refresh the list
              } else {
                  statusText.textContent = "Error: " + (response ? response.error : "Failed");
                  btnBackup.disabled = false;
              }
          });
      });
  }

  // 4. Restore Button
  if (btnRestore) {
      btnRestore.addEventListener('click', function() {
          const fileId = backupList.value;
          if (!fileId) return;

          statusText.textContent = "Progress: Downloading & Restoring...";
          btnRestore.disabled = true;

          chrome.runtime.sendMessage({ action: 'restoreBackup', fileId: fileId }, function(response) {
              if (response && response.success) {
                  statusText.textContent = "Success: Bookmarks restored!";
              } else {
                  statusText.textContent = "Restore Error: " + (response ? response.error : "Failed");
              }
              btnRestore.disabled = false;
          });
      });
  }
});
