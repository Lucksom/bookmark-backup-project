document.addEventListener('DOMContentLoaded', function() {
  const googleBtn = document.getElementById('google-btn');
  const statusText = document.getElementById('status');

  if (googleBtn) {
    googleBtn.addEventListener('click', function() {
      if (statusText) statusText.textContent = "Connecting to Google...";
      console.log("Login button clicked, sending message to background...");

      chrome.runtime.sendMessage({ action: 'login' }, function(response) {
        
        if (chrome.runtime.lastError) {
          console.error("Connection Error:", chrome.runtime.lastError.message);
          if (statusText) statusText.textContent = "Error: Connection failed.";
          return;
        }

        if (response && response.success) {
          console.log("Login Success! Token:", response.token);
          if (statusText) statusText.textContent = "Connected successfully!";
          
          chrome.runtime.sendMessage({ action: 'startBackup' });

        } else {
          const errorMsg = response ? response.error : "Unknown Error";
          console.error("Login Failed:", errorMsg);
          if (statusText) statusText.textContent = "Login Failed: " + errorMsg;
        }
      });
    });
  } else {
    console.error("Error: Could not find the button. Make sure your HTML has id='google-btn'");
  }
});
