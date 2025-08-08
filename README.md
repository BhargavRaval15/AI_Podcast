# AI Podcast Generator

A MERN stack application that generates podcast scripts using AI and can convert them to audio.

## Features

- Generate podcast scripts from topics using ChatGPT
- Modern and responsive UI built with Material-UI
- Backend API for script generation
- MongoDB integration for future features

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- GitHub API key for AI model access
- 11Labs API key for text-to-speech

## Setup

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
4. Create a `.env` file in the backend directory with:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ai-podcast
   GITHUB_TOKEN=your_github_token_here
   ELEVEN_LABS_API_KEY=your_elevenlabs_api_key_here
   ```

## Running the Application

1. Start the backend server:

   ```bash
   cd backend
   npm start
   ```

2. Start the frontend development server:

   ```bash
   cd frontend
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Enter a topic or sentence in the input field
2. Click "Generate Podcast Script"
3. View the generated script
4. (Future) Choose an AI voice and generate audio

## Technologies Used

- React.js
- Express.js
- MongoDB
- Material-UI
- GitHub AI Models API
- 11Labs Text-to-Speech API
- Axios
