
const generateBtn = document.getElementById("generateBtn");
const generateScenesBtn = document.getElementById("generateScenesBtn");

const result = document.getElementById("result");
const scenesResult = document.getElementById("scenesResult");
const sceneImages = document.getElementById("sceneImages");

let generatedScript = "";
let approvedScript = false;

const scriptEditor = document.getElementById("scriptEditor");
const editableScript = document.getElementById("editableScript");
const askAIButton = document.getElementById("askAIButton");
const approveScriptButton = document.getElementById("approveScriptButton");
const scriptEditResult = document.getElementById("scriptEditResult");
const scriptChatHistory = document.getElementById("scriptChatHistory");
const scriptChatInput = document.getElementById("scriptChatInput");
const sendScriptMessage = document.getElementById("sendScriptMessage");


let scriptConversation = [];
let generatedScenes = [];
let generatedImages = [];
let generatedAudio = null;


// STEP 1: Generate Script

generateBtn.addEventListener("click", async () => {
    const topic = document.getElementById("topic").value.trim();
    const language = document.getElementById("language").value;
    const durationOption = document.getElementById("videoDuration").value;

    let duration;

    if (durationOption === "custom") {
        duration = Number(document.getElementById("customDuration").value);

        if (!duration || duration < 10 || duration > 1800) {
            result.innerText = "Please enter a duration between 10 and 1800 seconds!";
            return;
        }
    } else {
        duration = Number(durationOption);
    }

    if (!topic || !language) {
        result.innerText = "Please enter a topic and select a language!";
        return;
    }

    generateBtn.disabled = true;
    generateBtn.innerText = "Generating...";
    generateScenesBtn.disabled = true;

    result.innerText = "Generating your AI script...";
    scenesResult.innerText = "Your video scenes will appear here...";
    sceneImages.innerHTML = "";

    generatedScript = "";
    generatedScenes = [];
    generatedImages = [];

    try {
        const response = await fetch(
            "https://brainvibing-backend.onrender.com/api/generate-script",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic,
                    language,
                    duration
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Script generation failed!");
        }

        generatedScript = data.script;
        editableScript.value = generatedScript;
        scriptEditor.style.display = "block";

        approvedScript = false;
        generateScenesBtn.disabled = true;
        approveScriptButton.textContent = "✅ Approve Script";

        result.innerText = generatedScript;

    } catch (error) {
        console.error(error);
        result.innerText = error.message;

    } finally {
        generateBtn.disabled = false;
        generateBtn.innerText = "✨ Generate Script";
    }
});

// STEP 2: Generate Video Scenes
generateScenesBtn.addEventListener("click", async () => {
        if (!approvedScript) {
        alert("Please approve your script before generating scenes!");
        return;
    }
    if (!generatedScript) {
        scenesResult.innerText = "Please generate a script first!";
        return;
    }

    generateScenesBtn.disabled = true;
    generateScenesBtn.innerText = "Creating Scenes...";

    scenesResult.innerText = "AI is creating your video scenes...";
    sceneImages.innerHTML = "";

    generatedImages = [];

    try {
        const response = await fetch(
            "https://brainvibing-backend.onrender.com/api/generate-scenes",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ script: generatedScript })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Scene generation failed!");
        }

        generatedScenes = data.scenes;

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function updateTotalDuration() {
    const total = generatedScenes.reduce(
        (sum, scene) => sum + (Number(scene.duration) || 0),
        0
    );

    document.getElementById("totalSceneDuration").innerText =
        `Total Video Duration: ${total} seconds`;
}

scenesResult.innerHTML = `
    <h3>Edit Your Scene Durations</h3>

    <div id="sceneDurationList">
        ${generatedScenes.map((scene, index) => `
            <div class="studio-card">
                <h3>Scene ${escapeHTML(scene.scene_number)}: ${escapeHTML(scene.title)}</h3>

                <p><strong>Narration:</strong></p>
                <p>${escapeHTML(scene.narration)}</p>

                <p><strong>Visual Description:</strong></p>
                <p>${escapeHTML(scene.visual_description)}</p>

                <label for="sceneDuration${index}">
                    Scene Duration (seconds)
                </label>

                <input
                    type="number"
                    id="sceneDuration${index}"
                    class="scene-duration-input"
                    data-index="${index}"
                    min="1"
                    max="600"
                    value="${Number(scene.duration) || 3}"
                >
            </div>
        `).join("")}
    </div>

    <h3 id="totalSceneDuration"></h3>
`;

document.querySelectorAll(".scene-duration-input").forEach(input => {
    input.addEventListener("input", () => {
        const index = Number(input.dataset.index);
        const duration = Number(input.value);

        if (input.value === "" || !Number.isFinite(duration) || duration < 1 || duration > 600) {
            return;
        }

        generatedScenes[index].duration = duration;
        updateTotalDuration();
    });
});

updateTotalDuration();


        sceneImages.innerHTML = `
            <h2>AI Scene Images</h2>
            <button id="generateAllImagesBtn">
                Generate AI Images
            </button>
            <div id="imageGallery"></div>
        `;

        document.getElementById("generateAllImagesBtn")
            .addEventListener("click", generateAllImages);

    } catch (error) {
        console.error(error);
        scenesResult.innerText = error.message;
    }

    generateScenesBtn.disabled = false;
    generateScenesBtn.innerText = "Generate Video Scenes";
});


