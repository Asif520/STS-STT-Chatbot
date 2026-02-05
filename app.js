const chat = document.getElementById("chat");
const input = document.getElementById("textInput");
const micBtn = document.getElementById("micBtn");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
let sharedAudioContext = null;
const mediaSourceMap = new WeakMap();  // audioElement → MediaElementAudioSourceNode

const micIdleIcon = '<i class="fas fa-microphone"></i>';
const micRecordingIcon = '<i class="fas fa-circle" style="color:red;"></i>';

const sessionId = crypto.randomUUID();
const ws = new WebSocket(`wss://asif988-sts-stt-backend.hf.space//ws/sts/${sessionId}`);
ws.binaryType = "arraybuffer";

const activeVisualizers = new Map(); // audio element → { analyser, animationId }
let expectingAudio = false;
let audioCtx, workletNode, source;
let isRecording = false;
let userAudioChunks = []; // Accumulate user's PCM16 chunks for display

loadHistory();

/* ---------------- WebSocket ---------------- */

ws.onmessage = (e) => {
  if (typeof e.data === "string") {
    // JSON message (text response + metadata)
    const data = JSON.parse(e.data);
    
    if (data.text) {
      addMessage("bot", data.text);
    }
    if (data.error) {
      addMessage("bot", data.error);
    }

    // Only expect & play audio if backend says so
    if (data.has_audio === true) {
      // The next message should be binary audio → but since it's async,
      // we set a flag and handle it in the binary branch below
      expectingAudio = true;
    } else {
      expectingAudio = false;
    }
  } 
  else {
    // Binary data → should be audio WAV
    if (expectingAudio) {
      playAudio(e.data);
      addAudioMessage("bot", e.data);
      expectingAudio = false;  // reset
    } else {
      console.warn("Received unexpected binary data");
    }
  }
};

/* ---------------- UI ---------------- */

document.addEventListener('click', () => {
  initOrGetAudioContext();  // pre-resume on first interaction
}, { once: true });

async function initOrGetAudioContext() {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('[Audio] Shared context created');
  }

  if (sharedAudioContext.state === 'suspended') {
    try {
      await sharedAudioContext.resume();
      console.log('[Audio] Context resumed');
    } catch (err) {
      console.error('[Audio] Resume failed:', err);
    }
  }
  return sharedAudioContext;
}


function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  
  if (role === "bot") {
    // Optional: add a small label or style for text-only replies
    div.innerHTML = `<strong></strong> ${text}`;
  } else {
    div.innerText = text;
  }
  
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  saveHistory();
}

/* ---------------- SEND TEXT ---------------- */

sendBtn.onclick = sendTextFromInput;

function sendTextFromInput() {
  const msg = input.value.trim();
  if (!msg) return;

  addMessage("user", msg);
  ws.send(msg);  // Send plain text (backend now handles this)
  input.value = "";
}

input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendTextFromInput();
});

/* ---------------- MIC / AUDIO STREAM ---------------- */

micBtn.innerHTML = micIdleIcon;

micBtn.onclick = async () => {
  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
};

async function startRecording() {
  if (ws.readyState !== WebSocket.OPEN) {
    alert("WebSocket not connected");
    return;
  }
  ws.onopen = () => {
  initOrGetAudioContext();  // pre-warm on connection
};

  userAudioChunks = []; // Reset for new recording

  audioCtx = new AudioContext({ sampleRate: 16000 });

  await audioCtx.audioWorklet.addModule("pcm-processor.js");

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  source = audioCtx.createMediaStreamSource(stream);

  workletNode = new AudioWorkletNode(audioCtx, "pcm-processor");

  workletNode.port.onmessage = (e) => {
    if (!isRecording) return;
    const chunk = e.data.slice(0); // Copy ArrayBuffer
    ws.send(e.data); // Send to backend
    userAudioChunks.push(chunk); // Save for local display
  };

  source.connect(workletNode);
  workletNode.connect(audioCtx.destination);

  micBtn.innerHTML = micRecordingIcon;
  isRecording = true;
}

function stopRecording() {
  isRecording = false;

  if (workletNode) workletNode.disconnect();
  if (source) source.disconnect();
  if (audioCtx) audioCtx.close();

  ws.send("END");

  // Add user's audio to chat as playable waveform
  if (userAudioChunks.length > 0) {
    const wavBuffer = pcmToWav(userAudioChunks);
    addAudioMessage("user", wavBuffer);
  }
  userAudioChunks = []; // Clear

  micBtn.innerHTML = micIdleIcon;
}

/* ---------------- PCM to WAV Converter (for user audio display) ---------------- */

function pcmToWav(chunks, sampleRate = 16000) {
  // Calculate total length
  let totalLength = 0;
  chunks.forEach(chunk => {
    totalLength += chunk.byteLength;
  });

  const buffer = new ArrayBuffer(44 + totalLength);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + totalLength, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);        // subchunk1size
  view.setUint16(20, 1, true);         // PCM format
  view.setUint16(22, 1, true);         // 1 channel (mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);         // block align
  view.setUint16(34, 16, true);        // 16 bits

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, totalLength, true);

  // Write PCM data
  let offset = 44;
  chunks.forEach(chunk => {
    const bytes = new Uint8Array(chunk);
    for (let i = 0; i < bytes.length; i++) {
      view.setUint8(offset++, bytes[i]);
    }
  });

  return buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/* ---------------- AUDIO UTILS ---------------- */

