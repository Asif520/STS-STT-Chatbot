import os
import io
import wave
from piper.voice import PiperVoice
from sqlalchemy import text

# ---- CONFIG ----
MODEL_PATH = os.getenv(
    "PIPER_MODEL_ONNX",
    "../models/en_US-lessac-medium.onnx"
)

CONFIG_PATH = os.getenv(
    "PIPER_MODEL_CONFIG",
    "../models/en_US-lessac-medium.json"
)

# ---- Load voice once (VERY IMPORTANT) ----
voice = PiperVoice.load(
    MODEL_PATH,
    CONFIG_PATH,
    use_cuda=False  # True only if CUDA available
)

def synthesize(text: str) -> bytes:
    """
    Convert text → speech (WAV bytes)
    """
    wav_io = io.BytesIO()

    with wave.open(wav_io, "wb") as wav_file:
        # These parameters are written only once
        voice.synthesize_wav(text,wav_file)

    return wav_io.getvalue()


