from faster_whisper import WhisperModel
import numpy as np

# ---------------- Load Faster Whisper Model ----------------
WHISPER_MODEL = WhisperModel(
    "small",
    device="cpu",
    compute_type="int8"   # ✅ CORRECT for CPU
)

# ---------------- Utility Functions ----------------

def decode_audio(data: bytes) -> np.ndarray:
    """
    Convert PCM16 bytes to float32 numpy array.
    """
    audio = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
    return audio

def transcribe_audio(audio: np.ndarray, sample_rate: int = 16000) -> str:
    """
    Transcribe float32 audio using Faster Whisper.
    """
    segments, _ = WHISPER_MODEL.transcribe(
        audio,
        beam_size=5,
        vad_filter=True,
        language="en"
    )
    return " ".join(segment.text for segment in segments)

def audio_chunks_to_text(chunks: list[bytes]) -> str:
    """
    Convert PCM16 chunks into text.
    """
    if not chunks:
        return ""
    audio_data = b"".join(chunks)
    audio_float = decode_audio(audio_data)
    return transcribe_audio(audio_float)
