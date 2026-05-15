const Bookmarks = {
    getTree: () => {
        return new Promise((resolve) => {
            chrome.bookmarks.getTree((tree) => {
                resolve(tree);
            });
        });
    },

    mergeTrees: (remoteTree, localTree) => {
        if (!remoteTree || remoteTree.length === 0) return localTree;
        if (!localTree || localTree.length === 0) return remoteTree;

        const mergeNodes = (remoteNode, localNode) => {
            if (!localNode.children) return;
            if (!remoteNode.children) remoteNode.children = [];

            for (const localChild of localNode.children) {
                if (localChild.url) {
                    const exists = remoteNode.children.find(r => r.url === localChild.url);
                    if (!exists) {
                        remoteNode.children.push(localChild); 
                    }
                } else {
                    const existingFolder = remoteNode.children.find(r => !r.url && r.title === localChild.title);
                    if (existingFolder) {
                        mergeNodes(existingFolder, localChild); 
                    } else {
                        remoteNode.children.push(localChild); 
                    }
                }
            }
        };

        const mergedTree = JSON.parse(JSON.stringify(remoteTree));
        mergeNodes(mergedTree[0], localTree[0]);
        
        return mergedTree;
    },

    restore: async (bookmarkData) => {
        try {
            // Get the current browser's native folders (Mobile Bookmarks, Bookmarks Bar, etc.)
            const currentTree = await Bookmarks.getTree();
            const browserRootFolders = currentTree[0].children;
            const backupRootFolders = bookmarkData[0].children;

            for (const backupRoot of backupRootFolders) {
                // Match the backup folder (e.g., "Mobile bookmarks") to the actual browser folder
                const targetBrowserFolder = browserRootFolders.find(r => r.title === backupRoot.title);
                
                if (targetBrowserFolder && backupRoot.children) {
                    // Dump the bookmarks directly into the native folder
                    for (const child of backupRoot.children) {
                        await Bookmarks.smartCreate(targetBrowserFolder.id, child);
                    }
                }
            }
            return { success: true };
        } catch (error) {
            console.error("Restore error:", error);
            return { success: false, error: error.message };
        }
    },

    // NEW: Smart Create logic prevents duplicate folders and duplicate links during restore
    smartCreate: async (parentId, node) => {
        // Check what already exists in the target folder
        const existingItems = await new Promise(resolve => {
            chrome.bookmarks.getChildren(parentId, resolve);
        });
        
        let targetId = null;

        if (node.url) {
            // It's a bookmark: Check if the exact URL already exists here
            const existingLink = existingItems.find(item => item.url === node.url);
            if (existingLink) {
                targetId = existingLink.id; // Skip creating it
            }
        } else {
            // It's a folder: Check if a folder with this name already exists
            const existingFolder = existingItems.find(item => !item.url && item.title === node.title);
            if (existingFolder) {
                targetId = existingFolder.id; // Use existing folder to put children inside
            }
        }

        // If it doesn't exist, create it natively
        if (!targetId) {
            const properties = { parentId: parentId, title: node.title };
            if (node.url) properties.url = node.url; // Only add URL if it's a link

            const createdNode = await new Promise((resolve) => {
                chrome.bookmarks.create(properties, resolve);
            });
            targetId = createdNode.id;
        }

        // If this is a folder and has children, run this process inside the folder
        if (node.children && node.children.length > 0 && !node.url) {
            for (const child of node.children) {
                await Bookmarks.smartCreate(targetId, child);
            }
        }
    }
};
