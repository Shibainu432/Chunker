const api = {
    baseUrl: 'https://chunker-2.onrender.com',

    send: async function (file, replyHandler) {
        // Create the form data
        const formData = new FormData();
        // Use 'world' as the key to match common Chunker backend expectations
        formData.append('file', file);

        try {
            console.log("Starting HTTPS Upload to Render...");
            
    const response = await fetch(`${this.baseUrl}/api/convert`, {
        method: 'POST',
        body: formData,
        // Forces the browser to handle the request as a basic 'no-frills' upload
        mode: 'cors',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
    });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Conversion failed on server");
            }

            // Standard blob handling for the download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "converted_world.zip";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url); // Clean up memory
            a.remove();

            if (replyHandler) replyHandler({ type: "response", success: true });
        } catch (error) {
            console.error("Upload Error:", error);
            // If the school filter blocks it, the error usually happens here
            if (replyHandler) replyHandler({ 
                type: "error", 
                error: "Network connection lost. If you are on school WiFi, the firewall may be blocking the upload. Try a smaller file or a mobile hotspot." 
            });
        }
    },

    // Mock functions to prevent SelectWorldScreen from crashing
    connect: function (cb) { if(cb) cb(); },
    isConnected: function () { return true; },
    on: function() {},
    off: function() {}
};

export default api;
