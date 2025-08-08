const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// AI Model Configuration - You can switch between different providers
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Try different AI providers in order of preference
const AI_PROVIDERS = [
  {
    name: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama3-8b-8192",
    apiKey: GROQ_API_KEY,
    headers: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
  },
  {
    name: "github",
    endpoint: "https://models.github.ai/inference/chat/completions",
    model: "openai/gpt-4.1",
    apiKey: GITHUB_TOKEN,
    headers: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
  },
  {
    name: "openai",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo",
    apiKey: OPENAI_API_KEY,
    headers: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
  },
];

// 11Labs configuration
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const ELEVEN_LABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Default voice ID

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    console.log("Continuing without MongoDB connection");
  });

// Helper function to try different AI providers
async function generateWithAI(messages) {
  let lastError = null;

  for (const provider of AI_PROVIDERS) {
    if (!provider.apiKey) {
      console.log(`Skipping ${provider.name} - no API key provided`);
      continue;
    }

    try {
      console.log(`Trying ${provider.name} API...`);

      const response = await axios.post(
        provider.endpoint,
        {
          messages: messages,
          model: provider.model,
          temperature: 0.7,
          max_tokens: 2000,
        },
        {
          headers: provider.headers(provider.apiKey),
          timeout: 30000,
        }
      );

      console.log(`Successfully generated script using ${provider.name}`);
      return response.data.choices[0].message.content;
    } catch (error) {
      lastError = error;
      console.error(
        `${provider.name} failed:`,
        error.response?.status,
        error.response?.statusText
      );

      if (error.response?.status === 401) {
        console.error(`${provider.name} API key is invalid or expired`);
      }

      // Continue to next provider
      continue;
    }
  }

  // If all providers failed, throw the last error
  throw new Error(
    `All AI providers failed. Last error: ${
      lastError?.response?.data?.error?.message ||
      lastError?.message ||
      "Unknown error"
    }`
  );
}

