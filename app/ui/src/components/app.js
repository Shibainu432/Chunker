// api.js — translates the original WebSocket-style message-passing API into
// REST calls against the Render backend.  Drop this into app/ui/src/api.js.

let pendingFile = null;
let pendingTargetVersion = 'JAVA_1_21_0';

const BACKEND_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:10000'
    : 'https://chunker-2.onrender.com';

// ---------------------------------------------------------------------------
// Mock session / settings data — shaped to match the OLDER app.js (doc 71)
// which uses "OVERWORLD" / "NETHER" / "THE_END" keys and array pruning.
// ---------------------------------------------------------------------------
const MOCK_SESSION = {
    session: 'web-session',
    version: {
        input: { id: 'JAVA_1_21_0' },
        warnings: null,
        writers: [
            { id: 'JAVA_1_21_0',  version: '1.21.0'  },
            { id: 'JAVA_1_20_4',  version: '1.20.4'  },
            { id: 'JAVA_1_20_0',  version: '1.20.0'  },
            { id: 'JAVA_1_19_4',  version: '1.19.4'  },
            { id: 'JAVA_1_18_2',  version: '1.18.2'  },
            { id: 'JAVA_1_17_1',  version: '1.17.1'  },
            { id: 'JAVA_1_16_5',  version: '1.16.5'  },
            { id: 'BEDROCK_1_21_0', version: '1.21.0' },
            { id: 'BEDROCK_1_20_0', version: '1.20.0' },
            { id: 'BEDROCK_1_19_0', version: '1.19.0' },
        ]
    },
    preloaded_settings: {}
};

// Matches the structure consumed by worldSettingsTab + dimensionPruningTab
// (older versions that use DIMENSIONS = ["OVERWORLD","NETHER","THE_END"]).
const MOCK_SETTINGS = {
    dimensions: ['OVERWORLD', 'NETHER', 'THE_END'],
    settings: {
        'World Settings': [
            { name: 'LevelName',  value: 'World', type: 'String'  },
            { name: 'SpawnX',     value: 0,       type: 'Int32'   },
            { name: 'SpawnY',     value: 64,      type: 'Int32'   },
            { name: 'SpawnZ',     value: 0,       type: 'Int32'   },
            { name: 'Time',       value: 0,       type: 'Int64'   },
            { name: 'Difficulty', value: 2,       type: 'Int32'   },
            { name: 'GameType',   value: 0,       type: 'Int32'   },
        ],
        'Game Rules': [],
        'Weather': [],
        'Misc': [],
    }
};

// ---------------------------------------------------------------------------
// Public API object
// ---------------------------------------------------------------------------
const api = {

    // Called by selectWorldScreen before starting the flow.
    setFile: (file, targetVersion) => {
        pendingFile = file;
        if (targetVersion) pendingTargetVersion = targetVersion;
    },

    getFile: () => pendingFile,

    // Main entry point — mirrors the original api.send(obj, replyHandler) signature.
    send: function (obj, replyHandler) {
        switch (obj.type) {
            case 'flow':
                this._handleFlow(obj, replyHandler);
                break;

            // settings / mappings calls are all immediately ACK'd;
            // the actual conversion happens in one shot via 'convert'.
            case 'settings':
            case 'mappings':
                if (replyHandler) replyHandler({ type: 'response' });
                break;

            default:
                if (replyHandler) replyHandler({ type: 'response' });
        }
    },

    _handleFlow: function (obj, replyHandler) {
        switch (obj.method) {

            case 'select_world':
                // Synchronous mock — hands the app a fake session so it can
                // navigate through ModeScreen → SettingsScreen → ProcessingScreen.
                if (replyHandler) replyHandler({
                    type:   'response',
                    output: MOCK_SESSION
                });
                break;

            case 'generate_settings':
                // Show the animated bar briefly, then deliver settings.
                if (replyHandler) {
                    replyHandler({ type: 'progress_state', continue: true,
                                   percentage: 0.4, animated: true,
                                   name: 'Grabbing world information' });
                    setTimeout(() => {
                        replyHandler({ type: 'response', output: MOCK_SETTINGS });
                    }, 400);
                }
                break;

            case 'generate_preview':
                // Return an empty base64 string → app sets previewData = []
                // (the Leaflet map renders but tiles show as blank, which is fine).
                if (replyHandler) replyHandler({ type: 'response', output: '' });
                break;

            case 'convert':
                this._doConvert(obj, replyHandler);
                break;

            case 'save':
                // The actual download is triggered by the <a href> in saveScreen.
                // We just ACK so the UI transitions to "Saved".
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
            if (replyHandler) replyHandler({
                type:  'error',
                error: 'No file selected. Please go back and select a world file.'
            });
            return;
        }

        // --- progress: upload starting ---
        if (replyHandler) replyHandler({
            type: 'progress_state', continue: true,
            percentage: 0.05, animated: true,
            name: 'Uploading world'
        });

        const formData = new FormData();

        // Pass the File object directly — do NOT re-wrap in new Blob().
        // Re-wrapping loses the filename, which can confuse multipart parsing
        // on the backend and causes silent conversion failures.
        formData.append('file', file, file.name || 'world.zip');
        formData.append('targetVersion', obj.outputType || pendingTargetVersion);

        const controller = new AbortController();
        // 5-minute timeout for large worlds on slow connections.
        const timeout = setTimeout(() => controller.abort(), 300_000);

        try {
            // --- progress: waiting for server ---
            if (replyHandler) replyHandler({
                type: 'progress_state', continue: true,
                percentage: 0.3, animated: true,
                name: 'Converting world'
            });

            const response = await fetch(`${BACKEND_URL}/api/convert`, {
                method:      'POST',
                body:        formData,
                signal:      controller.signal,
                credentials: 'omit',
                // Do NOT manually set Content-Type when sending FormData —
                // the browser must set it (with the multipart boundary) itself.
            });

            clearTimeout(timeout);

            if (!response.ok) {
                // Try to surface whatever error text the backend returned.
                const text = await response.text().catch(() => '');
                throw new Error(
                    `Server responded ${response.status}` +
                    (text ? `: ${text.slice(0, 200)}` : '')
                );
            }

            // --- progress: downloading result ---
            if (replyHandler) replyHandler({
                type: 'progress_state', continue: true,
                percentage: 0.9, animated: false,
                name: 'Preparing download'
            });

            const blob        = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            // Final message — no 'continue' flag, so progress.pipe() forwards
            // it to the handler in processingScreen, which sets convertResult
            // and navigates to saveScreen.
            if (replyHandler) replyHandler({
                type:   'response',
                output: {
                    download:           downloadUrl,
                    anonymousId:        '',
                    missingIdentifiers: []
                }
            });

        } catch (error) {
            clearTimeout(timeout);
            console.error('Conversion error:', error);

            const msg = error.name === 'AbortError'
                ? 'Request timed out after 5 minutes. Try a smaller world or use Firefox.'
                : error.message;

            if (replyHandler) replyHandler({ type: 'error', error: msg });
        }
    },

    // These three are called by selectWorldScreen / index.js.
    connect:     (cb) => { if (cb) cb(); },
    isConnected: ()   => true,
    close:       ()   => {}
};

export default api;
