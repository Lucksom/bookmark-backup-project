const Auth = {
    getRedirectURL: () => {
        return chrome.identity.getRedirectURL();
    },

    login: () => {
        return new Promise((resolve, reject) => {
            const manifest = chrome.runtime.getManifest();
            const clientId = manifest.oauth2.client_id;
            const scopes = manifest.oauth2.scopes.join(' ');
            const redirectUri = Auth.getRedirectURL();

            // This will tell us EXACTLY what URL Kiwi is generating
            console.log("Kiwi Redirect URI:", redirectUri); 

            const authUrl = `https://accounts.google.com/o/oauth2/auth` +
                            `?client_id=${clientId}` +
                            `&response_type=token` +
                            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                            `&scope=${encodeURIComponent(scopes)}`;

            chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            }, (redirectUrl) => {
                // Fixed to extract the actual readable error message
                if (chrome.runtime.lastError || !redirectUrl) {
                    const errorMsg = chrome.runtime.lastError ? chrome.runtime.lastError.message : "No redirect URL returned";
                    console.error("Auth failed details:", errorMsg);
                    return resolve({ success: false, error: errorMsg });
                }

                const url = new URL(redirectUrl);
                const params = new URLSearchParams(url.hash.substring(1));
                const token = params.get('access_token');

                if (token) {
                    chrome.storage.local.set({ 'drive_token': token }, () => {
                        resolve({ success: true, token: token });
                    });
                } else {
                    resolve({ success: false, error: "No token found in URL" });
                }
            });
        });
    },

    getToken: () => {
        return new Promise((resolve) => {
            chrome.storage.local.get(['drive_token'], (result) => {
                resolve(result.drive_token || null);
            });
        });
    },

    logout: () => {
        return new Promise((resolve) => {
            chrome.storage.local.remove(['drive_token'], () => {
                resolve();
            });
        });
    }
};
