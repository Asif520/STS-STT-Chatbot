### 🎙️Speech-to-Text, Speech-to-Speech,Text-to-text AI Chatbot (Real-Time)

* A full-stack, real-time Speech-to-Speech (STS),Speech-to-Speech (STS),Text-to-text- AI Chatbot that allows users to speak naturally, converts speech to text, generates intelligent responses using Google Gemini, and replies back using AI-generated voice — all in real time via WebSockets.

This project demonstrates a production-ready conversational AI system with persistent chat memory, multilingual support, and live deployment.

🚀 Key Features

* 🎤 Real-Time Speech Input (Browser Microphone)

* 🧠 LLM-Powered Conversations using Google Gemini

* 🗣️ Speech-to-Text (STT) via faster-whisper, Text-to-Speech via model "Korkoro-82M"

* 💬 Chat UI with History Persistence

* 🔁 Conversation Memory per Session

* 🌐 WebSocket-based Streaming Communication

* ☁️ Deployed on Huggingface Space (Demo- Production Grade)

* 🔐 Secure credential handling using environment variables

#### 🧠 System Architecture
Browser (Mic + UI)
       ->  WebSocket (Audio)
FastAPI Backend
       ->
Speech-to-Text (faster-whisper)
       ->
Conversation Memory (LangChain)
       ->
Gemini LLM (Response Generation)
       ->
Text-to-Speech (model "Korkoro-82M" Inference)
       ->
Browser (Audio Playback)

#### 🛠️ Tech Stack
#### Frontend

* HTML5 / CSS3

* JavaScript (Web Speech API)

* WebSocket (Real-time communication)

* LocalStorage (Chat persistence)

##### Backend

* FastAPI

* WebSockets

* LangChain

* Google Gemini (Generative AI)

* faster-whisper: Speech-to-Text

* "Korkoro-82M" Model Inference (Text-to-Speech) from HF

* Python 3.11

##### Deployment

* Docker

* Huggingface


#### ⚙️ Setup Instructions (Local)
* ##### 1️⃣ Clone Repository
git clone https://github.com/your-username/STS-STT-Chatbot.git
cd STS-AI-Chatbot

* ##### 2️⃣ Backend Setup
``cd backend``
``python -m venv env``
``source env/bin/activate  # Windows: env\Scripts\activate``
``pip install -r requirements.txt``


Create .env file:

GOOGLE_API_KEY=your_gemini_api_key,

HF_TOKEN=your_hugging_face_access_token


##### Run backend:

* uvicorn app.main:app --host 0.0.0.0 --port 8000

##### 3️⃣ Frontend Setup

* Open frontend/index.html in browser
(or servre using a static server)

##### 🌐 Deployment (Huggingface Space)

* Backend deployed using Docker

* WebSocket supported

* Secure environment variables used for credentials

##### 🔐 Security & Best Practices

* No credentials committed to source control

* Environment-based secrets

* Stateless WebSocket sessions with memory isolation

* Production-safe error handling

##### 📌 Use Cases

* AI Voice Assistants

* Customer Support Bots

* Accessibility Tools

* Conversational AI Demos

##### 📈 Future Enhancements

* Streaming partial STT results
  
* Streaming TTS audio

* Multi-language auto-detection

* User authentication

* Analytics dashboard

* Mobile UI support











