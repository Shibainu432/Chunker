const api = {
    baseUrl: window.location.hostname.includes('localhost') 
        ? 'http://localhost:10000' 
        : (window.location.hostname.includes('github.io') || window.location.hostname.includes('onrender.com')
            ? 'https://chunker-2.onrender.com' 
            : ''),

    // IMPORTANT: Make sure 'retries = 2' is right here in the arguments!
    send: async function (file, targetVersion = 'JE_1_21', replyHandler, retries = 2) {
    console.log(`Starting upload to ${this.baseUrl}/api/convert...`);
    const formData = new FormData();
    const fileBlob = new Blob([file], { type: 'application/zip' });
    formData.append('file', fileBlob, "world.zip");
    formData.append('targetVersion', targetVersion);

    // Create a controller to handle the timeout
    const controller = new AbortController();
    // Set timeout to 5 minutes (300,000 milliseconds) for slow uploads
    const timeoutId = setTimeout(() => controller.abort(), 300000); 

    try {
        const response = await fetch(`${this.baseUrl}/api/convert`, {
            method: 'POST',
            body: formData,
            signal: controller.signal, // Connect the timeout signal
            redirect: 'follow', // Changed from 'manual' to be more stable
            credentials: 'omit',
        });

        clearTimeout(timeoutId); // Cancel the timeout if it succeeds
        console.log(`Response received: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Server error details: ${errorText}`);
            throw new Error("Server Error");
        }

        console.log("Download starting...");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "converted_world.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        console.log("Download triggered!");

        if (replyHandler) replyHandler({ type: "response", success: true });

    } catch (error) {
        console.error(`Attempt failed (${retries} retries left):`, error);
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
