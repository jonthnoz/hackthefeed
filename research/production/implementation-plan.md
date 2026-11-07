# Angle implementation and trailer

Angle helps mobile app builders choose how to present their product using what successful videos show, say and write on screen. The audience is a builder who needs an actionable creative direction without studying the sector manually.

## Definition of done

A browser on localhost can open a verified example, inspect its reference frames and metrics, read the observed approaches and open a concrete storyboard. A new brief starts an actual Oriane and Codex CLI research job and returns a saved result or a clear error. Repeating the same brief reuses cached work unless explicitly refreshed.

The deliverable also includes an English narrated MP4 trailer, targeted at 90 seconds and strictly shorter than three minutes, with readable synchronized subtitles, intentional motion design and a true representation of the working app. The project includes reproducible startup and rendering commands.

## Chosen shape

A React interface is served by Vite middleware inside one local HTTP server. The same server owns Oriane requests, JSON-file caches and bounded Codex CLI calls. Zod schemas define the shared study, source, observation and storyboard shapes. The interface never needs the Oriane key.

The alternative of making the browser call Oriane and managing the CLI separately was rejected because it complicates the local journey and cannot directly run the CLI. A separate database, deployment platform and workflow service are unnecessary for this demo.

Remotion produces the trailer from a timed React composition. Screenshots of the actual verified app and real reference frames appear inside the composition. Edge TTS supplies English narration and timing metadata. Typography, focus transitions and source-to-insight movement communicate the product's value.

## Work units and verification

1. Contracts and sources. Normalize the research into three curated studies with local media. Verify source IDs, timestamps and available metrics.
2. Research API. Run planning, retrieval and interpretation using Codex CLI and Oriane. Verify a real CLI image analysis, an actual research result and cache reuse.
3. Interface. Build a strong English brief-to-study-to-storyboard journey. Inspect it in the browser, including source details, another example, new research, loading and failure behavior.
4. Trailer. Write a short English script, generate Edge TTS, build motion scenes and show the real journey. Render representative frames before rendering the complete MP4.
5. Final verification. Check type/lint/build, relevant behavior checks, browser journey, local asset loading, audio track, duration, subtitle timing and representative final frames. Keep the app running on localhost for handoff.

Frontend work owns `src`. Backend work owns `server`, `shared` and data preparation. Trailer work owns `trailer` and its render script. Shared dependencies and data contracts remain under the coordinator's control.

## Cache and token policy

Cache each Oriane request by its exact normalized parameters. Cache assets by prompt and completed studies by brief, focus and prompt version. Pass compact source excerpts and selected local frames to Codex, rather than the large full API payload. Raw data remains available for traceability.

Curated studies are explicitly labeled as verified examples. A fresh job is not presented as live when it replays an example. Repeated studies report cache reuse. The video uses source data collected during the research and does not invent performance or install counts.

## Creative defaults

Working name Angle. English interface, voice and captions. Editorial composition, large typography, restrained green and acidic lime accents, warm paper backgrounds and dark cinematic title sequences. The main story follows Sokka's saved-place problem. Address identification is a mechanism-inspired branch; study tools provide another domain.

The PDF's brief on pages 10 and 11 asks for a precise user, a recurring question, a video-derived answer and a live product. Those requirements take priority over adding features.
