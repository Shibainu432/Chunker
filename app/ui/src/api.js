const api = {
    // 1. Detect where the app is running
    baseUrl: window.location.hostname.includes('localhost') 
        ? 'http://localhost:10000' 
        : (window.location.hostname.includes('github.io') 
            ? 'https://chunker-2.onrender.com' 
            : ''), 

    send: async function (file, targetVersion, replyHandler) { // Added targetVersion
        const formData = new FormData();
        formData.append('file', file);
        formData.append('targetVersion', targetVersion); // Send the version choice to the server

        try {
            const response = await fetch(`${this.baseUrl}/api/convert`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Conversion failed on server");
            }

            // --- Handle the Download ---
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = "converted_world.zip";
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            a.remove();

            if (replyHandler) replyHandler({ type: "response", success: true });

        } catch (error) {
            // If we have retries left, try again (helps with SSL_BAD_RECORD errors)
            if (retries > 0) {
                console.warn("Network glitch detected. Retrying...");
                return this.send(file, replyHandler, retries - 1);
            }
            
            console.error("API Error:", error);
            if (replyHandler) replyHandler({ 
                type: "error", 
                error: "Connection error: Your network or browser might be blocking the file upload." 
            });
        }
    },

    connect: function (cb) { if(cb) cb(); },
    isConnected: function () { return true; }
};

export default api;
