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

            const authUrl = `https://accounts.google.com/o/oauth2/auth` +
                            `?client_id=${clientId}` +
                            `&response_type=token` +
                            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                            `&scope=${encodeURIComponent(scopes)}`;

            chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            }, (redirectUrl) => {
                if (chrome.runtime.lastError || !redirectUrl) {
                    console.error("Auth failed:", chrome.runtime.lastError);
                    return resolve({ success: false });
                }

                const url = new URL(redirectUrl);
                const params = new URLSearchParams(url.hash.substring(1));
                const token = params.get('access_token');

                if (token) {

                    chrome.storage.local.set({ 'drive_token': token }, () => {
                        resolve({ success: true, token: token });
                    });
                } else {
                    resolve({ success: false });
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

    // 3. Logout / Clear token
    logout: () => {
        return new Promise((resolve) => {
            chrome.storage.local.remove(['drive_token'], () => {
                resolve();
            });
        });
    }
};
