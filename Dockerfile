# 1. Use Node as the base
FROM node:18

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy backend dependency files and install
# (Assuming your server.js and package.json are in the /backend folder)
COPY backend/package*.json ./
RUN npm install

# 4. Copy the backend source code
COPY backend/ ./

# 5. CRITICAL: Copy the frontend build folder into the container's root
# We already ran 'npm run build' locally, so we just need to copy it in.
COPY backend/build/ ./build/

# 6. Verify files exist (check Render logs for this output)
RUN ls -la /app/build

# 7. Start the server
EXPOSE 10000
CMD ["node", "server.js"]
