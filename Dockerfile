FROM node:20

# Install Java and Zip
RUN apt-get update && apt-get install -y default-jre zip && rm -rf /var/lib/apt/lists/*

# Set working directory to repo root
WORKDIR /app

# Copy the entire project
COPY . .

# 1. Build the Frontend
RUN cd app/ui && npm install && CI=false npm run build

# 2. Setup the Backend  
RUN cd backend && npm install

# 3. Create upload directory
RUN mkdir -p backend/uploads && chmod 777 backend/uploads

EXPOSE 10000

# 4. Start the server
CMD ["node", "backend/server.js"]
