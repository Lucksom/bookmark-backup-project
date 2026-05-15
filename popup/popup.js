document.addEventListener('DOMContentLoaded', function() {
  const btnLogin = document.getElementById('btn-login');
  const btnBackup = document.getElementById('btn-backup-drive');
  const btnRestore = document.getElementById('btn-restore-drive');
  const btnDelete = document.getElementById('btn-delete-drive');
  const statusText = document.getElementById('status-text');
  const backupList = document.getElementById('backup-list');
  const manageGroup = document.getElementById('manage-group');

  chrome.storage.local.get(['drive_token'], function(result) {
      if (result.drive_token) {
          setConnectedUI();
      } else {
          statusText.textContent = "Not logged in";
      }
  });

  function setConnectedUI() {
      btnLogin.textContent = "Connected to Google";
      btnLogin.style.backgroundColor = "#2e7d32"; 
      btnBackup.disabled = false;
      statusText.textContent = "Fetching available backups...";

      chrome.runtime.sendMessage({ action: 'listBackups' }, function(response) {
          if (response && response.success && response.files && response.files.length > 0) {
              statusText.textContent = "Ready";
              backupList.style.display = "block";
              manageGroup.style.display = "flex";
              backupList.innerHTML = '';
              response.files.forEach(file => {
                  let opt = document.createElement('option');
                  opt.value = file.id;
                  let date = new Date(file.createdTime).toLocaleString();
                  opt.textContent = `Available: ${date}`;
                  backupList.appendChild(opt);
              });
          } else {
              statusText.textContent = "No backups found in Drive.";
              backupList.style.display = "none";
              manageGroup.style.display = "none";
          }
      });
  }

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

  if (btnBackup) {
      btnBackup.addEventListener('click', function() {
          statusText.textContent = "Progress: Preparing & Uploading...";
          btnBackup.disabled = true;
          
          chrome.runtime.sendMessage({ action: 'startBackup' }, function(response) {
              if (response && response.success) {
                  statusText.textContent = "Success: Backup saved to Drive!";
                  setConnectedUI(); 
              } else {
                  statusText.textContent = "Error: " + (response ? response.error : "Failed");
                  btnBackup.disabled = false;
              }
          });
      });
  }

  if (btnRestore) {
      btnRestore.addEventListener('click', function() {
          const fileId = backupList.value;
          if (!fileId) return;

          statusText.textContent = "Progress: Downloading & Restoring...";
          btnRestore.disabled = true;
          btnDelete.disabled = true;

          chrome.runtime.sendMessage({ action: 'restoreBackup', fileId: fileId }, function(response) {
              if (response && response.success) {
                  statusText.textContent = "Success: Bookmarks restored!";
              } else {
                  statusText.textContent = "Restore Error: " + (response ? response.error : "Failed");
              }
              btnRestore.disabled = false;
              btnDelete.disabled = false;
          });
      });
  }

  // NEW: Delete button logic
  if (btnDelete) {
      btnDelete.addEventListener('click', function() {
          const fileId = backupList.value;
          if (!fileId) return;

          const confirmDelete = confirm("Are you sure you want to completely delete this backup from Drive?");
          if (!confirmDelete) return;

          statusText.textContent = "Progress: Deleting backup...";
          btnRestore.disabled = true;
          btnDelete.disabled = true;

          chrome.runtime.sendMessage({ action: 'deleteBackup', fileId: fileId }, function(response) {
              if (response && response.success) {
                  statusText.textContent = "Success: Backup deleted!";
                  setConnectedUI(); // Refresh the list
              } else {
                  statusText.textContent = "Delete Error: " + (response ? response.error : "Failed");
                  btnRestore.disabled = false;
                  btnDelete.disabled = false;
              }
          });
      });
  }
});
