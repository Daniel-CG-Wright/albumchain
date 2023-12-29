# Use an official Node.js runtime as the base image
FROM node:20

# Set the working directory in the Docker image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the Docker image
COPY package*.json ./

# Install the application dependencies in the Docker image
RUN npm install --build-from-source=better-sqlite3

# If you are building your code for production
# RUN npm ci --only=production

# Copy the rest of the application to the Docker image
COPY . .

# Expose port 3000 for the application
EXPOSE 3000

# Define the command to run the application
CMD [ "node", "index.js" ]