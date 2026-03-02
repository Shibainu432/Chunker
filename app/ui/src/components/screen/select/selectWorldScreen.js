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

        // Setup fileInput
        this.fileInput = document.createElement("input");
        this.fileInput.type = "file";
        this.fileInput.accept = ".zip,.mcworld";
        this.fileInput.value = null;
        this.fileInput.onclick = () => {
            this.fileInput.value = null;
        };
        this.fileInput.onchange = () => this.handleData(this.wrapFiles(this.fileInput.files));

        // Setup folderInput
        this.folderInput = document.createElement("input");
        this.folderInput.type = "file";
        this.folderInput.webkitdirectory = true;
        this.folderInput.directory = true;
        this.folderInput.multiple = true;
        this.folderInput.value = null;
        this.folderInput.onclick = () => {
            this.folderInput.value = null;
        };
        this.folderInput.onchange = () => this.handleData(this.wrapFiles(this.folderInput.files));

        // Pick random joke
        this.joke = jokes[Math.floor(Math.random() * jokes.length)];
    }

    wrapFiles = (files) => {
        return Array.from(files).map(file => ({
            path: "/" + ((file.webkitRelativePath ?? "") === "" ? file.name : file.webkitRelativePath),
            file: file
        }));
    };

    handleData = (files) => {
        if (!files || files.length === 0) {
            console.error("handleData called with no files");
            return;
        }

        if (files.length > 1) {
            this.setState({
                selected: files[0].path.split('/')[1] || "Folder",
                processing: true,
                processingPercentage: 0
            });

            let level = null;
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                if (file.path.endsWith("/level.dat")) {
                    // Safe guard for Desktop vs Web
                    const chunkerApi = window.chunker;
                    let fullPath = (chunkerApi && chunkerApi.getPathForFile)
                        ? chunkerApi.getPathForFile(file.file)
                        : file.path;

                    if (fullPath && fullPath.indexOf("level.dat") !== -1) {
                        level = fullPath.substring(0, fullPath.lastIndexOf("level.dat"));
                    } else {
                        level = "/";
                    }
                    break;
                }
            }
            if (level) {
                this.setState({filePath: level, filePathDirectory: true, processing: false});
            } else {
                this.app.showError("Invalid World", "The folder you selected did not contain a level.dat, please ensure you're using a Minecraft world folder.", null, undefined, true);
                this.setState({selected: false, detecting: false, processing: false});
            }
        } else if (files.length === 1) {
            const firstFile = files[0];
            const displayPath = firstFile?.path?.split('/')[1] || firstFile?.file?.name || "Unknown World";

            // Safe guard for Desktop vs Web
            const chunkerApi = window.chunker;
            let fullPath = (chunkerApi && chunkerApi.getPathForFile)
                ? chunkerApi.getPathForFile(firstFile.file)
                : (firstFile.file.name || firstFile.path);

            this.setState({
                selected: displayPath,
                filePath: fullPath,
                filePathDirectory: false
            });
        }
    };

    getFiles = (entriesList) => {
        if (entriesList instanceof Array) {
            return Promise.all(entriesList.map(this.getFiles));
        } else {
            return new Promise((resolve, reject) => {
                entriesList.file((file) => resolve({
                    path: entriesList.fullPath,
                    file: file
                }), reject);
            });
        }
    };

    readEntriesAsync = (rootEntry) => {
        let reader = rootEntry.createReader();
        let entriesArr = [];
        return new Promise((resolve, reject) => {
            reader.readEntries((entries) => {
                entries.forEach((entry) => {
                    entriesArr.push(entry);
                });
                resolve(entriesArr);
            }, reject);
        });
    };

    walkEntriesAsync = (node) => {
        if (node.isDirectory) {
            return new Promise((resolve, reject) => {
                this.readEntriesAsync(node).then((entries) => {
                    let dirPromises = entries.map((dir) => this.walkEntriesAsync(dir));
                    return Promise.all(dirPromises).then((fileSets) => {
                        resolve(fileSets);
                    });
                });
            });
        } else {
            return Promise.resolve(node);
        }
    };

    onDrop = (e) => {
        e.preventDefault();
        this.setState({dragging: false, draggingOverBox: false});
        if (e.dataTransfer === undefined || e.dataTransfer.items.length === 0) return;
        let promises = [];
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
            let item = e.dataTransfer.items[i];
            let entry = item.webkitGetAsEntry();
            promises.push(this.walkEntriesAsync(entry).then(this.getFiles));
        }
        Promise.all(promises).then((result) => {
            let list = result.flat(10);
            this.handleData(list);
        });
    };

    onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "none";
    };

    onDragEnter = (e) => {
        e.preventDefault();
        this.target = e.target;
        this.setState({dragging: true});
    };

    onDragBoxOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        this.setState({draggingOverBox: true});
    };

    onDragStop = (e) => {
        e.preventDefault();
        if (e.target !== this.target) return;
        this.setState({dragging: false});
    };

    onDragBoxStop = (e) => {
        this.setState({draggingOverBox: false});
    };

    nextScreen = () => this.app.setScreen(ModeScreen);
    showFileBrowser = () => this.fileInput.click();
    showFolderBrowser = () => this.folderInput.click();

    startSession = () => {
        this.setState({
            detecting: true,
            progress: 0,
        });
        let name = this.state.filePath || "";
        if (!this.state.filePathDirectory && !name.endsWith(".zip") && !name.endsWith(".mcworld")) {
            this.app.showError("Failed to load world", "Only .zip and .mcworld files can be used.", undefined, undefined, false);
            this.setState({detecting: false});
            return;
        }
        this.makeConnection(() => {
            api.send({
                type: "flow",
                method: "select_world",
                path: this.state.filePath,
            }, (message) => {
                if (message.type === "response") {
                    this.app.updateSession(message.output);
                    this.setState({ detecting: false });
                    this.app.generateSettings();
                    this.nextScreen();
                } else if (message.type === "progress" || message.type === "progress_state") {
                    this.setState({
                        progress: message.percentage * 100,
                        animated: message.animated || false
                    });
                } else {
                    if (message?.error) {
                        this.app.showError("Failed to load world", message.error, message.errorId, message.stackTrace, false);
                    } else {
                        this.app.showError("Failed to load world", "Something went wrong communicating with the backend process.", undefined, undefined, false, true);
                    }
                    this.setState({detecting: false});
                }
            });
        });
    };

    cancel = () => {
        this.setState({selected: false, detecting: false, processing: false});
    };

    makeConnection = (callback) => {
        let ignoreError = false;
        let listener = () => ignoreError = true;
        window.addEventListener("beforeunload", listener);
        api.connect((errorCode) => {
            if (api.isConnected()) {
                callback();
            } else if (!ignoreError) {
                let errorMessages = {
                    529: "Your address is making too many requests, please wait then try again.",
                    408: "Your connection timed out, please ensure you're on a stable connection.",
                    "-100": "Unable to run chunker-cli backend.",
                    1: "The backend process was killed unexpectedly.",
                    12: "Your system ran out of memory while converting."
                };
                let msg = errorMessages[errorCode] || "Something went wrong communicating with the backend process.";
                this.app.showError("Failed to connect to backend", msg, null, undefined, false, true);
                window.removeEventListener("beforeunload", listener)
            }
        });
    };

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

    render() {
        return (
            <div className={"maincol"}>
                <div className="topbar">
                    <h1>Select World</h1>
                    <h2>Select your world folder or archive.</h2>
                </div>
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
                {!this.state.selected && this.state.dragging &&
                    <div className="main_content select_world">
                        <button
                            className={"gray_box drag_box" + (this.state.draggingOverBox ? " dragged_over" : "")}
                            onDrop={this.onDrop} onDragOver={this.onDragBoxOver} onDragLeave={this.onDragBoxStop}>
                            Drop your worlds here!
                            <span>Supported types: .zip, .mcworld and directories</span>
                        </button>
                    </div>
                }
                {this.state.selected && this.state.processing &&
                    <div className="main_content main_content_progress">
                        <h3>Preparing World: <span>{Round2DP(this.state.processingPercentage)}%</span></h3>
                        <div className="progress_bar">
                            <div className="progress_fill" style={{width: this.state.processingPercentage + "%"}}/>
                        </div>
                        <p>Please wait while we prepare your world...</p>
                    </div>
                }
                {this.state.selected && !this.state.processing && !this.state.detecting &&
                    <div className="main_content main_content_progress">
                        <h3>World Selected</h3>
                        <p>Your world <span className="world_name">{this.state.selected}</span> is ready.</p>
                    </div>
                }
                {this.state.selected && !this.state.processing && this.state.detecting &&
                    <div className="main_content main_content_progress">
                        {!this.state.animated && <h3>Preparing World: <span>{Round2DP(this.state.progress)}%</span></h3>}
                        {this.state.animated && <h3>Detecting world version</h3>}
                        <div className={this.state.animated ? "progress_bar animated" : "progress_bar"}>
                            {!this.state.animated && <div className="progress_fill" style={{width: this.state.progress + "%"}}/>}
                        </div>
                        <p>{this.joke}</p>
                    </div>
                }
                <div className="bottombar">
                    {this.state.selected && !this.state.processing && !this.state.detecting &&
                        <button className="button red" onClick={this.cancel}>Cancel</button>
                    }
                    <button
                        className="button green"
                        disabled={this.state.detecting || !this.state.selected || this.state.processing}
                        onClick={this.startSession}>Start
                    </button>
                </div>
            </div>
        );
    }
}