// STEP 3: Generate Images Using Cloudflare
async function generateAllImages() {
    const button = document.getElementById("generateAllImagesBtn");
    const gallery = document.getElementById("imageGallery");

    button.disabled = true;
    button.innerText = "Generating Images...";

    gallery.innerHTML = "";
    generatedImages = [];

    for (let i = 0; i < generatedScenes.length; i++) {
        const scene = generatedScenes[i];

        const card = document.createElement("div");
        card.className = "container";

        const heading = document.createElement("h3");
        heading.innerText = `Scene ${scene.scene_number}: ${scene.title}`;

        const status = document.createElement("p");
        status.innerText = "Generating AI image...";

        card.appendChild(heading);
        card.appendChild(status);
        gallery.appendChild(card);

        try {
            const response = await fetch(
                "https://brainvibing-backend.onrender.com/api/generate-image",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        visual_description: scene.visual_description
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Image generation failed!");
            }

            const imageBlob = await fetch(data.image).then(r => r.blob());

            generatedImages.push({
                sceneNumber: scene.scene_number,
                blob: imageBlob
            });

            const img = document.createElement("img");
            img.src = URL.createObjectURL(imageBlob);
            img.alt = `Scene ${scene.scene_number}`;

            img.style.width = "100%";
            img.style.maxWidth = "450px";
            img.style.borderRadius = "12px";
            img.style.marginTop = "10px";

            card.appendChild(img);

            const downloadBtn = document.createElement("button");
            downloadBtn.innerText = "Download Scene Image";
            downloadBtn.style.marginTop = "12px";

            downloadBtn.addEventListener("click", () => {
                const link = document.createElement("a");
                link.href = img.src;
                link.download = `BrainVibing-Scene-${scene.scene_number}.jpg`;
                link.click();
            });

            card.appendChild(downloadBtn);
            status.innerText = "AI image generated successfully!";

        } catch (error) {
            console.error(error);
            status.innerText = `Image generation failed: ${error.message}`;
        }

        button.innerText =
            `Generated ${i + 1} of ${generatedScenes.length} images`;
    }

    if (generatedImages.length > 0) {
        const videoBtn = document.createElement("button");

        videoBtn.id = "createVideoBtn";
        videoBtn.innerText = "Create Final MP4 Video";
        videoBtn.style.marginTop = "25px";

        videoBtn.addEventListener("click", createFinalVideo);

        gallery.appendChild(videoBtn);
    }

    button.disabled = false;
    button.innerText = "Generate AI Images Again";
}


// STEP 4: Create Final MP4 Video