function playAudio(arrayBuffer) {
  const blob = new Blob([arrayBuffer], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.play().catch(err => console.error("Audio play failed:", err));
  audio.onended = () => URL.revokeObjectURL(url);
}

function addAudioMessage(role, arrayBuffer) {
  const div = document.createElement("div");
  div.className = `message ${role}`;

  const audioMsg = document.createElement("div");
  audioMsg.className = "audio-message";

  const playBtn = document.createElement("button");
  playBtn.className = "play-btn";
  playBtn.innerText = "▶️";

  const waveform = document.createElement("canvas");
  waveform.className = "waveform";
  waveform.width = 220;
  waveform.height = 50;

  const audio = document.createElement("audio");
  audio.className = role + "-audio"; // for styling if needed
  const blob = new Blob([arrayBuffer], { type: "audio/wav" });
  audio.src = URL.createObjectURL(blob);
  audio.preload = "auto"; // better for analyser

  playBtn.onclick = async () => {
  document.querySelectorAll("audio").forEach(a => {
    if (a !== audio) {
      a.pause();
      stopVisualizer(a);
    }
  });

  if (audio.paused || audio.ended) {
    await initOrGetAudioContext();
    try {
      await audio.play();
      playBtn.innerText = "⏸";
      await startLiveVisualizer(audio, waveform);
    } catch (err) {
      console.error("Play failed:", err);
    }
  } else {
    audio.pause();
    playBtn.innerText = "▶️";
    stopVisualizer(audio);
  }
};

// Reliable state resets – multiple listeners
audio.addEventListener('ended', () => {
  playBtn.innerText = "▶️";
  stopVisualizer(audio);
});

audio.addEventListener('pause', () => {
  playBtn.innerText = "▶️";
  stopVisualizer(audio);
});

audio.addEventListener('timeupdate', () => {
  if (audio.currentTime >= audio.duration - 0.15) {
    playBtn.innerText = "▶️";
    stopVisualizer(audio);
  }
});

  // Optional: show static waveform initially (before play)
  // drawWaveformStatic(arrayBuffer, waveform, role);

  audioMsg.appendChild(playBtn);
  audioMsg.appendChild(waveform);
  audioMsg.appendChild(audio);
  div.appendChild(audioMsg);
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  saveHistory();
}

function drawWaveformStatic(arrayBuffer, canvas, role) {
  // Your original static waveform (keep for initial display or fallback)
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.decodeAudioData(arrayBuffer)
    .then(buffer => {
      const data = buffer.getChannelData(0);
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      
      ctx.fillStyle = role === "user" ? "#2196f3" : "#4caf50";

      const step = Math.ceil(data.length / w);
      for (let i = 0; i < w; i++) {
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j++) {
          const val = data[(i * step) + j] || 0;
          if (val < min) min = val;
          if (val > max) max = val;
        }
        ctx.fillRect(i, (1 + min) * h / 2, 1, Math.max(1, (max - min) * h / 2));
      }
    })
    .catch(err => console.error("Static waveform error:", err));
}

// New: Real-time animated visualizer (call this instead when playing)
async function startLiveVisualizer(audioElement, canvas) {
  stopVisualizer(audioElement); // Ensure clean state

  const audioCtx = await initOrGetAudioContext();

  let source = mediaSourceMap.get(audioElement);
  if (!source) {
    source = audioCtx.createMediaElementSource(audioElement);
    mediaSourceMap.set(audioElement, source);
    console.log('[Viz] Permanent source created for this audio');
  }

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  // Connect fresh branch
  source.connect(analyser);
  analyser.connect(audioCtx.destination); // Keeps sound audible

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  function draw() {
    const animationId = requestAnimationFrame(draw);

    // Only proceed if audio is actively playing
    if (audioElement.paused || audioElement.ended || audioElement.currentTime + 0.2 >= audioElement.duration) {
      stopVisualizer(audioElement);
      return;
    }

    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = "rgb(30, 30, 40)";
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 2;
    ctx.strokeStyle = audioElement.classList.contains("user-audio") ? "#2196f3" : "#4caf50";
    ctx.beginPath();

    const sliceWidth = w / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * h / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    activeVisualizers.set(audioElement, { analyser, animationId });
  }

  draw();
  console.log('[Viz] Sine animation started');
}

function stopVisualizer(audioElement) {
  if (activeVisualizers.has(audioElement)) {
    const { animationId, analyser } = activeVisualizers.get(audioElement);
    cancelAnimationFrame(animationId);
    if (analyser) analyser.disconnect(); // Crucial: break the branch
    activeVisualizers.delete(audioElement);
  }

  // Clear canvas
  const canvas = audioElement.closest('.audio-message')?.querySelector('canvas.waveform');
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgb(30, 30, 40)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  console.log('[Viz] Stopped & canvas cleared');
}


/* ---------------- HISTORY ---------------- */

function saveHistory() {
  localStorage.setItem("chat_history", chat.innerHTML);
}

function loadHistory() {
  const saved = localStorage.getItem("chat_history");
  if (saved) chat.innerHTML = saved;
}

clearBtn.onclick = () => {
  if (confirm("Clear chat history?")) {
    localStorage.removeItem("chat_history");
    chat.innerHTML = "";
  }
};

