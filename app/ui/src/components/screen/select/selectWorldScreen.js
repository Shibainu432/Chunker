import {Component} from "react";
import api from "../../api";  // Go up 2 levels from select/ to src/

export class SelectWorldScreen extends Component {
    startSession = () => {
        if (!this.state.actualFile) {
            this.app.showError("No file", "Please select a world first.");
            return;
        }

        // Set detecting to true to show the UI
        this.setState({ detecting: true });

        // Send the file to the backend
        api.send(this.state.actualFile, "JAVA_1_21", (message) => {
            this.setState({ detecting: false });
            
            if (message.type === "error") {
                this.app.showError("Error", message.error);
            } else if (message.type === "response" && message.success) {
                console.log("Conversion successful!");
                this.app.showError("Success", "Your world has been converted and downloaded!");
            }
        });
    };
}
