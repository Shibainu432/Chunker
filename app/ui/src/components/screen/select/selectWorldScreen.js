import React from "react";
import {BaseScreen} from "../baseScreen";
import {ModeScreen} from "../mode/modeScreen";
import api from "../../../api";
import {Round2DP} from "../../progress";

export class SelectWorldScreen extends BaseScreen {
    state = {
        selectedFile: null,
        detecting: false,
        progress: 0,
        animated: false
    };

    handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            this.setState({ selectedFile: file });
        }
    };

    startSession = () => {
        if (!this.state.selectedFile) {
            this.app.showError("No file", "Please select a world file first.");
            return;
        }

        this.setState({ detecting: true, progress: 0 });

        // Create FormData to send file to backend
        const formData = new FormData();
        formData.append('file', this.state.selectedFile);
        formData.append('targetVersion', 'JAVA_1_21');

        // Send to backend
        fetch('https://chunker-2.onrender.com/api/convert', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) throw new Error('Upload failed');
            return response.blob();
        })
        .then(blob => {
            // Auto-download the converted world
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.state.selectedFile.name.replace(/\.[^/.]+$/, '') + '_converted.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.setState({ detecting: false });
            this.app.showError("Success", "Your world has been converted and downloaded!");
        })
        .catch(error => {
            this.setState({ detecting: false });
            this.app.showError("Error", error.message);
        });
    };

    render() {
        return (
            <div className="maincol">
                <div className="topbar">
                    <h1>Select World</h1>
                    <h2>Select your Minecraft world file to convert</h2>
                </div>
                <div className="main_content select_world">
                    <div className="white_box">
                        <label htmlFor="file-input">Select a world file (.zip or .mcworld):</label>
                        <input
                            id="file-input"
                            type="file"
                            accept=".zip,.mcworld"
                            onChange={this.handleFileSelect}
                        />
                        {this.state.selectedFile && (
                            <p>Selected: <strong>{this.state.selectedFile.name}</strong></p>
                        )}
                    </div>

                    {this.state.detecting && (
                        <div className="main_content_progress">
                            <h3>Converting...</h3>
                            <p>Please wait while your world is being converted.</p>
                        </div>
                    )}
                </div>
                <div className="bottombar">
                    <button
                        className="button green"
                        disabled={!this.state.selectedFile || this.state.detecting}
                        onClick={this.startSession}
                    >
                        Convert
                    </button>
                </div>
            </div>
        );
    }
}
