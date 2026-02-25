FROM node:22-alpine

# set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache mechanisms
COPY package.json .
COPY package-lock.json .

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build Project
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["npm", "run", "start"]