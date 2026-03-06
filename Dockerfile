FROM node:20

# Install Java and Zip
RUN apt-get update && apt-get install -y default-jre zip && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy everything
COPY . .

# IMPORTANT: Go into the folder where package.json lives to install and build
# Based on our conversation, this is the 'app' folder
RUN cd app && npm install
RUN cd app && CI=false npm run build

# Create upload directory
RUN mkdir -p /app/app/uploads && chmod 777 /app/app/uploads

EXPOSE 10000

# Start the server from the correct location
CMD ["node", "app/server.js"]