app.post("/api/generate-podcast", async (req, res) => {
  try {
    const {
      topic,
      narratorVoiceId,
      hostVoiceId,
      guestVoiceId,
      scriptOverride,
      audioOnly,
    } = req.body;

    if (!topic && !scriptOverride) {
      return res.status(400).json({ error: "Topic or script is required" });
    }

    let script = scriptOverride;
    let scriptParts;

    // Only generate script if not provided
    if (!scriptOverride && !audioOnly) {
      console.log("Generating podcast script for topic:", topic);

      const messages = [
        {
          role: "system",
          content: `You are a professional podcast script writer. Create an engaging podcast script about the given topic.
          
          The script should have THREE distinct speakers:
          1. NARRATOR: Introduces the podcast and provides transitions between segments
          2. HOST: The main presenter who leads the discussion
          3. GUEST: An expert on the topic who provides insights and perspectives
          
          Format the script clearly with speaker labels as follows:
        [NARRATOR]: (narration text)
        [HOST]: (host's dialogue)
        [GUEST]: (guest's dialogue)
        
          [NARRATOR]: (narration text)
          [HOST]: (host's dialogue)
          [GUEST]: (guest's dialogue)
          
          Start with an introduction by the narrator, then have the host introduce themselves and the topic, 
          followed by introducing the guest. Then proceed with a natural conversation about the topic.
          Include approximately equal speaking time for the host and guest, with occasional narrator transitions.
          End with a conclusion from all three speakers.`,
        },
        {
          role: "user",
          content: topic,
        },
      ];

      // Try to generate script using available AI providers
      script = await generateWithAI(messages);
      console.log("Successfully generated script");

      // Format the script - remove extra asterisks and clean up formatting
      script = formatScript(script);
    } else {
      console.log("Using provided script for audio generation");
    }

    // Parse the script into speaker parts
    scriptParts = parseScriptBySpeaker(script || scriptOverride);

    try {
      // Generate audio for each speaker
      const narratorVoice = narratorVoiceId || ELEVEN_LABS_VOICE_ID;
      const hostVoice = hostVoiceId || ELEVEN_LABS_VOICE_ID;
      const guestVoice = guestVoiceId || ELEVEN_LABS_VOICE_ID;

      // Only generate narrator audio if there's narrator content
      let narratorAudio = null;
      if (scriptParts.narrator && scriptParts.narrator.trim()) {
        narratorAudio = await generateAudio(
          scriptParts.narrator,
          narratorVoice
        );
      }

      // Only generate host audio if there's host content
      let hostAudio = null;
      if (scriptParts.host && scriptParts.host.trim()) {
        hostAudio = await generateAudio(scriptParts.host, hostVoice);
      }

      // Only generate guest audio if there's guest content
      let guestAudio = null;
      if (scriptParts.guest && scriptParts.guest.trim()) {
        guestAudio = await generateAudio(scriptParts.guest, guestVoice);
      }

      // Send the script and audio data
      res.json({
        script,
        scriptParts,
        audio: {
          narrator: narratorAudio,
          host: hostAudio,
          guest: guestAudio,
        },
      });
    } catch (audioError) {
      console.error(
        "11Labs Audio generation failed:",
        audioError.response?.data || audioError.message
      );
      // Still return the script even if audio fails
      res.json({
        script,
        scriptParts,
        audioError: "Failed to generate audio",
      });
    }
  } catch (error) {
    console.error(
      "Error generating podcast:",
      error.response?.data || error.message
    );
    res.status(500).json({
      error: "Failed to generate podcast",
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Helper function to generate audio using 11Labs
async function generateAudio(text, voiceId) {
  if (!text || text.trim() === "") {
    console.log("Empty text provided for voice ID:", voiceId);
    return null;
  }

  // Limit text length to avoid 11Labs API credit limitations
  const maxLength = 800; // Reduced to stay within free credit limits (was 700)
  let processedText = text;
  if (text.length > maxLength) {
    console.log(
      `Text too long (${text.length} chars), truncating to ${maxLength} chars`
    );
    // Find the last period within the maxLength to avoid cutting mid-sentence
    const lastPeriodIndex = text.substring(0, maxLength).lastIndexOf(".");
    const truncateIndex = lastPeriodIndex > 0 ? lastPeriodIndex + 1 : maxLength;
    processedText = text.substring(0, truncateIndex);
    processedText += " [Text truncated to fit within character limit]";
  }

  try {
    console.log(
      `Generating audio for voice ID: ${voiceId}, text length: ${processedText.length}`
    );

    const audioResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: processedText,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      },
      {
        headers: {
          Accept: "audio/mpeg",
          "xi-api-key": ELEVEN_LABS_API_KEY,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    if (!audioResponse.data || audioResponse.data.length === 0) {
      console.error("Empty audio response received from 11Labs");
      return null;
    }

    // Convert audio buffer to base64
    return Buffer.from(audioResponse.data).toString("base64");
  } catch (error) {
    // Decode the buffer error if it exists
    let errorMessage = error.message;
    if (error.response?.data && Buffer.isBuffer(error.response.data)) {
      try {
        const jsonStr = Buffer.from(error.response.data).toString();
        const errorObj = JSON.parse(jsonStr);
        errorMessage = `${errorObj.detail?.status}: ${errorObj.detail?.message}`;
      } catch (e) {
        // If parsing fails, use original error
      }
    }

    console.error(
      "Error generating audio with 11Labs:",
      error.response?.status,
      error.response?.statusText,
      errorMessage
    );
    return null;
  }
}

// Parse script into different speaker parts
function parseScriptBySpeaker(script) {
  const narratorLines = [];
  const hostLines = [];
  const guestLines = [];

  // Split script by lines
  const lines = script.split("\n");
  let currentSpeaker = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (line === "") continue;

    // Check for speaker labels
    if (line.match(/^\[NARRATOR\]:/i) || line.match(/^NARRATOR:/i)) {
      currentSpeaker = "narrator";
      // Get the content after the label
      const content = line
        .replace(/^\[NARRATOR\]:\s*/i, "")
        .replace(/^NARRATOR:\s*/i, "");
      if (content) narratorLines.push(content);
    } else if (line.match(/^\[HOST\]:/i) || line.match(/^HOST:/i)) {
      currentSpeaker = "host";
      const content = line
        .replace(/^\[HOST\]:\s*/i, "")
        .replace(/^HOST:\s*/i, "");
      if (content) hostLines.push(content);
    } else if (line.match(/^\[GUEST\]:/i) || line.match(/^GUEST:/i)) {
      currentSpeaker = "guest";
      const content = line
        .replace(/^\[GUEST\]:\s*/i, "")
        .replace(/^GUEST:\s*/i, "");
      if (content) guestLines.push(content);
    }
    // If no speaker label but we have a current speaker, add to their lines
    else if (currentSpeaker) {
      switch (currentSpeaker) {
        case "narrator":
          narratorLines.push(line);
          break;
        case "host":
          hostLines.push(line);
          break;
        case "guest":
          guestLines.push(line);
          break;
      }
    }
    // If we don't have a current speaker yet but have content, default to narrator
    else if (!currentSpeaker && line) {
      narratorLines.push(line);
      currentSpeaker = "narrator";
    }
  }

  // Join all lines with proper spacing
  return {
    narrator: narratorLines.join("\n"),
    host: hostLines.join("\n"),
    guest: guestLines.join("\n"),
  };
}

// Function to format the script - remove extra asterisks and clean up formatting
function formatScript(script) {
  // Replace double asterisks (bold markdown) with nothing
  script = script.replace(/\*\*/g, "");

  // Replace single asterisks (italic markdown) with nothing
  script = script.replace(/\*/g, "");

  // Replace markdown headers (# Title) with clean text
  script = script.replace(/#+\s+(.+)/g, "$1");

  // Ensure consistent line breaks (replace multiple empty lines with two line breaks)
  script = script.replace(/\n{3,}/g, "\n\n");

  return script;
}

// Get available voices from 11Labs
app.get("/api/voices", async (req, res) => {
  try {
    console.log("Fetching voices from 11Labs");
    const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": ELEVEN_LABS_API_KEY,
      },
    });

    // Log the available voices and their IDs
    console.log("Available 11Labs Voices:");
    if (response.data.voices && response.data.voices.length > 0) {
      response.data.voices.forEach((voice) => {
        console.log(`- ${voice.name}: ${voice.voice_id}`);
      });
      res.json(response.data);
    } else {
      console.log(
        "No voices found in 11Labs response, providing fallback voices"
      );
      // If 11Labs doesn't return voices, provide fallback voices
      const fallbackVoices = {
        voices: [
          {
            voice_id: "21m00Tcm4TlvDq8ikWAM",
            name: "Rachel (Fallback)",
          },
          {
            voice_id: "AZnzlk1XvdvUeBnXmlld",
            name: "Domi (Fallback)",
          },
          {
            voice_id: "EXAVITQu4vr4xnSDxMaL",
            name: "Bella (Fallback)",
          },
        ],
      };
      res.json(fallbackVoices);
    }
  } catch (error) {
    console.error(
      "Error fetching voices:",
      error.response?.data || error.message
    );
    // If there's an error, still provide fallback voices
    const fallbackVoices = {
      voices: [
        {
          voice_id: "21m00Tcm4TlvDq8ikWAM",
          name: "Rachel (Fallback)",
        },
        {
          voice_id: "AZnzlk1XvdvUeBnXmlld",
          name: "Domi (Fallback)",
        },
        {
          voice_id: "EXAVITQu4vr4xnSDxMaL",
          name: "Bella (Fallback)",
        },
      ],
    };
    res.json(fallbackVoices);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
