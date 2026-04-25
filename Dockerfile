FROM node:20

# Install Java and Zip
RUN apt-get update && apt-get install -y default-jre zip && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire project
COPY . .

# 1. Build the Frontend from the correct directory (app/ui is the root)
WORKDIR /app/app/ui
RUN npm install && CI=false npm run build
WORKDIR /app

# 2. Setup the Backend
RUN cd backend && npm install

# 3. Create upload directory inside backend
RUN mkdir -p /app/backend/uploads && chmod 777 /app/backend/uploads

EXPOSE 10000

# 4. Start the server from the backend folder
CMD ["node", "backend/server.js"]
