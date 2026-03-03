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
        this.fileInput = document.createElement("input");
        this.fileInput.type = "file";
        this.fileInput.accept = ".zip,.mcworld";
        this.fileInput.value = null;
        this.fileInput.onclick = () => { this.fileInput.value = null; };
        this.fileInput.onchange = () => this.handleData(this.wrapFiles(this.fileInput.files));

        this.folderInput = document.createElement("input");
        this.folderInput.type = "file";
        this.folderInput.webkitdirectory = true;
        this.folderInput.directory = true;
        this.folderInput.multiple = true;
        this.folderInput.value = null;
        this.folderInput.onclick = () => { this.folderInput.value = null; };
        this.folderInput.onchange = () => this.handleData(this.wrapFiles(this.folderInput.files));

        this.joke = jokes[Math.floor(Math.random() * jokes.length)];
    }

    wrapFiles = (files) => {
        return Array.from(files).map(file => ({
            path: "/" + ((file.webkitRelativePath ?? "") === "" ? file.name : file.webkitRelativePath),
            file: file
        }));
    };

    handleData = (files) => {
        if (!files || files.length === 0) return;

        if (files.length > 1) {
            this.setState({ selected: files[0].path.split('/')[1] || "Folder", processing: true, processingPercentage: 0 });
            let level = null;
            for (let i = 0; i < files.length; i++) {
                let fileObj = files[i];
                if (fileObj.path.endsWith("/level.dat")) {
                    level = fileObj.path.substring(0, fileObj.path.lastIndexOf("level.dat"));
                    break;
                }
            }
            if (level !== null) { 
                this.setState({filePath: level, filePathDirectory: true, processing: false}); 
            } else {
                this.app.showError("Invalid World", "No level.dat found.", null, undefined, true);
                this.setState({selected: false, detecting: false, processing: false});
            }
        } else if (files.length === 1) {
            const firstFile = files[0];
            let nameOnly = firstFile.file.name || firstFile.path;
            this.setState({ selected: nameOnly, filePath: nameOnly, filePathDirectory: false });
        }
    };

    getFiles = (entriesList) => {
        if (entriesList instanceof Array) { return Promise.all(entriesList.map(this.getFiles)); } 
        else { return new Promise((resolve, reject) => { entriesList.file((file) => resolve({ path: entriesList
