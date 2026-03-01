let api = {
    connection: undefined,
    replyHandlers: {},
connect: function (connectHandler) {
        let self = this;
        
        // 1. Point to your Render Backend (Use 'wss://' for secure websockets)
        // Example: 'wss://your-app-name.onrender.com'
        let backendUrl = 'wss://YOUR_RENDER_URL_HERE'; 

        // 2. Create a standard Web Browser connection
        let socket = new WebSocket(backendUrl);

        socket.onopen = function () {
            self.connection = socket; // Save the connection
            connectHandler();
        };

        socket.onclose = function (e) {
            self.connection = undefined;
            connectHandler(e.code);
        };

        socket.onmessage = function (e) {
            let msg = JSON.parse(e.data);
            let requestId = msg.requestId;
            
            if (self.replyHandlers[requestId]) {
                let handler = self.replyHandlers[requestId];
                if (msg.continue === undefined || msg.continue === false) {
                    delete self.replyHandlers[requestId];
                }
                handler(msg);
            }
        };

        socket.onerror = function (error) {
            console.error("WebSocket Error: ", error);
        };
    },
    send: function (obj, replyHandler) {
        obj.requestId = crypto.randomUUID();// Generate random id
        if (this.connection !== undefined) {
            this.replyHandlers[obj.requestId] = replyHandler;
            this.connection.send(JSON.stringify(obj));
        } else {
            throw Error("Not connected!");
        }
    },
    isConnected: function () {
        return this.connection !== undefined;
    },
    close: function () {
        if (this.isConnected()) {
            this.connection.close();
        }
    }
};

export default api;
