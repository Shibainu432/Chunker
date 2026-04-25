import {Component} from "react";
import api from "../../api";

export class SelectWorldScreen extends Component {
    startSession = () => {
        if (!this.state.actualFile) {
            this.app.showError("No file", "Please select a world first.");
            return;
        }
        this.setState({ detecting: true });
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
