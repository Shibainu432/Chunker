const api = {
    baseUrl: 'https://chunker-2.onrender.com',

    send: async function (file, replyHandler) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            console.log("Starting HTTPS Upload...");
            const response = await fetch(`${this.baseUrl}/api/convert`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error("Conversion failed on server");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "converted_world.zip";
            document.body.appendChild(a);
            a.click();
            a.remove();

            if (replyHandler) replyHandler({ type: "response", success: true });
        } catch (error) {
            console.error(error);
            if (replyHandler) replyHandler({ type: "error", error: error.message });
        }
    },

    // Keep these so other files don't crash
    connect: function (cb) { if(cb) cb(); },
    isConnected: function () { return true; }
};
export default api;
