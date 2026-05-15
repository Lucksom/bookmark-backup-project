const Bookmarks = {
    getTree: () => {
        return new Promise((resolve) => {
            chrome.bookmarks.getTree((tree) => {
                resolve(tree);
            });
        });
    },

    // NEW: Smart Merging Logic
    mergeTrees: (remoteTree, localTree) => {
        if (!remoteTree || remoteTree.length === 0) return localTree;
        if (!localTree || localTree.length === 0) return remoteTree;

        const mergeNodes = (remoteNode, localNode) => {
            if (!localNode.children) return;
            if (!remoteNode.children) remoteNode.children = [];

            for (const localChild of localNode.children) {
                if (localChild.url) {
                    // It's a bookmark: Check if the exact URL already exists in this folder
                    const exists = remoteNode.children.find(r => r.url === localChild.url);
                    if (!exists) {
                        remoteNode.children.push(localChild); // Add the new bookmark
                    }
                } else {
                    // It's a folder: Check if a folder with this name already exists
                    const existingFolder = remoteNode.children.find(r => !r.url && r.title === localChild.title);
                    if (existingFolder) {
                        mergeNodes(existingFolder, localChild); // Folder exists, look inside it
                    } else {
                        remoteNode.children.push(localChild); // Entire folder is new, add it
                    }
                }
            }
        };

        // Create a copy of the remote tree so we don't break the original data
        const mergedTree = JSON.parse(JSON.stringify(remoteTree));
        mergeNodes(mergedTree[0], localTree[0]);
        
        return mergedTree;
    },

    restore: async (bookmarkData) => {
        try {
            const timestamp = new Date().toLocaleString();
            const rootFolder = await new Promise((resolve) => {
                chrome.bookmarks.create({
                    title: `Restored Backup (${timestamp})`
                }, resolve);
            });

            const nodes = bookmarkData[0].children;
            for (const node of nodes) {
                await Bookmarks.recursivelyCreate(rootFolder.id, node);
            }
            return { success: true };
        } catch (error) {
            console.error("Restore error:", error);
            return { success: false, error: error.message };
        }
    },

    recursivelyCreate: async (parentId, node) => {
        const createdNode = await new Promise((resolve) => {
            chrome.bookmarks.create({
                parentId: parentId,
                title: node.title,
                url: node.url 
            }, resolve);
        });

        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                await Bookmarks.recursivelyCreate(createdNode.id, child);
            }
        }
    }
};
