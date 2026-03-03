const api = {
    // Standard HTTPS URL for your Render service
    baseUrl: 'https://chunker-2.onrender.com',

    // This replaces the old 'send' logic to work with your server.js
    send: async function (fileData, replyHandler) {
        // fileData usually comes from SelectWorldScreen as an object
        // We need the actual File object to upload it
        const file = fileData.file || fileData; 

        const formData = new FormData();
        formData.append('file', file);

        console.log("Uploading world to Chunker Backend...");

        try {
            const response = await fetch(`${this.baseUrl}/api/convert`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Server error during conversion");
            }

            // Once the server finishes, it sends a file back
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            // Create a hidden link to trigger the download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `converted-${file.name || 'world.zip'}`;
            document.body.appendChild(link);
            link.click();
            link.remove();

            console.log("Conversion complete!");
            
            // Fake a success response so the UI knows to stop loading
            if (replyHandler) replyHandler({ type: "response", output: { success: true } });

        } catch (err) {
            console.error("Upload failed:", err);
            alert("Error: " + err.message);
            if (replyHandler) replyHandler({ type: "error", error: err.message });
        }
    },

    // Dummy functions to keep SelectWorldScreen from crashing
    connect: function (callback) {
        console.log("HTTP Mode: Connection ready.");
        if (callback) callback();
    },

    isConnected: function () {
        return true; 
    }
};

export default api;
