const Drive = {
    API_BASE: 'https://www.googleapis.com/drive/v3',
    BACKUP_FOLDER_NAME: 'ChromeBookmarkBackups',
    BACKUP_FILE_PREFIX: 'bookmarks-backup-',

    ensureBackupFolder: async () => {
        const token = await Auth.getToken();
        if (!token) throw new Error('Not authenticated');

        try {
            const folderId = await Drive.findFolderByName(token, Drive.BACKUP_FOLDER_NAME);
            
            if (folderId) {
                console.log('Backup folder already exists:', folderId);
                return folderId;
            }

            const response = await fetch(`${Drive.API_BASE}/files?supportsAllDrives=true`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: Drive.BACKUP_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder',
                    spaces: 'drive'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to create folder: ${error.error.message}`);
            }

            const data = await response.json();
            console.log('Created new backup folder:', data.id);
            return data.id;
        } catch (error) {
            console.error('Error ensuring backup folder:', error);
            throw error;
        }
    },

    findFolderByName: async (token, folderName) => {
        try {
            const query = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
            const response = await fetch(`${Drive.API_BASE}/files?q=${query}&spaces=drive&pageSize=1&fields=files(id,name)`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to search for folder');

            const data = await response.json();
            return data.files.length > 0 ? data.files[0].id : null;
        } catch (error) {
            console.error('Error finding folder:', error);
            throw error;
        }
    },

    uploadBackup: async (bookmarkData) => {
        const token = await Auth.getToken();
        if (!token) throw new Error('Not authenticated');

        try {
            const folderId = await Drive.ensureBackupFolder();

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${Drive.BACKUP_FILE_PREFIX}${timestamp}.json`;

            const metadata = {
                name: filename,
                mimeType: 'application/json',
                parents: [folderId]
            };

            const boundary = '===============7330845974216740156==';
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelimiter = `\r\n--${boundary}--`;

            const body = 
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(bookmarkData) +
                closeDelimiter;

            const response = await fetch(`${Drive.API_BASE}/files?uploadType=multipart&supportsAllDrives=true`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': `multipart/related; boundary="${boundary}"`
                },
                body: body
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Upload failed: ${error.error.message}`);
            }

            const data = await response.json();
            console.log('Backup uploaded successfully:', data.id);
            return data.id;
        } catch (error) {
            console.error('Error uploading backup:', error);
            throw error;
        }
    },

    listBackups: async () => {
        const token = await Auth.getToken();
        if (!token) throw new Error('Not authenticated');

        try {
            const folderId = await Drive.findFolderByName(token, Drive.BACKUP_FOLDER_NAME);
            
            if (!folderId) {
                console.log('No backup folder found');
                return [];
            }

            const query = encodeURIComponent(`'${folderId}' in parents and name contains '${Drive.BACKUP_FILE_PREFIX}' and trashed=false`);
            const response = await fetch(`${Drive.API_BASE}/files?q=${query}&spaces=drive&pageSize=50&fields=files(id,name,createdTime,modifiedTime,size)&orderBy=modifiedTime desc`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to list backups');

            const data = await response.json();
            console.log('Available backups:', data.files);
            return data.files || [];
        } catch (error) {
            console.error('Error listing backups:', error);
            throw error;
        }
    },

    downloadBackup: async (fileId) => {
        const token = await Auth.getToken();
        if (!token) throw new Error('Not authenticated');

        try {
            const response = await fetch(`${Drive.API_BASE}/files/${fileId}?alt=media&supportsAllDrives=true`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Download failed: ${error.error.message}`);
            }

            const data = await response.json();
            console.log('Backup downloaded successfully');
            return data;
        } catch (error) {
            console.error('Error downloading backup:', error);
            throw error;
        }
    },

    deleteBackup: async (fileId) => {
        const token = await Auth.getToken();
        if (!token) throw new Error('Not authenticated');

        try {
            const response = await fetch(`${Drive.API_BASE}/files/${fileId}?supportsAllDrives=true`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Delete failed: ${error.error.message}`);
            }

            console.log('Backup deleted successfully');
            return true;
        } catch (error) {
            console.error('Error deleting backup:', error);
            throw error;
        }
    }
};
