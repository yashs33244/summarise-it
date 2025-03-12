import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { fal } from "@fal-ai/client";
import axios from "axios";
import multer from "multer";

const app = express();
const PORT = process.env.PORT || 8080;
const PYTHON_SERVER_URL = "http://localhost:8000";

// Configure FAL API key
fal.config({
  credentials: process.env.FAL_KEY
});

// Setup multer for file handling
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint to handle audio transcription
app.post("/transcribe", upload.single('file'), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const title = req.body.title;
      const publicUrl = req.body.public_url;
      
      if (!publicUrl) {
        return res.status(400).json({ error: "Public URL is required" });
      }
  
      console.log(`Received transcription request for: ${title}`);
      console.log(`Using public URL: ${publicUrl}`);
  
      // Use ElevenLabs Speech to Text API through FAL.ai
      const transcriptionResult = await fal.subscribe("fal-ai/elevenlabs/speech-to-text", {
        input: {
          audio_url: publicUrl,
          language_code: "en", // Auto-detect language
        },
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("Transcription in progress...");
            // Check if logs exists before trying to map it
            if (update.logs && Array.isArray(update.logs)) {
              update.logs.map((log) => log.message).forEach(console.log);
            }
          }
        },
      });
  
      console.log("Transcription completed successfully");
      
      // Extract the pure transcript text without timestamps
      const pureTranscriptionText = transcriptionResult.data.text;
      
      
      // Prepare the prompt for DeepSeek API
      const prompt = `
  You are analyzing a YouTube video transcript. Your task is to:
  1. Provide a concise summary of the content (max 3 paragraphs)
  2. Identify the main points/key takeaways (max 5)
  3. List any factual statements with source links when possible
  4. If it's educational content, what are the most important learnings?
  5. Organize your response in the following JSON format:
  {
    "summary": "...",
    "keyPoints": ["...", "..."],
    "facts": [
      {"statement": "...", "source": "..."},
      {"statement": "...", "source": "..."}
    ],
    "educationalContent": "..." 
  }
  
  DO NOT include timestamps in your analysis. Focus only on content and meaning.
  If you're unsure about sources for facts, provide your best guess for reliable sources.
  
  Here is the transcript:
  ${pureTranscriptionText}
  `;
  
      // Call DeepSeek API for analysis
      try {
        console.log("Calling DeepSeek AI for transcript analysis...");
        
        const deepseekResponse = await fetch("https://api.together.xyz/v1/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: process.env.DEEPSEEK_MODEL,
            prompt: prompt,
            max_tokens: 1500,
            temperature: 0.3,
            top_p: 0.9
          })
        });
        
        if (!deepseekResponse.ok) {
          throw new Error(`DeepSeek API responded with ${deepseekResponse.status}`);
        }
        
        const deepseekData = await deepseekResponse.json();
        
        // Parse the JSON response from DeepSeek
        let analysisData;
        try {
          const responseText = deepseekData.choices[0].text;
          // Extract JSON from the response (in case there's any extra text)
          const jsonMatch = responseText.match(/({[\s\S]*})/);
          if (jsonMatch) {
            analysisData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Could not extract JSON from DeepSeek response");
          }
        } catch (parseError) {
          console.error("Failed to parse DeepSeek response:", parseError);
          // Fallback structure if parsing fails
          analysisData = {
            summary: "Failed to generate summary",
            keyPoints: [],
            facts: [],
            educationalContent: ""
          };
        }
        
        console.log("DeepSeek AI analysis completed");
        
        // Return the combined results
        return res.status(200).json({
          success: true,
          title: title,
          transcription: transcriptionResult.data,
          requestId: transcriptionResult.requestId,
          analysis: analysisData
        });
        
      } catch (deepseekError) {
        console.error("Error in DeepSeek analysis:", deepseekError);
        // Still return transcription even if DeepSeek analysis fails
        return res.status(200).json({
          success: true,
          title: title,
          transcription: transcriptionResult.data,
          requestId: transcriptionResult.requestId,
          analysis: null,
          analysisError: deepseekError instanceof Error ? deepseekError.message : String(deepseekError)
        });
      }
      
    } catch (error) {
      console.error("Error in transcription:", error);
      return res.status(500).json({ 
        error: "Transcription failed", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });
// Endpoint to forward YouTube download request to Python server
app.post("/download", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }
    
    console.log(`Forwarding download request to Python server for: ${url}`);
    
    // Forward the request to the Python server
    const response = await axios.post(`${PYTHON_SERVER_URL}/download`, { url });
    
    console.log("Python server response:", response.data);
    
    // The Python server response contains public_url and transcription_status
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Error forwarding to Python server:", error);
    return res.status(500).json({ 
      error: "Failed to download from Python server", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});