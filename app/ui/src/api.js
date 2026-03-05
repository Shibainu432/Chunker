const api = {
    // 1. Fixed the baseUrl logic to correctly detect where you are
    baseUrl: window.location.hostname.includes('localhost') 
        ? 'http://localhost:10000' 
        : (window.location.hostname.includes('github.io') 
            ? 'https://chunker-2.onrender.com' 
            : ''), 

    send: async function (file, replyHandler) {
        const formData = new FormData();
        
        // 2. FIXED: Changed 'worldFile' to 'file' so it matches the function argument
        formData.append('file', file);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

        try {
            console.log(`Connecting to: ${this.baseUrl || 'Internal Render Path'}...`);
            
            const response = await fetch(`${this.baseUrl}/api/convert`, {
                method: 'POST',
                body: formData,
                signal: controller.signal 
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Conversion failed on server");
            }

            // 3. Handle the download automatically
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
            console.error("API Error:", error);
            if (error.name === 'AbortError') {
                if (replyHandler) replyHandler({ type: "error", error: "Connection timed out. The world might be too large." });
            } else {
                if (replyHandler) replyHandler({ type: "error", error: error.message });
            }
        }
    },

    connect: function (cb) { if(cb) cb(); },
    isConnected: function () { return true; }
};

export default api;
