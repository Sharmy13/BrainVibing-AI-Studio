
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
    origin: "https://brainvibing-ai-studio-frontend.vercel.app",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));

// Gemini AI Setup
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// ======================================
// API 1: SERVER STATUS
// ======================================

app.get("/", (req, res) => {
    res.send("Welcome to BrainVibing AI Studio!");
});

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message: "BrainVibing AI Studio backend is working!"
    });
});


// ======================================
// API 2: GENERATE VIDEO SCRIPT
// ======================================


app.post("/api/generate-script", async (req, res) => {
    try {
        const { topic, language, duration } = req.body;

        if (!topic || !language || !duration) {
            return res.status(400).json({
                success: false,
                message: "Topic, language and duration are required!"
            });
        }

        const videoDuration = Number(duration);

        if (
            !Number.isFinite(videoDuration) ||
            videoDuration < 10 ||
            videoDuration > 1800
        ) {
            return res.status(400).json({
                success: false,
                message: "Duration must be between 10 and 1800 seconds!"
            });
        }

        const estimatedWords = Math.round(videoDuration * 2.2);

        const prompt = `
Create an engaging YouTube video script about: ${topic}.

Write the script in ${language}.

TARGET VIDEO DURATION: ${videoDuration} seconds.

SCRIPT LENGTH:
Aim for approximately ${estimatedWords} spoken words.
The narration should fit the selected duration when spoken naturally.
Do not make the script unnecessarily long or short.

Include:
1. An interesting opening hook.
2. Engaging narration.
3. A clear and entertaining explanation or story.
4. A memorable ending.

Additional instructions:
- Make it suitable for a YouTube video.
- Use natural, conversational language.
- Avoid unnecessary introductions and repetition.
- Return only the complete script.
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt
        });

        res.json({
            success: true,
            topic,
            language,
            duration: videoDuration,
            script: response.text
        });

    } catch (error) {
        console.error("Gemini Script Error:", error);

        res.status(500).json({
            success: false,
            message: "Script generation failed. Please try again."
        });
    }
});

// ======================================
// API 3: GENERATE VIDEO SCENES
// ======================================

app.post("/api/generate-scenes", async (req, res) => {
    try {
        const { script } = req.body;

        if (!script) {
            return res.status(400).json({
                success: false,
                message: "Script is required!"
            });
        }

        const prompt = `
Convert the following Telugu YouTube script into 5 to 8 video scenes.

For each scene provide:
1. Scene number
2. Short scene title
3. Telugu narration
4. Detailed visual description for AI image generation
5. Suggested duration in seconds

Keep characters and their appearance consistent across scenes.

Return only valid JSON in this format:

{
  "scenes": [
    {
      "scene_number": 1,
      "title": "Scene title",
      "narration": "Telugu narration",
      "visual_description": "Detailed visual description",
      "duration": 10
    }
  ]
}

Original script:
${script}
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt
        });

        const output = response.text
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const sceneData = JSON.parse(output);

        if (!Array.isArray(sceneData.scenes)) {
            throw new Error("Invalid scene data returned by AI.");
        }

        res.json({
            success: true,
            scenes: sceneData.scenes
        });

    } catch (error) {
        console.error("Scene Generation Error:", error);

        res.status(500).json({
            success: false,
            message: "Scene generation failed. Please try again."
        });
    }
});


// ======================================
// API 4: GENERATE AI IMAGES
// CLOUDFLARE FLUX SCHNELL
// ======================================

app.post("/api/generate-image", async (req, res) => {
    try {
        const { visual_description } = req.body;

        if (!visual_description) {
            return res.status(400).json({
                success: false,
                message: "Visual description is required!"
            });
        }

        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.CLOUDFLARE_API_TOKEN;

        if (!accountId || !apiToken) {
            throw new Error("Cloudflare credentials are missing!");
        }

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prompt: visual_description,
                    steps: 4
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error("Cloudflare API Error:", data);

            throw new Error("Cloudflare image generation failed.");
        }

        res.json({
            success: true,
            image: `data:image/jpeg;base64,${data.result.image}`
        });

    } catch (error) {
        console.error("Image Generation Error:", error);

        res.status(500).json({
            success: false,
            message: error.message || "Image generation failed."
        });
    }
});


// ======================================
// API 5: CREATE MP4 VIDEO
// ======================================

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 10
    },

    
});




