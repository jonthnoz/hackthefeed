import { z } from "zod";

export const FPS = 30;
export const DURATION = 90;
export const COMPOSITION_ID = "AngleTrailer";

export const captionSchema = z
  .object({
    start: z.number().finite().nonnegative(),
    end: z.number().finite().positive(),
    text: z.string().trim().min(1),
  })
  .refine((caption) => caption.end > caption.start, "Caption end must follow start");
export const captionsSchema = z.array(captionSchema);
export type Caption = z.infer<typeof captionSchema>;

export const sceneSchema = z.object({
  id: z.string(),
  start: z.number().finite().nonnegative(),
  duration: z.number().finite().positive(),
  voiceover: z.string().default(""),
  title: z.string().default(""),
});
export const scenesSchema = z
  .array(sceneSchema)
  .length(8)
  .superRefine((scenes, context) => {
    let end = 0;
    for (const scene of scenes) {
      if (Math.abs(scene.start - end) > 1 / FPS) {
        context.addIssue({
          code: "custom",
          message: "The eight scenes must be contiguous, starting at zero",
        });
      }
      end = scene.start + scene.duration;
    }
    if (Math.abs(end - DURATION) > 1 / FPS) {
      context.addIssue({ code: "custom", message: "The scene timeline must end at 90 seconds" });
    }
  });
export type SceneTiming = z.infer<typeof sceneSchema>;

export const DEFAULT_SCENES: SceneTiming[] = [
  { id: "problem", start: 0, duration: 8, title: "You built the app.", voiceover: "" },
  { id: "brief", start: 8, duration: 10, title: "Find your angle.", voiceover: "" },
  { id: "search", start: 18, duration: 12, title: "Search beyond keywords.", voiceover: "" },
  { id: "study", start: 30, duration: 13, title: "A better starting point.", voiceover: "" },
  { id: "proof", start: 43, duration: 13, title: "Follow the evidence.", voiceover: "" },
  { id: "storyboard", start: 56, duration: 12, title: "Make it yours.", voiceover: "" },
  { id: "identify", start: 68, duration: 12, title: "Change the promise.", voiceover: "" },
  { id: "end", start: 80, duration: 10, title: "Angle", voiceover: "" },
];

export const SCREENSHOTS = [
  "trailer/screen-home.png",
  "trailer/screen-study.png",
  "trailer/screen-proof.png",
  "trailer/screen-storyboard.png",
  "trailer/screen-identify.png",
];

export const SOURCES = [
  {
    path: "media/cnt_8d8a072b69a716cd9353697a2328-0.webp",
    handle: "@inbetweenpics",
    time: "00:00",
    label: "A specific travel problem",
  },
  {
    path: "media/cnt_4c2eaff6a5de128426577775304a-0.webp",
    handle: "@lesfrenchiestravel",
    time: "00:02",
    label: "A concrete trip-planning problem",
  },
  {
    path: "media/cnt_199efb33944c3dbefa55799dfb6d-0.webp",
    handle: "@isabellacarrr",
    time: "00:01.97",
    label: "A real walking routine",
  },
  {
    path: "media/cnt_8d8a072b69a716cd9353697a2328-1.webp",
    handle: "@inbetweenpics",
    time: "00:26.43",
    label: "A visible map payoff",
  },
];

export const ASSET_PATHS = [
  ...SCREENSHOTS,
  ...SOURCES.map((source) => source.path),
  "trailer/narration.mp3",
];

export type TrailerProps = {
  assets: string[];
  captions: Caption[];
  scenes: SceneTiming[];
  prepared: boolean;
  allowMissingAssets: boolean;
};

export const DEFAULT_PROPS: TrailerProps = {
  assets: [],
  captions: [],
  scenes: DEFAULT_SCENES,
  prepared: false,
  allowMissingAssets: true,
};
