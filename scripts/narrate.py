# /// script
# requires-python = ">=3.14"
# dependencies = ["edge-tts", "imageio-ffmpeg"]
# ///
import asyncio
import array
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
DESTINATION = ROOT / "public/trailer"
VOICE = "en-US-AndrewMultilingualNeural"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


async def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    segments = DESTINATION / "segments"
    segments.mkdir(exist_ok=True)
    scenes = json.loads((ROOT / "scripts/narration.json").read_text())
    captions = []
    audio_files = []
    for scene in scenes:
        key = hashlib.sha256((VOICE + scene["voiceover"]).encode()).hexdigest()[:12]
        audio_path = segments / f"{scene['id']}-{key}.mp3"
        words_path = segments / f"{scene['id']}-{key}.json"
        if not audio_path.exists() or not words_path.exists():
            for attempt in range(3):
                words = []
                try:
                    with audio_path.open("wb") as audio:
                        async for item in edge_tts.Communicate(
                            scene["voiceover"], VOICE, boundary="WordBoundary"
                        ).stream():
                            if item["type"] == "audio":
                                audio.write(item["data"])
                            elif item["type"] == "WordBoundary":
                                words.append({"text": item["text"], "start": item["offset"] / 10_000_000, "end": (item["offset"] + item["duration"]) / 10_000_000})
                    break
                except edge_tts.exceptions.NoAudioReceived:
                    if attempt == 2:
                        raise
                    print(f"Retrying voice segment {scene['id']}", flush=True)
                    await asyncio.sleep(2)
            words_path.write_text(json.dumps(words))
        words = json.loads(words_path.read_text())
        info = subprocess.run([FFMPEG, "-hide_banner", "-i", str(audio_path)], capture_output=True, text=True).stderr
        duration_match = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", info)
        if not duration_match:
            raise RuntimeError(f"Could not read duration of {audio_path}")
        seconds = int(duration_match[1]) * 3600 + int(duration_match[2]) * 60 + float(duration_match[3])
        if seconds > scene["duration"] - 0.5:
            raise RuntimeError(f"Narration for {scene['id']} exceeds its scene: {seconds:.2f}s")
        group = []
        for word in words:
            if group and (len(group) >= 6 or len(" ".join(w["text"] for w in group)) + len(word["text"]) > 43):
                captions.append({"start": scene["start"] + 0.3 + group[0]["start"], "end": scene["start"] + 0.3 + group[-1]["end"] + 0.12, "text": " ".join(w["text"] for w in group)})
                group = []
            group.append(word)
        if group:
            captions.append({"start": scene["start"] + 0.3 + group[0]["start"], "end": scene["start"] + 0.3 + group[-1]["end"] + 0.12, "text": " ".join(w["text"] for w in group)})
        audio_files.append(audio_path)
        print(f"{scene['id']}: {seconds:.2f}s in {scene['duration']}s", flush=True)

    sample_rate = 22050
    samples = array.array("h")
    transitions = [scene["start"] for scene in scenes[1:]]
    for i in range(90 * sample_rate):
        t = i / sample_rate
        fade = min(t / 2, (90 - t) / 3, 1)
        chord = [146.83, 220.0, 293.66] if int(t / 12) % 2 == 0 else [130.81, 196.0, 261.63]
        value = sum(math.sin(2 * math.pi * tone * t) for tone in chord) * 0.0025
        value *= 0.6 + 0.4 * math.sin(t * 0.7) ** 2
        for point in transitions:
            d = t - point
            if 0 <= d < 0.45:
                value += math.sin(2 * math.pi * (180 * d - 130 * d * d)) * math.exp(-10 * d) * 0.018
        sample = round(max(-1, min(1, value * fade)) * 32767)
        samples.extend((sample, sample))
    bed_path = DESTINATION / "soundbed.wav"
    with wave.open(str(bed_path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(samples.tobytes())

    args = [FFMPEG, "-hide_banner", "-loglevel", "error", "-y"]
    for audio_path in audio_files:
        args += ["-i", str(audio_path)]
    args += ["-i", str(bed_path)]
    filters = [f"[{i}:a]adelay={round((scene['start'] + 0.3) * 1000)}:all=1[a{i}]" for i, scene in enumerate(scenes)]
    filters.append("".join(f"[a{i}]" for i in range(len(scenes))) + f"amix=inputs={len(scenes)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9[voice]")
    filters.append(f"[voice][{len(scenes)}:a]amix=inputs=2:normalize=0,alimiter=limit=0.95[out]")
    args += ["-filter_complex", ";".join(filters), "-map", "[out]", "-t", "90", "-ar", "48000", "-b:a", "192k", str(DESTINATION / "narration.mp3")]
    subprocess.run(args, check=True)
    for current, following in zip(captions, captions[1:]):
        current["end"] = min(current["end"], following["start"])
    (DESTINATION / "captions.json").write_text(json.dumps(captions, indent=2) + "\n")
    (DESTINATION / "scenes.json").write_text(json.dumps(scenes, indent=2) + "\n")
    def timestamp(seconds):
        millis = round(seconds * 1000)
        return f"{millis // 3_600_000:02}:{millis // 60_000 % 60:02}:{millis // 1000 % 60:02},{millis % 1000:03}"
    srt = "\n\n".join(f"{i + 1}\n{timestamp(item['start'])} --> {timestamp(item['end'])}\n{item['text']}" for i, item in enumerate(captions))
    (DESTINATION / "angle-demo.srt").write_text(srt + "\n")
    print(f"Narration, original sound bed and {len(captions)} timed captions ready.")


asyncio.run(main())
