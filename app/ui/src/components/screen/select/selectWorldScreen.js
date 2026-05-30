import React from "react";
import {BaseScreen} from "../baseScreen";
import {ModeScreen} from "../mode/modeScreen";
import api from "../../../api";
import {Round2DP} from "../../progress";

let jokes = [
    "How does Steve stay in shape? He runs around the block.",
    "How does Steve measure his shoe size? In square feet.",
    "What is a Creeper's favourite food? SSssSalad.",
    "Did you hear about the Creeper's party? It was a blast!",
    "Did you hear about the Minecraft movie? It's gonna be a blockbuster."
];

export class SelectWorldScreen extends BaseScreen {
    state = {
        version: undefined,
        detecting: false,
        progress: 0,
        animated: false,
        selected: undefined,
        filePath: undefined,
        filePathDirectory: undefined,
        processing: false,
        processingPercentage: 0,
        dragging: false,
        draggingOverBox: false
    };
    fileInput = undefined;
    folderInput = undefined;
    target = null;

    constructor(props) {
        super(props);

        let self = this;

        // --- file input (.zip / .mcworld) ---
        this.fileInput = document.createElement("input");
        this.fileInput.type = "file";
        this.fileInput.accept = ".zip,.mcworld";
        this.fileInput.value = null;
        this.fileInput.onclick = () => { self.fileInput.value = null; };
        this.fileInput.onchange = () => this.handleData(this.wrapFiles(self.fileInput.files));

        // --- folder input ---
        this.folderInput = document.createElement("input");
        this.folderInput.type = "file";
        this.folderInput.webkitdirectory = true;
        this.folderInput.directory = true;
        this.folderInput.multiple = true;
        this.folderInput.value = null;
        this.folderInput.onclick = () => { self.folderInput.value = null; };
        this.folderInput.onchange = () => this.handleData(this.wrapFiles(self.folderInput.files));

        this.joke = jokes[Math.floor(Math.random() * jokes.length)];
    }

    // -----------------------------------------------------------------------
    // File handling
    // -----------------------------------------------------------------------

    wrapFiles = (files) => {
        return Array.from(files).map(file => ({
            path: "/" + ((file.webkitRelativePath ?? "") === "" ? file.name : file.webkitRelativePath),
            file: file
        }));
    };

