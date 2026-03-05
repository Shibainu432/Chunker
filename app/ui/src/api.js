const api = {
    baseUrl: window.location.hostname.includes('localhost') 
        ? 'http://localhost:10000' 
        : (window.location.hostname.includes('github.io') 
            ? 'https://chunker-2.onrender.com' 
            : ''), 

    // IMPORTANT: Make sure 'retries = 2' is right here in the arguments!
    send: async function (file, targetVersion = 'JE_1_21', replyHandler, retries = 2) {
    const formData = new FormData();
    // We wrap the file in a new Blob to "reset" the stream metadata
    const fileBlob = new Blob([file], { type: 'application/zip' });
    formData.append('file', fileBlob, "world.zip");
    formData.append('targetVersion', targetVersion);

    try {
        const response = await fetch(`${this.baseUrl}/api/convert`, {
            method: 'POST',
            body: formData,
            // 'manual' redirect and 'omit' credentials make the request 
            // look "anonymous" to your administrator firewall
            redirect: 'manual',
            credentials: 'omit',
        });

        if (!response.ok) throw new Error("Server Error");

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
        if (retries > 0) {
            return this.send(file, targetVersion, replyHandler, retries - 1);
        }
        console.error("Final API Error:", error);
        if (replyHandler) replyHandler({ 
            type: "error", 
            error: "Your administrator/network is blocking the upload. Try a smaller world or use Firefox." 
        });
    }
},
    connect: (cb) => { if(cb) cb(); },
    isConnected: () => true
};

export default api;