async function createFinalVideo() {
    const videoBtn = document.getElementById("createVideoBtn");
    const audioOption = document.getElementById("videoAudioOption");
    const videoResult = document.getElementById("videoResult");

    videoBtn.disabled = true;
    videoBtn.innerText = "Creating Your Video... Please Wait";

    let videoURL = null;

    try {
        if (!generatedImages || generatedImages.length === 0) {
            throw new Error("Please generate scene images first!");
        }

        if (!generatedScenes || generatedScenes.length !== generatedImages.length) {
            throw new Error("Scene count and image count do not match!");
        }
const aspectRatio = document.getElementById("aspectRatio").value;
        const formData = new FormData();
        formData.append("aspectRatio", aspectRatio);

        // Add scene images
        generatedImages.forEach((item) => {
            formData.append(
                "images",
                item.blob,
                `scene-${item.sceneNumber}.jpg`
            );
        });

        // Add individual scene durations
        const sceneDurations = generatedImages.map((item, index) => {
            const matchingScene = generatedScenes.find(
                scene => Number(scene.scene_number) === Number(item.sceneNumber)
            );

            const duration = Number(
                matchingScene ? matchingScene.duration : generatedScenes[index].duration
            );

            if (!Number.isFinite(duration) || duration < 1 || duration > 600) {
                throw new Error(`Invalid duration for Scene ${item.sceneNumber}`);
            }

            return duration;
        });

        formData.append("sceneDurations", JSON.stringify(sceneDurations));

        // Add voice-over only when selected
        if (audioOption.value === "video-audio") {
            if (!generatedAudio) {
                throw new Error("Please generate your voice-over first!");
            }

            const audioBlob = generatedAudio instanceof Blob
                ? generatedAudio
                : await (await fetch(generatedAudio)).blob();

            // Measure actual audio duration
            const audioURL = URL.createObjectURL(audioBlob);

            try {
                const audioElement = new Audio();

                const audioDuration = await new Promise((resolve, reject) => {
                    audioElement.preload = "metadata";
                    audioElement.onloadedmetadata = () => resolve(audioElement.duration);
                    audioElement.onerror = () => reject(
                        new Error("Could not read voice-over duration!")
                    );
                    audioElement.src = audioURL;
                });

                if (!Number.isFinite(audioDuration) || audioDuration <= 0) {
                    throw new Error("Invalid voice-over duration!");
                }

                formData.append("audioDuration", String(audioDuration));

            } finally {
                URL.revokeObjectURL(audioURL);
            }

            formData.append("audio", audioBlob, "voice.mp3");
        }

        // Send everything to backend
        const response = await fetch(
            "https://brainvibing-backend.onrender.com/api/create-video",
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Video creation failed!");
        }

        const videoBlob = await response.blob();
        videoURL = URL.createObjectURL(videoBlob);

        // Download video
        const downloadLink = document.createElement("a");
        downloadLink.href = videoURL;
        downloadLink.download = "BrainVibing-Video.mp4";

        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();

        // Show video preview
        videoResult.innerHTML = "";

        const preview = document.createElement("video");
        preview.src = videoURL;
        preview.controls = true;
        preview.style.width = "100%";
        preview.style.maxWidth = "650px";
        preview.style.marginTop = "20px";

        videoResult.appendChild(preview);

        videoBtn.innerText = "Video Created Successfully!";

    } catch (error) {
        console.error("Video Error:", error);
        alert(error.message);

        videoBtn.innerText = "Try Creating Video Again";

    } finally {
        videoBtn.disabled = false;
    }
}

const generateAudioBtn = document.getElementById("generateAudioBtn");
const audioResult = document.getElementById("audioResult");