    handleData = (files) => {
        let self = this;

        if (files.length > 1) {
            // Multiple files → folder upload
            this.setState({
                selected: files[0].path.split('/')[1],
                processing: true,
                processingPercentage: 0
            });

            let level = null;
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                if (file.path.endsWith("/level.dat")) {
                    // For the web version, store the File object directly.
                    level = file.file;
                    break;
                }
            }

            if (level) {
                self.setState({ filePath: level, filePathDirectory: true, processing: false });
            } else {
                this.app.showError(
                    "Invalid World",
                    "The folder you selected did not contain a level.dat, please ensure you're using a Minecraft world folder.",
                    null, undefined, true
                );
                this.setState({ selected: false, detecting: false, processing: false });
            }
        } else {
            // Single file (.zip / .mcworld)
            let file = files[0].file;
            this.setState({
                selected: files[0].path.split('/')[1],
                filePath: file,
                filePathDirectory: false
            });
        }
    };

    // -----------------------------------------------------------------------
    // Drag-and-drop helpers (unchanged from original web version)
    // -----------------------------------------------------------------------

    getFiles = (entriesList) => {
        let self = this;
        if (entriesList instanceof Array) {
            return Promise.all(entriesList.map(self.getFiles));
        } else {
            return new Promise((resolve, reject) => {
                entriesList.file(
                    (file) => resolve({ path: entriesList.fullPath, file: file }),
                    reject
                );
            });
        }
    };

    readEntriesAsync = (rootEntry) => {
        let reader = rootEntry.createReader();
        let entriesArr = [];
        return new Promise((resolve, reject) => {
            reader.readEntries((entries) => {
                entries.forEach((entry) => entriesArr.push(entry));
                resolve(entriesArr);
            }, reject);
        });
    };

    walkEntriesAsync = (node) => {
        let self = this;
        if (node.isDirectory) {
            return new Promise((resolve, reject) => {
                self.readEntriesAsync(node).then((entries) => {
                    let dirPromises = entries.map((dir) => self.walkEntriesAsync(dir));
                    return Promise.all(dirPromises).then((fileSets) => resolve(fileSets));
                });
            });
        } else {
            return Promise.resolve(node);
        }
    };

    onDrop = (e) => {
        e.preventDefault();
        this.setState({ dragging: false, draggingOverBox: false });

        if (e.dataTransfer === undefined) return;
        if (e.dataTransfer.items === undefined) return;
        if (e.dataTransfer.items.length === 0) return;

        let promises = [];
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
            let entry = e.dataTransfer.items[i].webkitGetAsEntry();
            promises.push(this.walkEntriesAsync(entry).then(this.getFiles));
        }

        Promise.all(promises).then((result) => {
            this.handleData(result.flat(10));
        });
    };

    onDragOver     = (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "none"; };
    onDragEnter    = (e) => { e.preventDefault(); this.target = e.target; this.setState({ dragging: true }); };
    onDragBoxOver  = (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "copy"; this.setState({ draggingOverBox: true }); };
    onDragStop     = (e) => { e.preventDefault(); if (e.target !== this.target) return; this.setState({ dragging: false }); };
    onDragBoxStop  = ()  => { this.setState({ draggingOverBox: false }); };

    // -----------------------------------------------------------------------
    // Navigation
    // -----------------------------------------------------------------------

    nextScreen       = () => this.app.setScreen(ModeScreen);
    showFileBrowser  = () => this.fileInput.click();
    showFolderBrowser= () => this.folderInput.click();

    // -----------------------------------------------------------------------
    // Session start — stores the file then navigates through the full flow
    // -----------------------------------------------------------------------

    startSession = () => {
        this.setState({ detecting: true, progress: 0 });

        let file = this.state.filePath;

        // Validate file extension for single-file uploads
        if (!this.state.filePathDirectory
            && !file.name.endsWith('.zip')
            && !file.name.endsWith('.mcworld')) {
            this.app.showError(
                'Failed to load world',
                'Only .zip and .mcworld files can be used.',
                undefined, undefined, false
            );
            this.setState({ detecting: false });
            return;
        }

        // Hand the file to api.js so processingScreen can reach it later
        // when it calls api.send({ type:'flow', method:'convert', ... }).
        api.setFile(file);

        // Use the same message-passing interface as the rest of the app.
        api.send(
            { type: 'flow', method: 'select_world', path: file.name },
            (message) => {
                if (message.type === 'response') {
                    this.app.updateSession(message.output);
                    this.setState({ detecting: false });
                    this.app.generateSettings(); // kicks off the settings fetch
                    this.nextScreen();           // → ModeScreen
                } else if (message.type === 'error') {
                    this.setState({ detecting: false });
                    this.app.showError(
                        'Failed to load world',
                        message.error,
                        message.errorId,
                        message.stackTrace,
                        false
                    );
                }
            }
        );
    };

    cancel = () => {
        this.setState({ selected: false, detecting: false, processing: false });
    };

    // For the web version, no WebSocket connection is needed.
    makeConnection = (callback) => { api.connect(callback); };

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    componentDidMount() {
        super.componentDidMount();
        document.addEventListener("dragover", this.onDragOver);
        window.addEventListener("dragenter", this.onDragEnter);
        window.addEventListener("dragleave", this.onDragStop);
    }

    componentWillUnmount() {
        document.removeEventListener("dragover", this.onDragOver);
        window.removeEventListener("dragenter", this.onDragEnter);
        window.removeEventListener("dragleave", this.onDragStop);
    }

    // -----------------------------------------------------------------------
    // Render — identical markup to the original HiveGamesOSS desktop version
    // -----------------------------------------------------------------------

    render() {
        return (
            <div className={"maincol"}>
                <div className="topbar">
                    <h1>Select World</h1>
                    <h2>Select your world folder or archive.</h2>
                </div>

                {/* ---- Initial state: no file selected, not dragging ---- */}
                {!this.state.selected && !this.state.dragging &&
                    <div className="main_content select_world">
                        <button onClick={this.showFolderBrowser} className="gray_box">
                            Choose world folder
                            <span>Select the world folder, we'll do the rest</span>
                        </button>
                        <button onClick={this.showFileBrowser} className="gray_box">
                            Select archive
                            <span>Supported types: .zip, .mcworld</span>
                        </button>
                    </div>
                }

                {/* ---- Drag-over state ---- */}
                {!this.state.selected && this.state.dragging &&
                    <div className="main_content select_world">
                        <button
                            className={"gray_box drag_box" + (this.state.draggingOverBox ? " dragged_over" : "")}
                            onDrop={this.onDrop}
                            onDragOver={this.onDragBoxOver}
                            onDragLeave={this.onDragBoxStop}>
                            Drop your worlds here!
                            <span>Supported types: .zip, .mcworld and directories</span>
                        </button>
                    </div>
                }

                {/* ---- Processing folder (zipping files) ---- */}
                {this.state.selected && this.state.processing &&
                    <div className="main_content main_content_progress">
                        <h3>Preparing World: <span>{Round2DP(this.state.processingPercentage)}%</span></h3>
                        <div className="progress_bar">
                            <div className="progress_fill" style={{width: this.state.processingPercentage + "%"}}/>
                        </div>
                        <p>Please wait while we prepare your world. This won't take too long...</p>
                    </div>
                }

                {/* ---- File selected, ready to start ---- */}
                {this.state.selected && !this.state.processing && !this.state.detecting &&
                    <div className="main_content main_content_progress">
                        <h3>World Selected</h3>
                        <p>Your world <span className="world_name">{this.state.selected}</span> is ready to be loaded.</p>
                    </div>
                }

                {/* ---- Detecting / loading ---- */}
                {this.state.selected && !this.state.processing && this.state.detecting &&
                    <div className="main_content main_content_progress">
                        {!this.state.animated &&
                            <h3>Preparing World: <span>{Round2DP(this.state.progress)}%</span></h3>}
                        {this.state.animated && <h3>Detecting world version</h3>}
                        <div className={this.state.animated ? "progress_bar animated" : "progress_bar"}>
                            {!this.state.animated &&
                                <div className="progress_fill" style={{width: this.state.progress + "%"}}/>}
                        </div>
                        {!this.state.animated && <p>Please wait while we prepare your world.</p>}
                        {this.state.animated &&
                            <p>Please wait while we work out what version of Minecraft this world is.</p>}
                        <p>{this.joke}</p>
                    </div>
                }

                {/* ---- Bottom bar ---- */}
                <div className="bottombar">
                    {this.state.selected && !this.state.processing && !this.state.detecting &&
                        <button className="button red" onClick={this.cancel}>Cancel</button>
                    }
                    <button
                        className="button green"
                        disabled={this.state.detecting || !this.state.selected || this.state.processing}
                        onClick={this.startSession}>
                        Start
                    </button>
                </div>
            </div>
        );
    }
}
