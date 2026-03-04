FROM node:20

# 1. Create the working directory
WORKDIR /app

# 2. Copy the backend files first to install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# 3. Copy the REST of the backend (server.js, etc.)
COPY backend/ ./backend/

# 4. Copy the UI build folder into /app/build
# This is what allows the server to serve the frontend
COPY backend/build/ ./build/

# 5. Set environment variables
ENV PORT=10000
EXPOSE 10000

# 6. Start the server
CMD ["node", "backend/server.js"]