// Remove script directions and labels before sending text to voice generation
function cleanNarration(script) {
    return script
        .split("\n")
        .filter(line => {
            const text = line.trim();

            if (!text) return false;

            // Skip visual descriptions
            if (/^\*?\s*\(?visual\s*:/i.test(text)) return false;

            // Skip scene headings and timestamps
            if (/^\*{0,2}\s*\[.*\]\s*\*{0,2}$/.test(text)) return false;
            if (/^\*{0,2}\s*segment\s+\d+/i.test(text)) return false;
            if (/^\*{0,2}\s*\(?\d{1,2}:\d{2}/.test(text)) return false;

            // Skip standalone headings
            if (/^\*{0,2}\s*(hook|intro|outro|ending|scene|end screen|loop)\s*\d*.*\*{0,2}$/i.test(text)) return false;
            if (/^[-=*]{3,}$/.test(text)) return false;

            return true;
        })
        .map(line => line
            .replace(/\*\*/g, "")
            .replace(/^\s*\*\s*/, "")
            .replace(/^\s*\([^)]*\)\s*/, "")
            .replace(/^(narration|narrator|host|dialogue)\s*:\s*/i, "")
            .trim()
        )
        .filter(Boolean)
        .join("\n");
}
const audioLanguageDropdown = document.getElementById("audioLanguage");
const audioVoiceDropdown = document.getElementById("voiceSelect");

let availableVoices = [];

async function loadVoices() {
    try {
        const response = await fetch("https://brainvibing-backend.onrender.com/api/voices");
        const data = await response.json();

        if (!data.success) {
            throw new Error("Could not load voices");
        }

        availableVoices = data.voices;

        updateVoiceDropdown();

    } catch (error) {
        console.error("Voice loading error:", error);
    }
}

function updateVoiceDropdown() {
    const selectedLanguage = audioLanguageDropdown.value;

    const matchingVoices = availableVoices.filter(voice =>
        voice.languages?.includes(selectedLanguage) ||
        voice.language === selectedLanguage
    );

    audioVoiceDropdown.innerHTML = "";

    matchingVoices.forEach(voice => {
        const option = document.createElement("option");

        option.value = voice.id;
        option.textContent = `${voice.name} – ${voice.gender}`;

        audioVoiceDropdown.appendChild(option);
    });
}

audioLanguageDropdown.addEventListener("change", updateVoiceDropdown);

loadVoices();
generateAudioBtn.addEventListener("click", async () => {
    const voiceText = document.getElementById("voiceTextInput").value.trim();

if (!voiceText) {
    alert("Please enter some text to generate speech!");
    return;
}
if (!voiceText) {
    alert("Please enter some text to generate speech!");
    return;
}

    if (!voiceText) {
        alert("No narration found in the script!");
        return;
    }

    generateAudioBtn.disabled = true;
    generateAudioBtn.textContent = "Generating Voice...";

    try {
        const response = await fetch(
            "https://brainvibing-backend.onrender.com/api/generate-audio",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: voiceText,
                    voiceId: document.getElementById("voiceSelect").value
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Audio generation failed");
        }

        generatedAudio = data.audio;

        // Convert audio data into a downloadable MP3
        const audioResponse = await fetch(data.audio);
        const audioBlob = await audioResponse.blob();
        const audioURL = URL.createObjectURL(audioBlob);

        audioResult.innerHTML = `
            <div class="audio-player-card">
                <p>🎙️ Neha's Telugu voice is ready!</p>
                <audio controls src="${audioURL}"></audio>
                <a href="${audioURL}" download="BrainVibing-Voice.mp3"
                   class="download-audio">
                   ⬇️ Download MP3
                </a>
            </div>
        `;

    } catch (error) {
        console.error("Audio Error:", error);
        audioResult.textContent = "Error: " + error.message;

    } finally {
        generateAudioBtn.disabled = false;
        generateAudioBtn.textContent = "Generate Voice";
    }
});


approveScriptButton.addEventListener("click", () => {
    if (!editableScript.value.trim()) {
        alert("Please generate a script first!");
        return;
    }

    generatedScript = editableScript.value;
    approvedScript = true;

    generateScenesBtn.disabled = false;

    scriptEditResult.textContent =
        "✅ Script approved! You can now generate scenes.";

    approveScriptButton.textContent = "✅ Script Approved";
});
editableScript.addEventListener("input", () => {
    approvedScript = false;
    generateScenesBtn.disabled = true;
    approveScriptButton.textContent = "✅ Approve Script";
    scriptEditResult.textContent =
        "Script changed. Please approve it again.";
});
sendScriptMessage.addEventListener("click", async () => {
    const message = scriptChatInput.value.trim();

    if (!message) {
        alert("Please type your message!");
        return;
    }

    if (!generatedScript) {
        alert("Please generate a script first!");
        return;
    }

    sendScriptMessage.disabled = true;
    sendScriptMessage.textContent = "Thinking...";

    scriptChatHistory.innerHTML += `
        <p><strong>You:</strong> ${message}</p>
    `;

    try {
        const conversationContext = scriptConversation
            .map(item => `${item.role}: ${item.content}`)
            .join("\n");

        const response = await fetch(
            "https://brainvibing-backend.onrender.com/api/edit-script",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    script: editableScript.value,
                    instruction: `
Previous conversation:
${conversationContext}

User's latest request:
${message}

Revise the current script according to the latest request.
Return the complete revised script only.
`,
                    language: document.getElementById("language").value
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "AI editing failed");
        }

        scriptConversation.push(
            { role: "User", content: message },
            { role: "AI", content: data.script }
        );

        editableScript.value = data.script;

        scriptChatHistory.innerHTML += `
            <p><strong>AI:</strong> Script updated! Check the editor above.</p>
        `;

        approvedScript = false;
        generateScenesBtn.disabled = true;
        approveScriptButton.textContent = "✅ Approve Script";

        scriptEditResult.textContent =
            "Review the revised script and approve it when satisfied.";

        scriptChatInput.value = "";

    } catch (error) {
        scriptChatHistory.innerHTML += `
            <p><strong>Error:</strong> ${error.message}</p>
        `;
    } finally {
        sendScriptMessage.disabled = false;
        sendScriptMessage.textContent = "➤ Send Message";
    }
});
// BrainVibing Theme Toggle

const themeToggle = document.getElementById("themeToggle");

// Load saved theme
const savedTheme = localStorage.getItem("brainvibing-theme") || "dark";

document.body.setAttribute("data-theme", savedTheme);

themeToggle.textContent =
    savedTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";

// Switch theme
themeToggle.addEventListener("click", () => {
    const currentTheme = document.body.getAttribute("data-theme");

    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.body.setAttribute("data-theme", newTheme);

    localStorage.setItem("brainvibing-theme", newTheme);

    themeToggle.textContent =
        newTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
});
document.getElementById("createVideoBtn")
    .addEventListener("click", createFinalVideo);
    // Custom Video Duration
const videoDuration = document.getElementById("videoDuration");
const customDurationGroup = document.getElementById("customDurationGroup");
const customDuration = document.getElementById("customDuration");

videoDuration.addEventListener("change", () => {
    if (videoDuration.value === "custom") {
        customDurationGroup.style.display = "block";
    } else {
        customDurationGroup.style.display = "none";
        customDuration.value = "";
    }
});