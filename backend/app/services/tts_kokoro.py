import os
import io
import wave
from huggingface_hub import InferenceClient

# Initialize the client once (outside functions)
client = InferenceClient(
    provider="replicate",                    # or "hf-inference" if you prefer
    api_key=os.getenv("HF_TOKEN"),
)

def synthesize(text: str) -> bytes:
    """
    Generate speech using Kokoro-82M via Hugging Face Inference API
    Returns WAV bytes compatible with your WebSocket
    """
    if not text.strip():
        return b""  # empty response

    try:
        # Call the text-to-speech endpoint
        audio_bytes = client.text_to_speech(
            text,
            model="hexgrad/Kokoro-82M",
            # Optional parameters (Kokoro supports some)
            # voice="default",          # most voices are single-speaker
            # speed=1.0,                # 0.5–2.0
            # temperature=0.7,          # controls variation (if supported)
        )

        # Kokoro usually returns raw PCM or WAV bytes
        # Make sure it's WAV with header (most inference endpoints return proper WAV)
        return audio_bytes

    except Exception as e:
        print(f"TTS API error: {e}")
        # Fallback: return silent WAV or error handling
        return create_silent_wav()

def create_silent_wav(duration_ms=500, sample_rate=22050):
    """Minimal fallback silent WAV"""
    import wave
    import io
    import struct

    num_frames = int(sample_rate * duration_ms / 1000)
    silent_data = b"\x00\x00" * num_frames  # 16-bit silence

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(silent_data)
    return buffer.getvalue()