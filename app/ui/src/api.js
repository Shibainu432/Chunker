let api = {
    connection: undefined,
    replyHandlers: {},
    connect: function (connectHandler) {
        let self = this;
        // Use the root path first to test if Render prefers it
        let backendUrl = 'wss://chunker-2.onrender.com'; 
        
        console.log("Connecting to Render Backend...");
        let socket = new WebSocket(backendUrl);

        socket.onopen = function () {
            console.log("Connected!");
            self.connection = socket;
            connectHandler();
        };

        socket.onclose = function (e) {
            console.log("Closed. Code:", e.code);
            self.connection = undefined;
            connectHandler(e.code);
        };

        socket.onmessage = function (e) {
            let msg = JSON.parse(e.data);
            if (self.replyHandlers[msg.requestId]) {
                self.replyHandlers[msg.requestId](msg);
                if (!msg.continue) delete self.replyHandlers[msg.requestId];
            }
        };

        socket.onerror = function (err) {
            console.error("Connection failed. Check Render Logs for CORS or Port errors.");
        };
    },
    send: function (obj, replyHandler) {
        obj.requestId = Math.random().toString(36).substring(2);
        if (this.connection) {
            this.replyHandlers[obj.requestId] = replyHandler;
            this.connection.send(JSON.stringify(obj));
        }
    }
};
export default api;
