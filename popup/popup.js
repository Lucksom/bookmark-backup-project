document.addEventListener('DOMContentLoaded', function() {
  const btnLogin = document.getElementById('btn-login');
  const topBar = document.getElementById('top-bar');
  const userDp = document.getElementById('user-dp');
  const userEmail = document.getElementById('user-email');
  const logoutMenu = document.getElementById('logout-menu');
  const btnLogoutConfirm = document.getElementById('btn-logout-confirm');
  const btnRefresh = document.getElementById('btn-refresh');

  const btnBackup = document.getElementById('btn-backup-drive');
  const backupOptions = document.getElementById('backup-options');
  const btnBackupMerge = document.getElementById('btn-backup-merge');
  const btnBackupReplace = document.getElementById('btn-backup-replace');
  
  const btnRestore = document.getElementById('btn-restore-drive');
  const btnDelete = document.getElementById('btn-delete-drive');
  const statusText = document.getElementById('status-text');
  const backupList = document.getElementById('backup-list');
  const manageGroup = document.getElementById('manage-group');
  
  const btnExport = document.getElementById('btn-export-local');
  const btnImport = document.getElementById('btn-import-local');
  const fileImport = document.getElementById('file-import-local');

  chrome.storage.local.get(['drive_token'], function(result) {
      if (result.drive_token) {
          setConnectedUI();
      } else {
          statusText.textContent = "Not logged in";
          topBar.style.display = "none";
          btnLogin.style.display = "flex";
      }
  });

  function fetchBackupsList() {
      statusText.textContent = "Fetching available backups...";
      chrome.runtime.sendMessage({ action: 'listBackups' }, function(response) {
          if (response && response.success && response.files && response.files.length > 0) {
              statusText.textContent = "Ready (Auto-backup every 6h)";
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
              statusText.textContent = "No backups found. Ready to create one.";
              backupList.style.display = "none";
              manageGroup.style.display = "none";
          }
      });
  }

  function setConnectedUI() {
      btnLogin.style.display = "none"; 
      topBar.style.display = "flex"; 
      btnBackup.disabled = false;

      // NEW: Fetch real profile info from background script
      chrome.runtime.sendMessage({ action: 'getUserInfo' }, function(response) {
          if (response && response.success && response.info) {
              if (response.info.email) {
                  userEmail.textContent = response.info.email;
              }
              if (response.info.picture) {
                  // Inject the actual Google Image
                  userDp.innerHTML = `<img src="${response.info.picture}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                  userDp.style.backgroundColor = "transparent";
              } else if (response.info.email) {
                  // Fallback to letter if no picture exists
                  userDp.textContent = response.info.email.charAt(0).toUpperCase();
              }
          }
      });

      fetchBackupsList();
  }

  btnRefresh.addEventListener('click', function() {
      btnRefresh.style.transform = "rotate(360deg)";
      setTimeout(() => btnRefresh.style.transform = "rotate(0deg)", 300);
      fetchBackupsList();
  });

  userDp.addEventListener('click', function() {
      logoutMenu.style.display = logoutMenu.style.display === "none" ? "block" : "none";
  });

  btnLogoutConfirm.addEventListener('click', function() {
      logoutMenu.style.display = "none";
      statusText.textContent = "Logging out...";
      
      chrome.runtime.sendMessage({ action: 'logout' }, function() {
          topBar.style.display = "none";
          btnLogin.style.display = "flex";
          btnLogin.textContent = "Login with Google";
          backupList.style.display = "none";
          manageGroup.style.display = "none";
          btnBackup.disabled = true;
          // Reset DP just in case
          userDp.innerHTML = "👤";
          userDp.style.backgroundColor = "var(--primary)";
          statusText.textContent = "Logged out successfully.";
      });
  });

  if (btnLogin) {
    btnLogin.addEventListener('click', function() {
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
          backupOptions.style.display = backupOptions.style.display === "none" ? "flex" : "none";
      });
  }

  function triggerBackup(mode) {
      statusText.textContent = `Progress: ${mode === 'merge' ? 'Updating' : 'Replacing'} Backup...`;
      btnBackup.disabled = true;
      backupOptions.style.display = "none";
      
      chrome.runtime.sendMessage({ action: 'startBackup', mode: mode }, function(response) {
          if (response && response.success) {
              statusText.textContent = "Success: Backup saved to Drive!";
              setConnectedUI(); 
          } else {
              statusText.textContent = "Error: " + (response ? response.error : "Failed");
              btnBackup.disabled = false;
          }
      });
  }

  btnBackupMerge.addEventListener('click', () => triggerBackup('merge'));
  btnBackupReplace.addEventListener('click', () => triggerBackup('replace'));

  if (btnRestore) {
      btnRestore.addEventListener('click', function() {
          const fileId = backupList.value;
          if (!fileId) return;

          statusText.textContent = "Progress: Downloading & Restoring...";
          btnRestore.disabled = true;
          btnDelete.disabled = true;

          chrome.runtime.sendMessage({ action: 'restoreBackup', fileId: fileId }, function(response) {
              if (response && response.success) {
                  statusText.textContent = "Success: Bookmarks restored natively!";
              } else {
                  statusText.textContent = "Restore Error: " + (response ? response.error : "Failed");
              }
              btnRestore.disabled = false;
              btnDelete.disabled = false;
          });
      });
  }

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
                  setConnectedUI(); 
              } else {
                  statusText.textContent = "Delete Error: " + (response ? response.error : "Failed");
                  btnRestore.disabled = false;
                  btnDelete.disabled = false;
              }
          });
      });
  }

  if (btnExport) {
      btnExport.addEventListener('click', function() {
          statusText.textContent = "Progress: Exporting offline...";
          chrome.bookmarks.getTree(function(tree) {
              try {
                  const json = JSON.stringify(tree, null, 2);
                  const blob = new Blob([json], {type: "application/json"});
                  const url = URL.createObjectURL(blob);
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                  
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = `bookmarks-offline-${timestamp}.json`;
                  document.body.appendChild(a);
                  a.click();
                  
                  setTimeout(() => {
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                  }, 100);
                  
                  statusText.textContent = "Success: Bookmarks exported!";
              } catch (error) {
                  statusText.textContent = "Export Error: " + error.message;
              }
          });
      });
  }

  if (btnImport && fileImport) {
      btnImport.addEventListener('click', function() {
          fileImport.click(); 
      });

      fileImport.addEventListener('change', function(event) {
          const file = event.target.files[0];
          if (!file) return;

          statusText.textContent = "Progress: Reading file...";
          
          const reader = new FileReader();
          reader.onload = function(e) {
              try {
                  const bookmarkData = JSON.parse(e.target.result);
                  statusText.textContent = "Progress: Restoring offline data...";
                  
                  chrome.runtime.sendMessage({ action: 'restoreLocal', data: bookmarkData }, function(response) {
                      if (response && response.success) {
                          statusText.textContent = "Success: Offline bookmarks restored!";
                      } else {
                          statusText.textContent = "Restore Error: " + (response ? response.error : "Failed");
                      }
                      fileImport.value = ''; 
                  });
              } catch (error) {
                  statusText.textContent = "Error: Invalid JSON file format.";
                  fileImport.value = ''; 
              }
          };
          reader.readAsText(file);
      });
  }
});
