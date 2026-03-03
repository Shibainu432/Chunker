const api = {
    baseUrl: 'https://chunker-2.onrender.com',

    send: async function (file, replyHandler) {
        const formData = new FormData();
        formData.append('file', file); 

        // --- NEW: TIMEOUT LOGIC ---
        // This stops the app from hanging forever if the school blocks the upload
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        // ---------------------------

        try {
            console.log("Starting HTTPS Upload to Render...");
            
            const response = await fetch(`${this.baseUrl}/api/convert`, {
                method: 'POST',
                body: formData,
                signal: controller.signal // Connects the timeout to this fetch
            });

            clearTimeout(timeoutId); // Success! Stop the timeout timer

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
                console.error("Upload timed out. The network is likely blocking the data stream.");
                if (replyHandler) replyHandler({ type: "error", error: "Connection timed out. The school firewall may be blocking large uploads." });
            } else {
                console.error("Upload Error:", error);
                if (replyHandler) replyHandler({ type: "error", error: error.message });
            }
        }
    },

    connect: function (cb) { if(cb) cb(); },
    isConnected: function () { return true; }
};

export default api;
