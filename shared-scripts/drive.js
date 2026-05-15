const Drive = {
    API_BASE: 'https://www.googleapis.com/drive/v3',
    BACKUP_FOLDER_NAME: 'ChromeBookmarkBackups',
    BACKUP_FILE_PREFIX: 'bookmarks-backup-',

    ensureBackupFolder: async () => {
        const token = await Auth.getToken();
        if (!token) throw new Error('Not authenticated');

        const folderId = await Drive.findFolderByName(token, Drive.BACKUP_FOLDER_NAME);
        if (folderId) return folderId;

        const response = await fetch(`${Drive.API_BASE}/files?supportsAllDrives=true`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: Drive.BACKUP_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder',
                spaces: 'drive'
            })
        });

        if (!response.ok) throw new Error(`Failed to create folder`);
        const data = await response.json();
        return data.id;
    },

    findFolderByName: async (token, folderName) => {
        const query = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
        const response = await fetch(`${Drive.API_BASE}/files?q=${query}&spaces=drive&pageSize=1&fields=files(id,name)`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to search for folder');
        const data = await response.json();
        return data.files.length > 0 ? data.files[0].id : null;
    },

    uploadBackup: async (bookmarkData) => {
        const token = await Auth.getToken();
        if (!token) throw new Error('Not authenticated');

        const folderId = await Drive.ensureBackupFolder();

        // NEW: Delete existing backup files first so we only keep 1 updated file!
        try {
            const oldFiles = await Drive.listBackups();
            for (const file of oldFiles) {
                await Drive.deleteBackup(file.id);
            }
        } catch (error) {
            console.log("No old files to clear.");
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${Drive.BACKUP_FILE_PREFIX}${timestamp}.json`;

        const metadata = { name: filename, mimeType: 'application/json', parents: [folderId] };
        const boundary = '===============7330845974216740156==';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const body = 
            delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter + 'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(bookmarkData) + closeDelimiter;

        const response = await fetch(`${Drive.API_BASE}/files?uploadType=multipart&supportsAllDrives=true`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary="${boundary}"`
            },
            body: body
        });

        if (!response.ok) throw new Error(`Upload failed`);
        const data = await response.json();
        return data.id;
    },

    listBackups: async () => {
        const token = await Auth.getToken();
        if (!token) throw new Error('Not authenticated');

        const folderId = await Drive.findFolderByName(token, Drive.BACKUP_FOLDER_NAME);
        if (!folderId) return [];

        const query = encodeURIComponent(`'${folderId}' in parents and name contains '${Drive.BACKUP_FILE_PREFIX}' and trashed=false`);
        const response = await fetch(`${Drive.API_BASE}/files?q=${query}&spaces=drive&pageSize=50&fields=files(id,name,createdTime,modifiedTime,size)&orderBy=modifiedTime desc`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to list backups');
        const data = await response.json();
        return data.files || [];
    },

    downloadBackup: async (fileId) => {
        const token = await Auth.getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${Drive.API_BASE}/files/${fileId}?alt=media&supportsAllDrives=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Download failed`);
        return await response.json();
    },

    deleteBackup: async (fileId) => {
        const token = await Auth.getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${Drive.API_BASE}/files/${fileId}?supportsAllDrives=true`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Delete failed`);
        return true;
    }
};
