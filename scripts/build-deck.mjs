import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

// Run: node scripts/build-deck.mjs --wait 1800
// Layout rehearsal only: node scripts/build-deck.mjs --preview-source
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillDir =
  process.env.PRESENTATIONS_SKILL_DIR ||
  "/Users/macos/.codex/plugins/cache/openai-primary-runtime/presentations/26.614.11602/skills/presentations";
const { ensureArtifactToolWorkspace, importArtifactTool } = await import(
  pathToFileURL(path.join(skillDir, "scripts/artifact_tool_utils.mjs")).href
);
const thread = (process.env.CODEX_THREAD_ID || "manual-angle").replace(/[^a-zA-Z0-9_-]/g, "-");
const workspace = path.join(os.tmpdir(), "codex-presentations", thread, "angle-deck");
const tmp = path.join(workspace, "tmp");
const previewMode = process.argv.includes("--preview-source");
const runDir = path.join(tmp, previewMode ? "rehearsal" : "final");
const dirs = Object.fromEntries(
  ["slides", "preview", "layout", "assets", "qa"].map((name) => [name, path.join(runDir, name)]),
);
const outputDir = path.join(root, "output/submission");
const teamPath = path.join(root, "data/submission.json");
const notesPath = path.join(root, "research/production/deck-notes.txt");
const screens = ["home", "study", "proof", "storyboard"].map((name) =>
  path.join(root, `public/trailer/screen-${name}.png`),
);
const C = {
  paper: "#f4f3ee",
  green: "#1b3129",
  lime: "#dbfb79",
  muted: "#5f6c60",
  rule: "#d4d7cc",
  white: "#ffffff",
  pale: "#e8eadf",
};
const S = { width: 1280, height: 720 };
const execFileAsync = promisify(execFile);

