# Use Node 20 as the base
FROM node:20

# INSTALL JAVA (This is the missing piece!)
RUN apt-get update && apt-get install -y default-jre

# Create app directory
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy backend code and the JAR file
COPY backend/ ./backend/

# Copy the frontend build
COPY backend/build/ ./build/

# Create folders for uploads and results to avoid permission errors
RUN mkdir -p /app/backend/uploads && chmod 777 /app/backend/uploads

EXPOSE 10000

# Start the server
CMD ["node", "backend/server.js"]
