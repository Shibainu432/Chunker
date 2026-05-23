// api.js - adapter that translates the original WebSocket-style API to REST
let pendingFile = null;
let pendingTargetVersion = 'JAVA_1_21_0';

const BACKEND_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:10000'
    : 'https://chunker-2.onrender.com';

const api = {
    // Called by selectWorldScreen to store the file before navigating
    setFile: (file, targetVersion) => {
        pendingFile = file;
        if (targetVersion) pendingTargetVersion = targetVersion;
    },

    getFile: () => pendingFile,

    send: function (obj, replyHandler) {
        // Route each message type appropriately
        switch (obj.type) {
            case 'flow':
                this._handleFlow(obj, replyHandler);
                break;
            case 'settings':
            case 'mappings':
                // ACK immediately — your backend handles everything in one shot
                if (replyHandler) replyHandler({ type: 'response' });
                break;
            default:
                if (replyHandler) replyHandler({ type: 'response' });
        }
    },

    _handleFlow: function (obj, replyHandler) {
        switch (obj.method) {
            case 'select_world':
                // Return mock session data so the app can navigate to ModeScreen
                if (replyHandler) replyHandler({
                    type: 'response',
                    output: {
                        session: 'web-session',
                        version: {
                            input: { id: 'JAVA_1_21_0' },
                            warnings: null,
                            writers: [
                                { id: 'JAVA_1_21_0', version: '1.21.0' },
                                { id: 'JAVA_1_20_4', version: '1.20.4' },
                                { id: 'BEDROCK_1_21_0', version: '1.21.0' },
                            ]
                        },
                        preloaded_settings: {}
                    }
                });
                break;

            case 'generate_settings':
                // Return minimal settings so WorldSettingsTab doesn't crash
                replyHandler({ type: 'progress', continue: true, percentage: 0.5, animated: true });
                setTimeout(() => {
                    replyHandler({
                        type: 'response',
                        output: {
                            session: 'web-session',
                            dimensions: [
                                'minecraft:overworld',
                                'minecraft:the_nether',
                                'minecraft:the_end'
                            ],
                            settings: {
                                'World Settings': [
                                    { name: 'LevelName', value: 'World', type: 'String' },
                                    { name: 'SpawnX', value: 0, type: 'Int32' },
                                    { name: 'SpawnY', value: 64, type: 'Int32' },
                                    { name: 'SpawnZ', value: 0, type: 'Int32' },
                                ],
                                'Game Rules': [],
                            }
                        }
                    });
                }, 500);
                break;

            case 'generate_preview':
                // Skip preview — return empty
                replyHandler({ type: 'response', output: '' });
                break;

            case 'convert':
                this._doConvert(obj, replyHandler);
                break;

            case 'save':
                // Download is triggered by the href in saveScreen, just ACK
                if (replyHandler) replyHandler({ type: 'response' });
                break;

            case 'cancel':
                if (replyHandler) replyHandler({ type: 'response' });
                break;

            default:
                if (replyHandler) replyHandler({ type: 'response' });
        }
    },

    _doConvert: async function (obj, replyHandler) {
        const file = pendingFile;
        if (!file) {
            replyHandler({ type: 'error', error: 'No file selected.' });
            return;
        }

        replyHandler({ type: 'progress', continue: true, percentage: 0.1, animated: true });

        const formData = new FormData();
        // Pass the File object directly — don't re-wrap in a Blob,
        // it loses the filename and confuses multipart parsing
        formData.append('file', file, file.name || 'world.zip');
        formData.append('targetVersion', obj.outputType || pendingTargetVersion);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 300000);

        try {
            replyHandler({ type: 'progress', continue: true, percentage: 0.3, animated: true });

            const response = await fetch(`${BACKEND_URL}/api/convert`, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
                credentials: 'omit',
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const text = await response.text().catch(() => 'Unknown server error');
                throw new Error(`Server error ${response.status}: ${text}`);
            }

            replyHandler({ type: 'progress', continue: true, percentage: 0.9, animated: false });

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            replyHandler({
                type: 'response',
                output: {
                    download: downloadUrl,
                    anonymousId: '',
                    missingIdentifiers: []
                }
            });

        } catch (error) {
            clearTimeout(timeout);
            console.error('Convert error:', error);
            replyHandler({
                type: 'error',
                error: error.name === 'AbortError'
                    ? 'Request timed out (5 min limit). Try a smaller world.'
                    : error.message
            });
        }
    },

    connect: (cb) => { if (cb) cb(); },
    isConnected: () => true,
    close: () => {}
};

export default api;