async function exists(file) {
  try {
    return (await fs.stat(file)).size > 0;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function awaitScreens() {
  const waitIndex = process.argv.indexOf("--wait");
  const seconds = waitIndex < 0 ? 0 : Number(process.argv[waitIndex + 1] || 1800);
  if (!Number.isFinite(seconds) || seconds < 0)
    throw new Error("--wait requires a positive number of seconds.");
  const deadline = Date.now() + seconds * 1000;
  let lastLog = 0;
  for (;;) {
    const missing = [];
    for (const file of screens) if (!(await exists(file))) missing.push(path.relative(root, file));
    if (!missing.length) return;
    if (Date.now() >= deadline) {
      throw new Error(
        `Product screenshots pending: ${missing.join(", ")}. Run with --wait 1800 to wait for real captures. No submission deck was exported.`,
      );
    }
    if (Date.now() - lastLog > 30000) {
      console.log(`Waiting for real screenshots: ${missing.join(", ")}`);
      lastLog = Date.now();
    }
    await delay(Math.min(5000, deadline - Date.now()));
  }
}

async function loadTeam() {
  if (!(await exists(teamPath)))
    return { teamName: "Team details to add", members: [], pending: true };
  const team = JSON.parse(await fs.readFile(teamPath, "utf8"));
  if (typeof team.teamName !== "string" || !team.teamName.trim() || !Array.isArray(team.members)) {
    throw new Error("data/submission.json must contain { teamName, members: [{ name, role }] }.");
  }
  if (
    team.members.some(
      (member) =>
        typeof member.name !== "string" ||
        !member.name.trim() ||
        typeof member.role !== "string" ||
        !member.role.trim(),
    )
  ) {
    throw new Error("Each team member needs a name and role in data/submission.json.");
  }
  if (team.members.length > 4)
    throw new Error(
      "The team panel fits up to four members; update its layout before exporting a larger team.",
    );
  return { ...team, pending: team.members.length === 0 };
}

function box(slide, name, x, y, w, h, fill, stroke = "none", lineWidth = 0) {
  return slide.shapes.add({
    name,
    geometry: "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { fill: stroke, width: lineWidth, style: "solid" },
  });
}

function text(slide, name, content, x, y, w, h, size = 20, options = {}) {
  const shape = box(slide, name, x, y, w, h, "none");
  shape.text = content;
  shape.text.style = {
    typeface: "Arial",
    fontSize: size,
    color: C.green,
    alignment: "left",
    verticalAlignment: "top",
    autoFit: "none",
    wrap: "square",
    insets: { left: 0, right: 0, top: 0, bottom: 0 },
    ...options,
  };
  return shape;
}

function rule(slide, x, y, w, color = C.rule) {
  box(slide, "editorial-rule", x, y, w, 1, color);
}

function chrome(slide, section, number, dark = false) {
  const ink = dark ? C.paper : C.green;
  text(slide, "brand", "Angle", 48, 28, 180, 36, 26, { typeface: "Georgia", color: ink });
  text(slide, "section", section, 800, 38, 432, 20, 12, {
    bold: true,
    color: ink,
    alignment: "right",
  });
  rule(slide, 48, 78, 1184, dark ? "#526156" : C.rule);
  rule(slide, 48, 675, 1184, dark ? "#526156" : C.rule);
  text(slide, "footer", "ANGLE  /  TRACK01 VIDEO SEARCH", 48, 688, 650, 18, 10, {
    color: dark ? C.pale : C.muted,
  });
  text(slide, "page-number", `${String(number).padStart(2, "0")} / 03`, 1140, 686, 92, 20, 12, {
    color: ink,
    alignment: "right",
  });
}

async function image(slide, file, name, x, y, w, h, fit = "contain") {
  const bytes = await fs.readFile(file);
  return slide.images.add({
    name,
    blob: bytes,
    contentType: file.endsWith(".jpg") ? "image/jpeg" : "image/png",
    alt: name,
    fit,
    position: { left: x, top: y, width: w, height: h },
  });
}

async function writeBlob(file, blob) {
  await fs.writeFile(file, new Uint8Array(await blob.arrayBuffer()));
}

async function main() {
  if (!previewMode) await awaitScreens();
  const { packageDir } = await ensureArtifactToolWorkspace(workspace);
  const { Presentation, PresentationFile } = await importArtifactTool(workspace);
  const requireRuntime = createRequire(
    path.join(path.dirname(path.dirname(packageDir)), "angle-resolver.cjs"),
  );
  const sharp = requireRuntime("sharp");
  for (const dir of Object.values(dirs)) await fs.mkdir(dir, { recursive: true });
  const team = await loadTeam();
  const date = new Date().toISOString();
  const sourceNotes = [
    `ANGLE — CONTENT AND ASSET PROVENANCE\nBuilt ${date}; all operations local. Mode: create, structure following only.`,
    "Structure: user-provided pitchtemplate3slides PDF, interpreted in the task as (1) problem: precise builder, struggle, proof; (2) solution in four screenshots; (3) try it / team. The PDF is not a theme to clone. No inherited PPTX objects are used.",
    "Slide 1: exact problem statement supplied by user. Sokka is the real case supplied by user; product saves places from videos to a map. Qualitative format observations are supported by research/oriane/sokka-account-analysis.md, source date 2026-11-07. No performance statistics or causal claims appear.",
    "Slide 1 illustration: @sokka_map, 'Récit des restaurants envoyés', https://www.tiktok.com/@sokka_map/video/7705106745051401504 ; local research/oriane/sokka-media/7705106745051401504-full-sheet.jpg, first frame of eight-frame contact sheet, approx 0s. Cropped to the first 216 x 384 cell without retouching.",
    "Slide 1 demonstration: @sokka_map, 'Introduction UGC puis téléphone filmé', https://www.tiktok.com/@sokka_map/video/7697274631098600736 ; local research/oriane/sokka-media/7697274631098600736-full-sheet.jpg, second frame of eight-frame contact sheet, approx 3.8s. Cropped to the second 216 x 384 cell without retouching.",
    "Slide 2: four user/coordinator-captured real Angle app screenshots. Native editable step names and captions surround individual byte-backed screenshot crops. Original full captures and hashes are retained in scratch. No product UI is fabricated, rearranged or redrawn. Screenshot crops are raster extracts because artifact-tool preview ignored native image crop metadata; explicit extracts keep the PPTX and PDF visuals consistent.",
    "Slide 3: Angle, track01 Video Search, localhost:3000 LOCAL prototype, angle-demo.mp4, Oriane + Codex CLI, AI vision with spoken/on-screen evidence — user-supplied product and submission details. Local URL is labeled as local. Video is a sibling file, not an uploaded destination.",
    `Team identity: ${team.pending ? "explicit editable placeholder; team details pending" : "user-provided data/submission.json, loaded on this run"}. ${JSON.stringify(team)}`,
    "No generated raster assets. Design uses native editable text and rectangle shapes. Arial body + Georgia serif accents. No external services, uploads, or app mutations.",
  ];
  await fs.copyFile(fileURLToPath(import.meta.url), path.join(dirs.slides, "build-deck.mjs"));
  const caseImages = [];
  for (const [id, left, label] of [
    ["7705106745051401504", 0, "sokka-illustrated"],
    ["7697274631098600736", 216, "sokka-demo"],
  ]) {
    const dest = path.join(dirs.assets, `${label}.png`);
    await sharp(path.join(root, `research/oriane/sokka-media/${id}-full-sheet.jpg`))
      .extract({ left, top: 0, width: 216, height: 384 })
      .png()
      .toFile(dest);
    caseImages.push(dest);
  }
  const screenshotFiles = [];
  const realCaptures = [];
  for (let i = 0; i < screens.length; i++) {
    const real = !previewMode || (await exists(screens[i]));
    const source = real
      ? screens[i]
      : path.join(root, "research/production/pdf-context/brief-10.png");
    const dest = path.join(dirs.assets, `screen-${i + 1}.png`);
    const bytes = await fs.readFile(source);
    const metadata = await sharp(bytes).metadata();
    if (!metadata.width || !metadata.height || metadata.format !== "png")
      throw new Error(`Invalid PNG screenshot: ${source}`);
    await fs.writeFile(dest, bytes);
    screenshotFiles.push(dest);
    realCaptures.push(real);
    sourceNotes.push(
      `${real ? `Slide 2 step ${i + 1}, real Angle capture` : "REHEARSAL ONLY, real brief-page imagery, NOT product UI"}: ${path.relative(root, source)} ; ${metadata.width}x${metadata.height} ; SHA-256 ${createHash("sha256").update(bytes).digest("hex")} ; copied into retained scratch.`,
    );
  }
  await fs.writeFile(path.join(tmp, "source-notes.txt"), sourceNotes.join("\n\n") + "\n");
  await fs.writeFile(
    path.join(tmp, "slide-plan.txt"),
    [
      "ANGLE / THREE-SLIDE SUBMISSION / CREATE MODE",
      "Canvas: 1280 x 720, 16:9. Margins 48px; top rule y78, bottom rule y675. Repeated editorial brand, section title, track footer, page marker.",
      "Palette: paper #f4f3ee dominant across slides 1-2 (roughly two-thirds deck area), evergreen #1b3129 text and slide 3, lime #dbfb79 sharp highlight. Supporting pale #e8eadf, muted #5f6c60. Contrast: green on paper/lime, paper on green.",
      "Typography: Georgia serif for problem emphasis, Angle wordmark, slide 3 promise/team. Arial for headings, body, step numbers. Titles 40-46px; wordmark 74px; body 18-22px; step titles 22px; small captions 14px; eyebrows 12px; source/footer 10px.",
      "1 / PROBLEM: exact user problem statement, specified mobile builder, Sokka real case, paired source frames illustrating story vs demonstration. Native headline, body, labels, rules; two image objects. No stats.",
      "2 / SOLUTION: four actual Angle captures in a 2x2 walkthrough. Describe app → see references → inspect evidence → get storyboard. Native step titles and one-line purpose captions. Individual real screenshot crops embedded as editable image objects for legibility, without fictional redraws. Full original captures retained in scratch. Rehearsal is scratch-only and explicitly labeled.",
      "3 / TRY IT + TEAM: dark evergreen, large Angle and short one-sentence value proposition. Clearly LOCAL localhost:3000; sibling angle-demo.mp4; track01 Video Search; Oriane + Codex CLI; visual/spoken/on-screen evidence. Team read from data/submission.json; editable explicit placeholder only when absent.",
      "Verification: render all three PNGs, export a montage, inspect layout bounds, export native PPTX, read archive entries to verify three slide XMLs and intended font declarations. PDF companion uses the rendered PNGs if artifact-tool lacks PDF export. No PPTX mutation or alternate deck library.",
    ].join("\n\n") + "\n",
  );

  const p = Presentation.create({ slideSize: S });
  const s1 = p.slides.add();
  s1.background.fill = C.paper;
  chrome(s1, "01  /  THE PROBLEM", 1);
  text(s1, "specific-user", "FOR MOBILE APP BUILDERS", 48, 108, 600, 20, 12, { bold: true });
  text(
    s1,
    "problem-capability",
    "Mobile app builders can\nbuild the product.",
    48,
    155,
    700,
    108,
    41,
    { bold: true },
  );
  text(
    s1,
    "problem-struggle",
    "Finding the right way\nto show it is the hard part.",
    48,
    281,
    710,
    118,
    41,
    { typeface: "Georgia" },
  );
  box(s1, "case-eyebrow-highlight", 48, 446, 110, 27, C.lime);
  text(s1, "case-eyebrow", "REAL CASE", 58, 452, 98, 20, 12, { bold: true });
  text(s1, "case-product", "Sokka maps places saved from videos.", 48, 489, 665, 34, 24, {
    bold: true,
  });
  text(
    s1,
    "case-choice",
    "The builder still has to choose the hook,\nthe format, and what to prove on screen.",
    48,
    535,
    650,
    66,
    21,
    { color: C.muted },
  );
  rule(s1, 772, 108, 460);
  text(s1, "proof-headline", "One app. Different ways to show it.", 772, 123, 460, 28, 20, {
    bold: true,
  });
  await image(s1, caseImages[0], "Sokka public video: illustrated story", 772, 177, 210, 374);
  await image(s1, caseImages[1], "Sokka public video: phone demonstration", 1006, 177, 210, 374);
  text(s1, "source-format-one", "Illustrated story", 772, 566, 214, 26, 18, { bold: true });
  text(s1, "source-format-two", "Phone demonstration", 1006, 566, 225, 26, 18, { bold: true });
  text(
    s1,
    "source-caption",
    "Source: @sokka_map · public TikTok video frames",
    772,
    618,
    460,
    19,
    10,
    { color: C.muted },
  );
  s1.speakerNotes.textFrame.setText(
    "Real case provided by the project owner. Sokka organizes video-discovered places on a map. Public video examples demonstrate two distinct presentation formats; no format superiority, performance lift or market prevalence is claimed. Sources: https://www.tiktok.com/@sokka_map/video/7705106745051401504 and https://www.tiktok.com/@sokka_map/video/7697274631098600736 . Qualitative observations recorded 7 November 2026.",
  );

  const s2 = p.slides.add();
  s2.background.fill = C.paper;
  chrome(s2, "02  /  THE SOLUTION", 2);
  text(s2, "solution-title", "From app brief to a video worth making.", 48, 103, 1184, 64, 40, {
    typeface: "Georgia",
  });
  const steps = [
    {
      title: "Describe app",
      caption: "Start with the value to show.",
      crop: { left: 180 / 1920, top: 468 / 1080, right: 1180 / 1920, bottom: 432 / 1080 },
    },
    {
      title: "See references",
      caption: "Find relevant videos with Oriane.",
      crop: { left: 255 / 1920, top: 500 / 1080, right: 455 / 1920, bottom: 210 / 1080 },
    },
    {
      title: "Inspect evidence",
      caption: "Check frames, speech and on-screen text.",
      crop: { left: 1130 / 1920, top: 202 / 1080, right: 0, bottom: 658 / 1080 },
    },
    {
      title: "Get storyboard",
      caption: "Turn the research into shots.",
      crop: { left: 255 / 1920, top: 430 / 1080, right: 345 / 1920, bottom: 247 / 1080 },
    },
  ];
  for (let i = 0; i < steps.length; i++) {
    const x = 48 + (i % 2) * 608;
    const y = 182 + Math.floor(i / 2) * 238;
    box(s2, `step-number-bg-${i}`, x, y, 30, 27, C.lime);
    text(s2, `step-number-${i}`, `0${i + 1}`, x + 5, y + 5, 24, 20, 12, { bold: true });
    text(s2, `step-title-${i}`, steps[i].title, x + 42, y, 520, 30, 22, { bold: true });
    box(s2, `screenshot-frame-${i}`, x, y + 39, 576, 176, C.white, C.rule, 1);
    let focused = screenshotFiles[i];
    if (realCaptures[i] && steps[i].crop) {
      const { width, height } = await sharp(screenshotFiles[i]).metadata();
      const crop = steps[i].crop;
      focused = path.join(dirs.assets, `screen-${i + 1}-focus.png`);
      await sharp(screenshotFiles[i])
        .extract({
          left: Math.round(width * crop.left),
          top: Math.round(height * crop.top),
          width: Math.round(width * (1 - crop.left - crop.right)),
          height: Math.round(height * (1 - crop.top - crop.bottom)),
        })
        .png()
        .toFile(focused);
    }
    await image(
      s2,
      focused,
      realCaptures[i]
        ? `Angle real screenshot detail: ${steps[i].title}`
        : `REHEARSAL SOURCE IMAGE ${i + 1}; not product UI`,
      x + 1,
      y + 40,
      574,
      174,
      "contain",
    );
    text(s2, `step-purpose-${i}`, steps[i].caption, x, y + 218, 576, 22, 14, { color: C.muted });
  }
  await fs.writeFile(
    path.join(dirs.layout, "screenshot-focus-crops.json"),
    JSON.stringify(steps, null, 2),
  );
  if (previewMode) {
    box(s2, "rehearsal-label-bg", 295, 338, 690, 46, C.green);
    text(
      s2,
      "rehearsal-label",
      "LAYOUT REHEARSAL — WAITING FOR REAL APP CAPTURES",
      310,
      352,
      660,
      26,
      17,
      { bold: true, color: C.lime, alignment: "center" },
    );
  }
  s2.speakerNotes.textFrame.setText(
    "Four-step Angle workflow: describe the app; view video references; inspect timestamped visual, spoken and on-screen evidence; get a storyboard connected to the research. Screenshots are real local prototype captures. Cached source examples are research evidence, not proof of causal marketing effectiveness. No generated product UI is used.",
  );

  const s3 = p.slides.add();
  s3.background.fill = C.green;
  chrome(s3, "03  /  TRY IT + TEAM", 3, true);
  text(s3, "track", "TRACK01  /  VIDEO SEARCH", 48, 111, 700, 24, 12, {
    bold: true,
    color: C.lime,
  });
  text(s3, "product-name", "Angle", 44, 151, 670, 102, 80, { typeface: "Georgia", color: C.paper });
  text(
    s3,
    "value-proposition",
    "Turn video evidence into\nyour app’s next storyboard.",
    48,
    282,
    740,
    124,
    39,
    { typeface: "Georgia", color: C.paper },
  );
  box(s3, "local-cta-bg", 48, 452, 690, 62, C.lime);
  text(s3, "local-label", "LOCAL PROTOTYPE", 64, 475, 150, 20, 11, { bold: true });
  const localLink = text(s3, "local-url", "localhost:3000", 236, 468, 482, 37, 28, { bold: true });
  localLink.text.get("localhost:3000").link = { uri: "http://localhost:3000", isExternal: true };
  text(s3, "video-label", "WATCH THE LOCAL DEMO", 48, 542, 690, 20, 11, {
    bold: true,
    color: C.pale,
  });
  const videoLink = text(s3, "video-file", "angle-demo.mp4", 48, 568, 670, 36, 24, {
    color: C.paper,
  });
  videoLink.text.get("angle-demo.mp4").link = { uri: "angle-demo.mp4", isExternal: true };
  text(
    s3,
    "video-location",
    "Included beside this deck in the submission folder.",
    48,
    610,
    690,
    24,
    14,
    { color: C.pale },
  );
  box(s3, "team-panel", 808, 113, 424, 522, C.paper);
  text(s3, "team-label", "THE TEAM", 836, 140, 366, 22, 12, { bold: true });
  text(s3, "team-name", team.teamName, 836, 179, 366, 60, 42, { typeface: "Georgia" });
  if (team.pending) {
    text(s3, "team-placeholder", "Team details to add", 836, 256, 366, 55, 24);
  } else {
    const slotHeight = Math.min(60, 192 / team.members.length);
    for (const [i, member] of team.members.entries()) {
      text(s3, `member-name-${i}`, member.name, 836, 256 + i * slotHeight, 366, 30, 24, {
        bold: true,
      });
      text(s3, `member-role-${i}`, member.role, 836, 287 + i * slotHeight, 366, 25, 17, {
        color: C.muted,
      });
    }
  }
  rule(s3, 836, 458, 368);
  text(s3, "built-with-label", "BUILT WITH", 836, 481, 366, 20, 12, { bold: true });
  text(s3, "built-with", "Oriane + Codex CLI", 836, 512, 366, 34, 24, { bold: true });
  text(
    s3,
    "evidence-method",
    "AI vision + spoken and\non-screen evidence.",
    836,
    560,
    366,
    52,
    19,
    { color: C.muted },
  );
  s3.speakerNotes.textFrame.setText(
    `Angle, track01 Video Search. Team identity provided by user: ${team.teamName}; ${team.members.map((member) => `${member.name}, ${member.role}`).join("; ") || "Team details to add"}. localhost:3000 is a LOCAL prototype, not a public deployment. angle-demo.mp4 is the local companion video in this submission folder. Built with Oriane + Codex CLI. Visual analysis includes AI vision plus spoken and on-screen evidence.`,
  );

  const slideRenders = [];
  for (const [i, slide] of p.slides.items.entries()) {
    const stem = `slide-${i + 1}`;
    const pngPath = path.join(dirs.preview, `${stem}.png`);
    await writeBlob(pngPath, await p.export({ slide, format: "png", scale: 1.5 }));
    slideRenders.push(pngPath);
    await fs.writeFile(
      path.join(dirs.layout, `${stem}.json`),
      await (await slide.export({ format: "layout" })).text(),
    );
  }
  // Compose the contact sheet from the verified individual renders; the runtime
  // montage flag currently returns only the first slide in this environment.
  const thumbnails = await Promise.all(
    slideRenders.map((file) => sharp(file).resize(960, 540).toBuffer()),
  );
  await sharp({ create: { width: 960, height: 1620, channels: 3, background: C.paper } })
    .composite(thumbnails.map((input, i) => ({ input, left: 0, top: i * 540 })))
    .webp({ quality: 92 })
    .toFile(path.join(dirs.preview, "montage.webp"));
  await fs.writeFile(path.join(dirs.layout, "presentation.json"), JSON.stringify(p.toProto()));
  await fs.writeFile(
    path.join(dirs.layout, "inspect.txt"),
    (await p.inspect({ kind: "slide,textbox,shape,image", maxChars: 60000 })).ndjson,
  );

  // The exporter writes an inspection sidecar beside its target. Keep both in
  // scratch, then copy only the requested deliverables into the submission.
  const scratchPptx = path.join(runDir, previewMode ? "angle-rehearsal.pptx" : "angle-deck.pptx");
  await (await PresentationFile.exportPptx(p)).save(scratchPptx);
  const entries = (await execFileAsync("unzip", ["-Z1", scratchPptx])).stdout.trim().split("\n");
  const slideEntries = entries.filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry));
  if (slideEntries.length !== 3)
    throw new Error("PPTX verification failed: expected exactly three slides.");
  let allSlideXml = "";
  const objectCounts = [];
  for (const entry of slideEntries) {
    const xml = (await execFileAsync("unzip", ["-p", scratchPptx, entry])).stdout;
    allSlideXml += xml;
    objectCounts.push({
      slide: entry,
      editableTextRuns: (xml.match(/<a:t>/g) || []).length,
      imageObjects: (xml.match(/<p:pic>/g) || []).length,
    });
  }
  for (const font of ["Arial", "Georgia"]) {
    if (!allSlideXml.includes(`typeface="${font}"`))
      throw new Error(`Expected font missing from PPTX: ${font}`);
  }
  for (let i = 1; i <= 3; i++) {
    const layout = JSON.parse(await fs.readFile(path.join(dirs.layout, `slide-${i}.json`), "utf8"));
    for (const element of layout.elements) {
      const [x, y, w, h] = element.bbox;
      if (x < 0 || y < 0 || x + w > S.width + 0.1 || y + h > S.height + 0.1)
        throw new Error(`Slide ${i}: off-canvas object ${element.name}`);
    }
  }
  await fs.writeFile(
    path.join(dirs.qa, "mechanical-checks.txt"),
    `PASS: three slides; all objects on canvas; Arial and Georgia present in exported slide XML.\n${JSON.stringify(objectCounts, null, 2)}\n`,
  );
  const { PDFDocument } = requireRuntime("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle("Angle — submission deck");
  pdf.setSubject("Problem, solution walkthrough, local prototype and team");
  for (const render of slideRenders) {
    const embedded = await pdf.embedPng(await fs.readFile(render));
    pdf.addPage([960, 540]).drawImage(embedded, { x: 0, y: 0, width: 960, height: 540 });
  }
  const scratchPdf = path.join(runDir, previewMode ? "angle-rehearsal.pdf" : "angle-deck.pdf");
  await fs.writeFile(scratchPdf, await pdf.save());
  const pptxPath = previewMode ? scratchPptx : path.join(outputDir, "angle-deck.pptx");
  const pdfPath = previewMode ? scratchPdf : path.join(outputDir, "angle-deck.pdf");
  if (!previewMode) {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.copyFile(scratchPptx, pptxPath);
    await fs.copyFile(scratchPdf, pdfPath);
  }
  const pendingVideo = !(await exists(path.join(outputDir, "angle-demo.mp4")));
  const status =
    [
      `ANGLE DECK / ${previewMode ? "SCRATCH REHEARSAL ONLY" : "FINAL EXPORT"}`,
      `Build: node scripts/build-deck.mjs${previewMode ? " --preview-source" : " --wait 1800"}`,
      `Editable PPTX: ${pptxPath}`,
      `PDF companion: ${pdfPath}`,
      "PDF uses three rendered slide images because the artifact-tool presentation API supports PNG/JPEG/WebP/layout, not PDF. PPTX remains native editable text/shapes plus individual real images.",
      `Retained scratch: ${workspace}`,
      `Renders + montage: ${dirs.preview}`,
      `Team: ${team.teamName}; ${team.members.map((member) => `${member.name} — ${member.role}`).join("; ") || "Team details to add"}.`,
      previewMode
        ? "WAITING: four real public/trailer/screen-{home,study,proof,storyboard}.png assets. Temporary brief imagery is clearly labeled and exported only to scratch. No final submission export from rehearsal."
        : "Four actual Angle app screenshots embedded; paths, dimensions and SHA-256 hashes recorded in source-notes.txt.",
      pendingVideo
        ? "Companion video: angle-demo.mp4 is pending in output/submission; produced by the trailer owner. This builder references it without changing video files."
        : "Companion video: angle-demo.mp4 exists beside the deck.",
      "QA: all three slides rendered and montage saved. Full-size visual review and PPTX archive/font checks are recorded separately in scratch qa/visual-qa.txt after inspection.",
      "Sources: real Sokka public video frames, local qualitative Sokka research, user instructions, real Angle screenshots, data/submission.json. No invented statistics or team identity.",
      "Ownership: only scripts/build-deck.mjs, research/production/deck-notes.txt, presentation scratch, final angle-deck.pptx/pdf were written. No app/frontend/backend/trailer/package edits. No uploads.",
    ].join("\n\n") + "\n";
  await fs.writeFile(notesPath, status);
  await fs.writeFile(path.join(dirs.qa, "build-status.txt"), status);
  console.log(status);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
