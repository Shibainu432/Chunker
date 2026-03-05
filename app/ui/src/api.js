const api = {
    baseUrl: window.location.hostname.includes('localhost') 
        ? 'http://localhost:10000' 
        : (window.location.hostname.includes('github.io') 
            ? 'https://chunker-2.onrender.com' 
            : ''), 

    // IMPORTANT: Make sure 'retries = 2' is right here in the arguments!
    send: async function (file, targetVersion, replyHandler, retries = 2) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('targetVersion', targetVersion);

        try {
            const response = await fetch(`${this.baseUrl}/api/convert`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Server Error");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "converted_world.zip";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            if (replyHandler) replyHandler({ type: "response", success: true });

        } catch (error) {
            // Now 'retries' will be defined and this won't crash
            if (retries > 0) {
                console.warn(`Retry attempt ${3 - retries}: logic error or network glitch.`);
                return this.send(file, targetVersion, replyHandler, retries - 1);
            }
            
            console.error("Final API Error:", error);
            if (replyHandler) replyHandler({ 
                type: "error", 
                error: "Connection reset. Try a smaller zip file or disable VPN/Antivirus." 
            });
        }
    },
    connect: (cb) => { if(cb) cb(); },
    isConnected: () => true
};

export default api;
