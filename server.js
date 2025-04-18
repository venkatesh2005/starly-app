import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";
import googleTTS from 'google-tts-api'; // At the top of your file
import fetch from 'node-fetch'; // Make sure you import this

dotenv.config();
const app = express();
const upload = multer();
const PORT = 3000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(express.static("public"));
app.use(express.static("output"));
app.use(express.urlencoded({ extended: true }));
app.use(upload.none());

if (!fs.existsSync("output")) fs.mkdirSync("output");

app.post("/generate", async (req, res) => {
  let { name, age, characters, theme, image, voice, download } = req.body;

  // Sanitize name for file usage
  const safeName = name.replace(/[^a-z0-9]/gi, "_");

  const prompt = `Write a magical, short, age-appropriate bedtime story for a child named ${name}, age ${age}, featuring characters like ${characters}. The story theme is ${theme}. End the story on a sweet, happy note.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      generationConfig: { temperature: 0.8 }
    });

    const story = response.candidates[0].content.parts[0].text;
    const output = { story };

    // 🎨 Image
    if (image) {
      const imgRes = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp-image-generation",
        contents: `Create a warm bedtime illustration for: ${story}`,
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
      });

      for (const part of imgRes.candidates[0].content.parts) {
        if (part.inlineData) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          const imgPath = `output/${safeName}_image.png`;
          fs.writeFileSync(imgPath, buffer);
          output.image = "/" + path.basename(imgPath);
        }
      }
    }

    // 🔊 Voice with Python gTTS
    if (voice) {
      const txtPath = `output/${safeName}_story.txt`;
      const mp3Path = `output/${safeName}_story.mp3`;
    
      fs.writeFileSync(txtPath, story);
    
      const urls = googleTTS.getAllAudioUrls(story, {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com',
      });
    
      const audioBuffers = [];
    
      for (const part of urls) {
        const res = await fetch(part.url);
        const buffer = await res.arrayBuffer();
        audioBuffers.push(Buffer.from(buffer));
      }
    
      // Combine and write to a single MP3
      const finalBuffer = Buffer.concat(audioBuffers);
      fs.writeFileSync(mp3Path, finalBuffer);
    
      output.voice = "/" + path.basename(mp3Path);
    }
    

    // 💾 Save story text
    if (download) {
      const filePath = `output/${safeName}_story.txt`;
      fs.writeFileSync(filePath, story);
      output.download = "/" + path.basename(filePath);
    }

    res.json(output);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Story generation failed." });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
