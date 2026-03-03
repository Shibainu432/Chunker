handleData = (files) => {
        if (!files || files.length === 0) return;

        if (files.length > 1) {
            // Folder Upload logic
            this.setState({ selected: files[0].path.split('/')[1] || "Folder", processing: true, processingPercentage: 0 });
            
            let level = null;
            for (let i = 0; i < files.length; i++) {
                let fileObj = files[i];
                // Check if this file is the level.dat
                if (fileObj.path.endsWith("/level.dat")) {
                    // In a browser, we use the relative path within the folder
                    level = fileObj.path.substring(0, fileObj.path.lastIndexOf("level.dat"));
                    break;
                }
            }

            if (level !== null) { 
                this.setState({filePath: level, filePathDirectory: true, processing: false}); 
            } else {
                this.app.showError("Invalid World", "No level.dat found in the folder.", null, undefined, true);
                this.setState({selected: false, detecting: false, processing: false});
            }

        } else if (files.length === 1) {
            // Single File (.zip or .mcworld) logic
            const firstFile = files[0];
            // Just use the name of the file for the backend to reference
            let nameOnly = firstFile.file.name || firstFile.path;
            this.setState({ 
                selected: nameOnly, 
                filePath: nameOnly, 
                filePathDirectory: false 
            });
        }
    };