app.post(
    "/api/create-video",
    upload.fields([
        { name: "images", maxCount: 10 },
        { name: "audio", maxCount: 1 }
    ]),
    async (req, res) => {
        let tempDir;

        try {
            if (!ffmpegPath) {
                throw new Error("FFmpeg executable was not found.");
            }

            const images = req.files?.images || [];
            const audioFile = req.files?.audio?.[0];

            if (images.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Please generate scene images first!"
                });
            }

            // Read scene durations sent by the frontend
            let sceneDurations = [];

            if (req.body.sceneDurations) {
                try {
                    sceneDurations = JSON.parse(req.body.sceneDurations);
                } catch {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid scene durations!"
                    });
                }
            } else {
                // Temporary fallback until frontend sends durations
                sceneDurations = images.map(() => 3);
            }

            if (
                !Array.isArray(sceneDurations) ||
                sceneDurations.length !== images.length ||
                sceneDurations.some(duration =>
                    !Number.isFinite(Number(duration)) ||
                    Number(duration) < 1 ||
                    Number(duration) > 600
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid duration for every scene!"
                });
            }

            sceneDurations = sceneDurations.map(Number);

            // Optional voice-over duration in seconds
            const audioDuration = audioFile
                ? Number(req.body.audioDuration || 0)
                : 0;

            if (
                !Number.isFinite(audioDuration) ||
                audioDuration < 0 ||
                audioDuration > 1800
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid audio duration!"
                });
            }

            // Extend the final image if the voice-over is longer
            const previousSceneDuration = sceneDurations
                .slice(0, -1)
                .reduce((sum, duration) => sum + duration, 0);

            if (audioDuration > 0) {
                const requiredLastDuration =
                    audioDuration - previousSceneDuration;

                sceneDurations[sceneDurations.length - 1] = Math.max(
                    sceneDurations[sceneDurations.length - 1],
                    requiredLastDuration
                );
            }

            tempDir = fs.mkdtempSync(
                path.join(os.tmpdir(), "brainvibing-")
            );

            // Save scene images
            const imageNames = [];

            for (let i = 0; i < images.length; i++) {
                const filename = `scene${i}.jpg`;

                fs.writeFileSync(
                    path.join(tempDir, filename),
                    images[i].buffer
                );

                imageNames.push(filename);
            }

            // Save optional audio
            let audioPath = null;

            if (audioFile) {
                audioPath = path.join(tempDir, "voice.mp3");
                fs.writeFileSync(audioPath, audioFile.buffer);
            }

            // Create FFmpeg image sequence with individual durations
            const concatContent = imageNames.map((filename, index) => {
                const imagePath = path.join(tempDir, filename)
                    .replace(/\\/g, "/")
                    .replace(/'/g, "'\\''");

                return `file '${imagePath}'\nduration ${sceneDurations[index]}`;
            });

            // Repeat final image for proper duration handling
            const lastImagePath = path.join(
                tempDir,
                imageNames[imageNames.length - 1]
            )
                .replace(/\\/g, "/")
                .replace(/'/g, "'\\''");

            concatContent.push(`file '${lastImagePath}'`);

            const listPath = path.join(tempDir, "images.txt");

            fs.writeFileSync(
                listPath,
                concatContent.join("\n")
            );

            const outputPath = path.join(
                tempDir,
                "brainvibing-video.mp4"
            );

            const args = [
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", listPath
            ];

            if (audioPath) {
                args.push("-i", audioPath);
            }

            args.push("-map", "0:v:0");

            if (audioPath) {
                args.push(
                    "-map", "1:a:0",
                    "-c:a", "aac",
                    "-b:a", "192k"
                );
            }

            args.push(
                "-vf",
                "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=25",
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                outputPath
            );

            const ffmpeg = spawn(ffmpegPath, args);

            let ffmpegError = "";

            ffmpeg.stderr.on("data", data => {
                ffmpegError += data.toString();
            });

            ffmpeg.on("error", error => {
                if (tempDir) {
                    fs.rmSync(tempDir, {
                        recursive: true,
                        force: true
                    });
                }

                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: error.message
                    });
                }
            });

            ffmpeg.on("close", code => {
                if (code !== 0) {
                    console.error("FFmpeg Error:", ffmpegError);

                    if (tempDir) {
                        fs.rmSync(tempDir, {
                            recursive: true,
                            force: true
                        });
                    }

                    if (!res.headersSent) {
                        res.status(500).json({
                            success: false,
                            message: "Video creation failed!"
                        });
                    }

                    return;
                }

                res.download(
                    outputPath,
                    "BrainVibing-Video.mp4",
                    error => {
                        if (tempDir) {
                            fs.rmSync(tempDir, {
                                recursive: true,
                                force: true
                            });
                        }

                        if (error && !res.headersSent) {
                            res.status(500).json({
                                success: false,
                                message: "Unable to download video."
                            });
                        }
                    }
                );
            });

        } catch (error) {
            console.error("Video Creation Error:", error);

            if (tempDir) {
                fs.rmSync(tempDir, {
                    recursive: true,
                    force: true
                });
            }

            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        }
    }
);



// ======================================
// START SERVER
// ======================================
app.post("/api/generate-audio", async (req, res) => {
    try {
        const { text, voiceId } = req.body;

        if (!text || !voiceId) {
            return res.status(400).json({
                success: false,
                message: "Text and voice ID are required"
            });
        }

        const response = await fetch(
            "https://api.sonexlabs.com/v1/speech",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.SONEX_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text,
                    voice_id: voiceId,
                    output_format: "mp3",
                    sample_rate: 24000
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        const audioBuffer = Buffer.from(
            await response.arrayBuffer()
        );

        res.json({
            success: true,
            audio: `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`,
            charsBilled: response.headers.get("X-Chars-Billed")
        });

    } catch (error) {
        console.error("Audio generation error:", error);

        res.status(500).json({
            success: false,
            message: "Audio generation failed"
        });
    }
});
app.get("/api/voices", async (req, res) => {
    try {
        const response = await fetch(
            "https://api.sonexlabs.com/v1/voices",
            {
                headers: {
                    Authorization: `Bearer ${process.env.SONEX_API_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error("Could not fetch Sonex voices");
        }

        const voices = await response.json();

        res.json({
            success: true,
            voices: voices
        });

    } catch (error) {
        console.error("Voice List Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
