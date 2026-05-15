const Bookmarks = {
    getTree: () => {
        return new Promise((resolve) => {
            chrome.bookmarks.getTree((tree) => {
                resolve(tree);
            });
        });
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
