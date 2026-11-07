import { Composition, staticFile } from "remotion";
import { AngleTrailer } from "./Trailer";
import {
  ASSET_PATHS,
  COMPOSITION_ID,
  DEFAULT_PROPS,
  DEFAULT_SCENES,
  DURATION,
  FPS,
  captionsSchema,
  scenesSchema,
} from "./timeline";

async function optionalJson(path: string): Promise<unknown> {
  const response = await fetch(staticFile(path));
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
  const text = await response.text();
  if (text.trimStart().startsWith("<")) return undefined;
  return JSON.parse(text);
}

export const TrailerRoot = () => (
  <Composition
    id={COMPOSITION_ID}
    component={AngleTrailer}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={DURATION * FPS}
    defaultProps={DEFAULT_PROPS}
    calculateMetadata={async ({ props }) => {
      if (props.prepared) return { props };
      const [captions, scenes, assets] = await Promise.all([
        optionalJson("trailer/captions.json"),
        optionalJson("trailer/scenes.json"),
        Promise.all(
          ASSET_PATHS.map(async (path) => {
            const response = await fetch(staticFile(path), { method: "HEAD" });
            return response.ok && !response.headers.get("content-type")?.includes("text/html")
              ? path
              : null;
          }),
        ),
      ]);
      return {
        props: {
          ...props,
          assets: assets.filter((path): path is string => path !== null),
          captions: captions === undefined ? [] : captionsSchema.parse(captions),
          scenes: scenes === undefined ? DEFAULT_SCENES : scenesSchema.parse(scenes),
          prepared: true,
        },
      };
    }}
  />
);
