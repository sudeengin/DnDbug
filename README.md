
# DnDBug MVP

A minimal Story Agent MVP built with React + Vite + Tailwind + Vercel Serverless + OpenAI (gpt-4o-mini).

## Setup

### Environment Variables

To enable AI-powered scene generation, you need to set up your OpenAI API key:

1. Create a `.env` file in the project root
2. Add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```
3. Get your API key from: https://platform.openai.com/api-keys

### Running the Application

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Start the API server: `node server.js`

The application requires an OpenAI API key to function. Without it, the system will return appropriate error messages.

