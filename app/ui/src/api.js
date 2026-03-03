let api = {
    connection: undefined,
    replyHandlers: {},
    connect: function (connectHandler) {
        // Use 'api' instead of 'this' or 'self' inside the listeners
        let backendUrl = 'wss://chunker-2.onrender.com/'; 
        
        console.log("Connecting to Render Backend...");
        let socket = new WebSocket(backendUrl);

        socket.onopen = function () {
            console.log("Connected successfully!");
            api.connection = socket;
            if (connectHandler) connectHandler();
        };

        socket.onclose = function (e) {
            console.log("WebSocket Closed. Code:", e.code);
            api.connection = undefined;
            // This fix prevents the selectWorldScreen.js:165 crash
            if (connectHandler) connectHandler(e.code);
        };

        socket.onmessage = function (e) {
            let msg = JSON.parse(e.data);
            if (api.replyHandlers[msg.requestId]) {
                api.replyHandlers[msg.requestId](msg);
                if (!msg.continue) delete api.replyHandlers[msg.requestId];
            }
        };

        socket.onerror = function (err) {
            console.error("Connection failed. Check Render Logs for CORS or Port errors.");
        };
    },
    send: function (obj, replyHandler) {
        obj.requestId = Math.random().toString(36).substring(2);
        if (api.isConnected()) {
            api.replyHandlers[obj.requestId] = replyHandler;
            api.connection.send(JSON.stringify(obj));
        }
    },
    isConnected: function () {
        return api.connection !== undefined && api.connection.readyState === WebSocket.OPEN;
    }
};

export default api;
