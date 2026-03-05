const api = {
    // This automatically picks the correct URL:
    // 1. If you're on your own computer, it uses Localhost.
    // 2. If you're on Render, it uses a relative path (the most stable).
    // 3. If you're on GitHub, it uses your specific Render link.
    baseUrl: window.location.hostname === 'https://chunker-2.onrender.com/' 
        ? 'http://localhost:10000' 
        : (window.location.hostname.includes('github.io') 
            ? 'https://chunker-2.onrender.com' 
            : ''), 

    send: async function (file, replyHandler) {
        const formData = new FormData();
        formData.append('file', worldFile);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            console.log(`Connecting to: ${this.baseUrl || 'Internal Render Path'}...`);
            
            // Note: If baseUrl is '', this becomes '/api/convert' (Internal Render)
            // If baseUrl is 'https://...', it becomes 'https://.../api/convert' (GitHub)
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

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "converted_world.zip";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            if (replyHandler) replyHandler({ type: "response", success: true });

        } catch (error) {
            if (error.name === 'AbortError') {
                if (replyHandler) replyHandler({ type: "error", error: "Connection timed out. The network may be blocking large uploads." });
            } else {
                if (replyHandler) replyHandler({ type: "error", error: error.message });
            }
        }
    },

    connect: function (cb) { if(cb) cb(); },
    isConnected: function () { return true; }
};

export default api;
