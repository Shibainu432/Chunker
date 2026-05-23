// In selectWorldScreen.js — replace startSession() with this:
startSession = () => {
    this.setState({ detecting: true, progress: 0 });

    let file = this.state.filePath;

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

    // Store file in api for later use by processingScreen
    api.setFile(file);

    // Use the same message-passing interface as the original
    api.send(
        { type: 'flow', method: 'select_world', path: file.name },
        (message) => {
            if (message.type === 'response') {
                this.app.updateSession(message.output);
                this.setState({ detecting: false });
                this.app.generateSettings();
                this.nextScreen(); // → ModeScreen
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
