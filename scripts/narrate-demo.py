# /// script
# requires-python = ">=3.14"
# dependencies = ["edge-tts", "imageio-ffmpeg"]
# ///
"""Generate the demo voiceover per scene (Edge TTS) with word timings, plus a quiet original sound bed."""
import array
import asyncio
import hashlib
import json
import math
import pathlib
import re
import subprocess
import wave

import edge_tts
import imageio_ffmpeg

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public/demo"
VOICE = "en-US-AndrewMultilingualNeural"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def duration(path: pathlib.Path) -> float:
    info = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, text=True).stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", info).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


async def synthesize(text: str, audio_path: pathlib.Path) -> list[dict]:
    for attempt in range(3):
        words = []
        try:
            with audio_path.open("wb") as audio:
                async for item in edge_tts.Communicate(text, VOICE, rate="+4%", boundary="WordBoundary").stream():
                    if item["type"] == "audio":
                        audio.write(item["data"])
                    elif item["type"] == "WordBoundary":
                        words.append({"text": item["text"], "start": item["offset"] / 1e7, "end": (item["offset"] + item["duration"]) / 1e7})
            return words
        except edge_tts.exceptions.NoAudioReceived:
            if attempt == 2:
                raise
            await asyncio.sleep(2)
    return []


async def main():
    (OUT / "voice").mkdir(parents=True, exist_ok=True)
    scenes = json.loads((ROOT / "demo/narration.json").read_text())
    result = []
    for scene in scenes:
        key = hashlib.sha256((VOICE + scene["text"]).encode()).hexdigest()[:10]
        audio_path = OUT / "voice" / f"{scene['id']}-{key}.mp3"
        words_path = audio_path.with_suffix(".json")
        if not audio_path.exists() or not words_path.exists():
            words_path.write_text(json.dumps(await synthesize(scene["text"], audio_path)))
        seconds = duration(audio_path)
        result.append({**scene, "audio": f"demo/voice/{audio_path.name}", "seconds": round(seconds, 3), "words": json.loads(words_path.read_text())})
        print(f"{scene['id']}: {seconds:.2f}s")
    (OUT / "narration.json").write_text(json.dumps(result, indent=1) + "\n")

    rate, length = 44100, 90
    samples = array.array("h")
    for i in range(length * rate):
        t = i / rate
        chord = [110.0, 164.81, 220.0, 277.18] if int(t / 8) % 2 == 0 else [98.0, 146.83, 196.0, 246.94]
        value = sum(math.sin(2 * math.pi * f * t) * (0.6 if k else 1) for k, f in enumerate(chord)) * 0.004
        value *= (0.65 + 0.35 * math.sin(2 * math.pi * t / 4) ** 2) * min(t / 2.5, 1)
        sample = round(max(-1, min(1, value)) * 32767)
        samples.extend((sample, sample))
    with wave.open(str(OUT / "bed.wav"), "wb") as bed:
        bed.setnchannels(2)
        bed.setsampwidth(2)
        bed.setframerate(rate)
        bed.writeframes(samples.tobytes())
    print("bed ready")


asyncio.run(main())
