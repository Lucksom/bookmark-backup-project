document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btn-login');
    const btnBackup = document.getElementById('btn-backup-drive');
    const btnRestore = document.getElementById('btn-restore-drive');
    const btnExport = document.getElementById('btn-export-local');
    const btnImport = document.getElementById('btn-import-local');
    const fileInput = document.getElementById('file-import-local');
    const statusText = document.getElementById('status-text');


    chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
        if (response && response.authenticated) {
            updateUI(true);
        }
    });


    btnLogin.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'login' }, (res) => {
            if (res.success) updateUI(true);
        });
    });

    btnBackup.addEventListener('click', () => {
        statusText.innerText = "Syncing to Drive...";
        chrome.runtime.sendMessage({ action: 'startBackup' }, (res) => {
            statusText.innerText = res.success ? "Cloud Backup Done!" : "Cloud Backup Failed.";
        });
    });

    btnRestore.addEventListener('click', () => {
        statusText.innerText = "Fetching from Drive...";
        chrome.runtime.sendMessage({ action: 'startRestore' }, (res) => {
            statusText.innerText = res.success ? "Cloud Restore Done!" : "Restore Failed.";
        });
    });

    // 3. Offline File Actions
    btnExport.addEventListener('click', () => {
        chrome.bookmarks.getTree((tree) => {
            const blob = new Blob([JSON.stringify(tree)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            chrome.downloads.download({
                url: url,
                filename: `bookmarks_offline_${Date.now()}.json`
            });
        });
    });

    btnImport.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                chrome.runtime.sendMessage({ action: 'restoreDirect', data: data }, (res) => {
                    statusText.innerText = res.success ? "Offline Import Done!" : "Import Failed.";
                });
            } catch (err) {
                statusText.innerText = "Invalid JSON File.";
            }
        };
        reader.readAsText(file);
    });

    function updateUI(isAuthenticated) {
        btnLogin.style.display = isAuthenticated ? 'none' : 'block';
        btnBackup.disabled = !isAuthenticated;
        btnRestore.disabled = !isAuthenticated;
        statusText.innerText = isAuthenticated ? "Connected to Drive" : "Not logged in";
    }
});
