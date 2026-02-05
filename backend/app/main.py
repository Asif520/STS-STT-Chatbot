from dotenv import load_dotenv
import os
load_dotenv()

import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.services.llm import ask_gemini
from app.services.memory import get_memory
# from app.services.tts_piper import synthesize
from app.services.tts_kokoro import synthesize
from app.services.stt_whisper import audio_chunks_to_text

# ---- FastAPI App ----
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.websocket("/ws/sts/{session_id}")
async def sts(ws: WebSocket, session_id: str):
    await ws.accept()
    memory = get_memory(session_id)
    

    try:
        while True:
            audio_chunks = []
            
            while True:
                message = await ws.receive()

                # ---------- Binary audio from client ----------
                if message.get("bytes"):
                    audio_chunks.append(message["bytes"])

                # ---------- Text messages ----------
                elif message.get("text"):  # text message
                    text = message["text"]
                    
                    if text == "END":  # end of audio recording
                        # ---------- STT ----------
                        user_text = audio_chunks_to_text(audio_chunks)
                        
                        if not user_text.strip():
                            await ws.send_text(json.dumps({"error": "Could not detect speech"}))
                            audio_chunks = []  # reset
                            continue
                        
                        # ---------- LLM + TTS ----------
                        ai_text = ask_gemini(user_text, memory)
                        try:
                            audio_bytes = synthesize(ai_text)
                            if not audio_bytes:
                                await ws.send_text(json.dumps({"error": "TTS generation failed"}))
                                audio_chunks = []  # reset
                                continue
                            await ws.send_text(json.dumps({
                                "text": ai_text,
                                "has_audio": True
                            }))
                            await ws.send_bytes(audio_bytes)
                            
                            audio_chunks = []  # reset
                        
                        except Exception as e:
                            print(f"TTS failed: {e}")
                            await ws.send_text(json.dumps({"error": "Could not generate speech"}))
                            continue
                    
                    else:  # plain text input (non-"END")
                        user_text = text
                        
                        ai_text = ask_gemini(user_text, memory)
                        
                        # For text input → send text only, no audio
                        await ws.send_text(json.dumps({
                            "text": ai_text,
                            "has_audio": False
                        }))
                        

    except WebSocketDisconnect:
        print(f"WebSocket disconnected: {session_id}")
