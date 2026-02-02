# import subprocess
# import tempfile
# import os

# PIPER_MODEL = "en_US-lessac-medium.onnx"

# def synthesize(text: str) -> bytes:
#     with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
#         out_path = f.name

#     process = subprocess.Popen(
#         ["piper", "--model", PIPER_MODEL, "--output_file", out_path],
#         stdin=subprocess.PIPE,
#         text=True
#     )

#     process.stdin.write(text)
#     process.stdin.close()
#     process.wait()

#     with open(out_path, "rb") as f:
#         audio = f.read()

#     os.remove(out_path)
#     return audio

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


