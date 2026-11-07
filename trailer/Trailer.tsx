import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DURATION, SOURCES } from "./timeline";
import type { Caption, TrailerProps } from "./timeline";

const C = {
  ink: "#10251d",
  dark: "#091a14",
  paper: "#f1efe5",
  lime: "#d6f86b",
  muted: "#a3b0a2",
  rule: "#c9cec0",
};
const serif = 'Georgia, "Times New Roman", serif';
const sans = "Arial, Helvetica, sans-serif";
const ease = Easing.bezier(0.22, 1, 0.36, 1);

function reveal(frame: number, delay = 0, length = 30) {
  return interpolate(frame, [delay, delay + length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
}

function Mark({ size = 30, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M7 31 19.5 7H32L19 31H7Z" stroke={color} strokeWidth="2.5" />
      <path d="M19.5 7 25 31H36" stroke={color} strokeWidth="2.5" />
    </svg>
  );
}

function Eyebrow({
  children,
  light = false,
  style,
}: {
  children: ReactNode;
  light?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: sans,
        fontSize: 18,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: 3.6,
        color: light ? C.muted : "#617164",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Words({
  text,
  frame,
  delay = 0,
  size = 96,
  accent = false,
  style,
}: {
  text: string;
  frame: number;
  delay?: number;
  size?: number;
  accent?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: -size * 0.052,
        fontWeight: 400,
        ...style,
      }}
    >
      {text.split(" ").map((word, index) => {
        const p = reveal(frame, delay + index * 4, 32);
        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "top",
              paddingBottom: "0.12em",
              marginBottom: "-0.12em",
              marginRight: "0.23em",
            }}
          >
            <span
              style={{
                display: "inline-block",
                opacity: p,
                transform: `translateY(${(1 - p) * 105}%)`,
                fontFamily: accent ? serif : sans,
                fontStyle: accent ? "italic" : "normal",
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function Shell({
  children,
  dark = false,
  chapter,
  number,
  frame,
}: {
  children: ReactNode;
  dark?: boolean;
  chapter: string;
  number: string;
  frame: number;
}) {
  const { durationInFrames } = useVideoConfig();
  const enter = reveal(frame, 0, 24);
  const exit = interpolate(frame, [durationInFrames - 14, durationInFrames - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: dark ? C.dark : C.paper,
        color: dark ? C.paper : C.ink,
        fontFamily: sans,
        overflow: "hidden",
      }}
    >
      {dark && (
        <AbsoluteFill
          style={{
            background: "radial-gradient(ellipse at 75% 24%, #1d3b2a 0%, transparent 65%)",
            opacity: 0.7,
          }}
        />
      )}
      <AbsoluteFill
        style={{ opacity: enter * exit, transform: `translateY(${(1 - enter) * 14}px)` }}
      >
        <div
          style={{
            position: "absolute",
            top: 47,
            left: 72,
            display: "flex",
            alignItems: "center",
            gap: 11,
            fontSize: 28,
            letterSpacing: -1,
          }}
        >
          <Mark size={30} />
          <span>angle</span>
        </div>
        <Eyebrow
          light={dark}
          style={{ position: "absolute", right: 72, top: 56, fontSize: 14, letterSpacing: 2.5 }}
        >
          {chapter}
        </Eyebrow>
        {children}
        <div
          style={{
            position: "absolute",
            left: 72,
            right: 72,
            bottom: 170,
            height: 1,
            background: dark ? "#58715b55" : "#10251d26",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 72,
            bottom: 133,
            fontSize: 13,
            letterSpacing: 2.8,
            color: dark ? C.muted : "#617164",
          }}
        >
          CREATIVE DIRECTION, GROUNDED IN VIDEO.
        </div>
        <div
          style={{
            position: "absolute",
            right: 72,
            bottom: 128,
            fontFamily: serif,
            fontSize: 24,
            color: dark ? C.muted : "#617164",
          }}
        >
          {number}
          <span style={{ fontFamily: sans, fontSize: 12, marginLeft: 10 }}>/ 08</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Asset({
  path,
  assets,
  allowMissingAssets,
  style,
  fit = "cover",
}: Pick<TrailerProps, "assets" | "allowMissingAssets"> & {
  path: string;
  style?: CSSProperties;
  fit?: "cover" | "contain";
}) {
  if (assets.includes(path))
    return (
      <Img
        src={staticFile(path)}
        style={{ width: "100%", height: "100%", objectFit: fit, ...style }}
      />
    );
  if (!allowMissingAssets) throw new Error(`Missing final trailer asset: ${path}`);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#d9dfcf",
        color: C.ink,
        padding: 24,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <Mark size={60} />
      <div style={{ fontSize: 16, letterSpacing: 2, marginTop: 24 }}>DEVELOPMENT ASSET</div>
      <div style={{ fontSize: 15, marginTop: 12, textAlign: "center" }}>{path}</div>
    </div>
  );
}

function Screen({
  path,
  frame,
  assets,
  allowMissingAssets,
  left = 650,
  top = 198,
  width = 1220,
  height = 680,
  scale = 1.15,
  origin = "48% 15%",
  drift = 20,
}: Pick<TrailerProps, "assets" | "allowMissingAssets"> & {
  path: string;
  frame: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scale?: number;
  origin?: string;
  drift?: number;
}) {
  const p = reveal(frame, 14, 48);
  const { durationInFrames } = useVideoConfig();
  const progress = Math.min(1, frame / durationInFrames);
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        transform: `translateY(${(1 - p) * 45}px)`,
        opacity: p,
        borderRadius: 15,
        background: "#fff",
        border: "1px solid #10251d25",
        boxShadow: "0 32px 75px #071b1426",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 34,
          background: "#e3e7dc",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 15px",
          borderBottom: "1px solid #10251d1c",
        }}
      >
        {[0, 1, 2].map((n) => (
          <span
            key={n}
            style={{ width: 6, height: 6, borderRadius: "50%", background: "#82907e" }}
          />
        ))}
        <span
          style={{
            position: "absolute",
            left: "44%",
            fontSize: 11,
            letterSpacing: 1.5,
            color: "#5f705d",
          }}
        >
          ANGLE / PRODUCT
        </span>
      </div>
      <div style={{ height: height - 34, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${scale + progress * 0.025}) translateY(${-progress * drift}px)`,
            transformOrigin: origin,
          }}
        >
          <Asset
            path={path}
            assets={assets}
            allowMissingAssets={allowMissingAssets}
            fit="cover"
            style={{ objectPosition: "center top" }}
          />
        </div>
      </div>
    </div>
  );
}

function SourceFrame({
  index,
  frame,
  delay = 0,
  assets,
  allowMissingAssets,
  left,
  top,
  width = 260,
  height = 448,
  rotate = 0,
}: Pick<TrailerProps, "assets" | "allowMissingAssets"> & {
  index: number;
  frame: number;
  delay?: number;
  left: number;
  top: number;
  width?: number;
  height?: number;
  rotate?: number;
}) {
  const source = SOURCES[index];
  if (!source) throw new Error(`Unknown source ${index}`);
  const p = reveal(frame, delay, 42);
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        opacity: p,
        transform: `translateY(${(1 - p) * 90}px) rotate(${rotate * p}deg)`,
        transformOrigin: "center 80%",
        boxShadow: "0 25px 65px #0003",
        background: C.paper,
        padding: 8,
        borderRadius: 5,
      }}
    >
      <div style={{ height, overflow: "hidden", position: "relative" }}>
        <Asset path={source.path} assets={assets} allowMissingAssets={allowMissingAssets} />
        <div
          style={{
            position: "absolute",
            bottom: 13,
            left: 13,
            padding: "7px 10px",
            background: C.dark,
            color: C.lime,
            fontSize: 14,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {source.time}
        </div>
      </div>
      <div style={{ padding: "14px 8px 9px", color: C.ink, fontSize: 15, letterSpacing: -0.3 }}>
        {source.handle}
      </div>
    </div>
  );
}

function Connector({
  frame,
  delay = 0,
  d,
  dark = false,
}: {
  frame: number;
  delay?: number;
  d: string;
  dark?: boolean;
}) {
  const p = reveal(frame, delay, 52);
  return (
    <svg
      viewBox="0 0 1920 1080"
      style={{ position: "absolute", inset: 0, width: 1920, height: 1080, pointerEvents: "none" }}
    >
      <path
        d={d}
        pathLength={1}
        stroke={dark ? C.lime : "#5e7854"}
        strokeWidth={2}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
        fill="none"
      />
    </svg>
  );
}

function Opening({ frame }: { frame: number }) {
  const turn = reveal(frame, 112, 45);
  return (
    <Shell dark chapter="For the builders" number="01" frame={frame}>
      <div style={{ position: "absolute", left: 150, top: 210 }}>
        <Eyebrow light>THE PRODUCT IS READY.</Eyebrow>
        <Words text="You built" frame={frame} delay={10} size={150} style={{ marginTop: 32 }} />
        <Words text="the app." frame={frame} delay={24} size={150} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 1020,
          top: 500,
          opacity: turn,
          transform: `translateY(${(1 - turn) * 35}px)`,
        }}
      >
        <div style={{ height: 2, width: 100, background: C.lime, marginBottom: 29 }} />
        <Words text="How do you" frame={frame} delay={112} size={65} />
        <Words
          text="make people care?"
          frame={frame}
          delay={124}
          size={69}
          accent
          style={{ color: C.lime }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 208,
          left: 1120,
          width: 430,
          height: 250,
          border: "1px solid #a3b0a233",
          transform: `rotate(-12deg) translateX(${(1 - reveal(frame, 30, 70)) * 80}px)`,
          opacity: reveal(frame, 30, 70),
        }}
      >
        <div style={{ position: "absolute", inset: 32, border: "1px solid #a3b0a233" }} />
        <svg width="430" height="250" viewBox="0 0 430 250">
          <path d="M62 186 186 63H363" stroke={C.lime} strokeWidth="2" fill="none" />
          <circle cx="186" cy="63" r="7" fill={C.lime} />
        </svg>
      </div>
    </Shell>
  );
}

function Brief({
  frame,
  ...assets
}: Pick<TrailerProps, "assets" | "allowMissingAssets"> & { frame: number }) {
  return (
    <Shell chapter="01 / Start with your product" number="02" frame={frame}>
      <div style={{ position: "absolute", left: 88, top: 204, width: 510 }}>
        <Eyebrow>A PRODUCT. A QUESTION.</Eyebrow>
        <Words text="Find your" frame={frame} delay={5} size={87} style={{ marginTop: 30 }} />
        <Words text="angle." frame={frame} delay={17} size={126} accent />
        <div
          style={{
            marginTop: 42,
            fontSize: 27,
            lineHeight: 1.5,
            maxWidth: 430,
            opacity: reveal(frame, 35),
          }}
        >
          Help people rediscover
          <br />
          the places they saved.
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 13,
            marginTop: 37,
            padding: "15px 20px",
            background: C.lime,
            fontSize: 18,
          }}
        >
          <span style={{ height: 8, width: 8, background: C.ink, borderRadius: "50%" }} />
          The Sokka brief
        </div>
      </div>
      <Screen
        path="trailer/screen-home.png"
        frame={frame}
        {...assets}
        scale={1.08}
        origin="50% 20%"
      />
    </Shell>
  );
}

function Search({
  frame,
  ...assets
}: Pick<TrailerProps, "assets" | "allowMissingAssets"> & { frame: number }) {
  const modes = [
    { word: "show", detail: "Frames & visual moments", x: 990, y: 280 },
    { word: "say", detail: "Spoken words & context", x: 1155, y: 465 },
    { word: "write", detail: "Text inside the video", x: 990, y: 650 },
  ];
  return (
    <Shell dark chapter="02 / Research with Oriane" number="03" frame={frame}>
      <Eyebrow light style={{ position: "absolute", left: 88, top: 175 }}>
        SEARCH WHAT VIDEOS
      </Eyebrow>
      <SourceFrame
        index={1}
        frame={frame}
        delay={5}
        left={100}
        top={320}
        rotate={-9}
        width={225}
        height={396}
        {...assets}
      />
      <SourceFrame
        index={2}
        frame={frame}
        delay={14}
        left={300}
        top={275}
        rotate={-1}
        width={245}
        height={434}
        {...assets}
      />
      <SourceFrame
        index={0}
        frame={frame}
        delay={24}
        left={505}
        top={315}
        rotate={8}
        width={240}
        height={425}
        {...assets}
      />
      <Connector
        frame={frame}
        delay={38}
        dark
        d="M790 560H865V350H952 M865 560H1115 M865 560V725H952"
      />
      {modes.map((mode, index) => (
        <div
          key={mode.word}
          style={{ position: "absolute", left: mode.x, top: mode.y, width: 600 }}
        >
          <Words
            text={mode.word}
            frame={frame}
            delay={45 + index * 21}
            size={98}
            accent
            style={{ color: C.lime }}
          />
          <div
            style={{
              fontSize: 23,
              marginTop: 5,
              color: C.muted,
              opacity: reveal(frame, 65 + index * 21),
            }}
          >
            {mode.detail}
          </div>
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: 103,
          top: 862,
          opacity: reveal(frame, 115),
          display: "flex",
          alignItems: "center",
          gap: 15,
        }}
      >
        <div style={{ width: 28, height: 1, background: C.lime }} />
        <Eyebrow light style={{ fontSize: 14 }}>
          VIDEO SEARCH POWERED BY ORIANE
        </Eyebrow>
      </div>
    </Shell>
  );
}

function Study({
  frame,
  ...assets
}: Pick<TrailerProps, "assets" | "allowMissingAssets"> & { frame: number }) {
  return (
    <Shell chapter="03 / Explore nearby value propositions" number="04" frame={frame}>
      <div style={{ position: "absolute", left: 88, top: 171, width: 570 }}>
        <Eyebrow>RELEVANT REFERENCES</Eyebrow>
        <Words text="Similar value." frame={frame} delay={5} size={78} style={{ marginTop: 30 }} />
        <Words text="Fresh perspective." frame={frame} delay={17} size={78} accent />
        <div
          style={{
            width: 400,
            fontSize: 25,
            lineHeight: 1.5,
            marginTop: 33,
            opacity: reveal(frame, 40),
          }}
        >
          See how other videos make
          <br />
          the same problem tangible.
        </div>
        <div style={{ marginTop: 38, display: "flex", gap: 10, opacity: reveal(frame, 65) }}>
          {["The situation", "The hook"].map((text) => (
            <div
              key={text}
              style={{ padding: "12px 16px", border: `1px solid ${C.rule}`, fontSize: 16 }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
      <Screen
        path="trailer/screen-study.png"
        frame={frame}
        left={620}
        top={190}
        width={1220}
        height={680}
        scale={1.17}
        origin="55% 40%"
        drift={32}
        {...assets}
      />
      <div
        style={{
          position: "absolute",
          left: 88,
          top: 715,
          width: 410,
          padding: "22px 0",
          borderTop: `1px solid ${C.rule}`,
          opacity: reveal(frame, 95),
        }}
      >
        <Eyebrow style={{ fontSize: 13, letterSpacing: 2 }}>
          VERIFIED EXAMPLE / SAVED RESEARCH
        </Eyebrow>
        <p style={{ fontSize: 20, lineHeight: 1.5, marginBottom: 0 }}>
          Open the sources.
          <br />
          Judge the approach yourself.
        </p>
      </div>
    </Shell>
  );
}

function Proof({
  frame,
  ...assets
}: Pick<TrailerProps, "assets" | "allowMissingAssets"> & { frame: number }) {
  const change = reveal(frame, 155, 40);
  return (
    <Shell chapter="04 / Inspect the evidence" number="05" frame={frame}>
      <div style={{ position: "absolute", left: 88, top: 166 }}>
        <Eyebrow>FROM A VIDEO TO A CREATIVE CHOICE</Eyebrow>
        <Words
          text="A hook you can trace."
          frame={frame}
          delay={4}
          size={81}
          style={{ marginTop: 28 }}
        />
      </div>
      <div style={{ opacity: 1 - change }}>
        <SourceFrame
          index={0}
          frame={frame}
          delay={20}
          left={128}
          top={350}
          width={240}
          height={410}
          rotate={-4}
          {...assets}
        />
        <SourceFrame
          index={3}
          frame={frame}
          delay={34}
          left={436}
          top={350}
          width={240}
          height={410}
          rotate={3}
          {...assets}
        />
        <Connector frame={frame} delay={60} d="M730 573H840V462H942" />
        <div
          style={{
            position: "absolute",
            left: 975,
            top: 402,
            width: 710,
            opacity: reveal(frame, 65),
          }}
        >
          <Eyebrow>OBSERVED IN THE REFERENCE</Eyebrow>
          <Words text="Start with a" frame={frame} delay={70} size={65} style={{ marginTop: 25 }} />
          <Words text="specific frustration." frame={frame} delay={80} size={65} accent />
          <div style={{ height: 1, background: C.rule, marginTop: 32 }} />
          <p style={{ fontSize: 25, lineHeight: 1.5, maxWidth: 640 }}>
            Then show the payoff.
            <br />A map makes the value visible.
          </p>
          <div style={{ fontSize: 16, color: "#617164", marginTop: 20 }}>
            @inbetweenpics · source frames at 00:00 and 00:26.43
          </div>
        </div>
      </div>
      <div style={{ opacity: change }}>
        <Screen
          path="trailer/screen-proof.png"
          frame={frame}
          left={180}
          top={340}
          width={1560}
          height={535}
          scale={1.3}
          origin="55% 30%"
          drift={18}
          {...assets}
        />
      </div>
    </Shell>
  );
}

function Storyboard({
  frame,
  ...assets
}: Pick<TrailerProps, "assets" | "allowMissingAssets"> & { frame: number }) {
  const labels = ["The saved-place problem", "The sharing gesture", "The map payoff"];
  return (
    <Shell dark chapter="05 / Adapt the idea" number="06" frame={frame}>
      <div style={{ position: "absolute", left: 88, top: 171 }}>
        <Eyebrow light>YOUR PRODUCT. YOUR STORY.</Eyebrow>
        <Words text="Make it" frame={frame} delay={4} size={93} style={{ marginTop: 30 }} />
        <Words text="yours." frame={frame} delay={15} size={124} accent style={{ color: C.lime }} />
        <div
          style={{
            fontSize: 25,
            lineHeight: 1.5,
            width: 420,
            marginTop: 37,
            opacity: reveal(frame, 45),
          }}
        >
          A concrete storyboard.
          <br />A hook. Shots. A visible payoff.
        </div>
      </div>
      <Screen
        path="trailer/screen-storyboard.png"
        frame={frame}
        left={680}
        top={178}
        width={1155}
        height={603}
        scale={1.15}
        origin="58% 25%"
        drift={18}
        {...assets}
      />
      <div style={{ position: "absolute", left: 715, top: 819, display: "flex", gap: 30 }}>
        {labels.map((label, index) => (
          <div
            key={label}
            style={{
              opacity: reveal(frame, 50 + index * 19),
              transform: `translateY(${(1 - reveal(frame, 50 + index * 19)) * 20}px)`,
              width: 326,
              paddingTop: 18,
              borderTop: "1px solid #8a9c7455",
              display: "flex",
              gap: 13,
              alignItems: "center",
            }}
          >
            <span style={{ fontFamily: serif, fontStyle: "italic", color: C.lime, fontSize: 30 }}>
              0{index + 1}
            </span>
            <span style={{ fontSize: 17, color: C.paper }}>{label}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Identify({
  frame,
  ...assets
}: Pick<TrailerProps, "assets" | "allowMissingAssets"> & { frame: number }) {
  return (
    <Shell chapter="06 / Follow a different promise" number="07" frame={frame}>
      <div style={{ position: "absolute", left: 88, top: 179, width: 535 }}>
        <Eyebrow>SAME APP. A DIFFERENT QUESTION.</Eyebrow>
        <Words text="Change" frame={frame} delay={5} size={87} style={{ marginTop: 29 }} />
        <Words text="the promise." frame={frame} delay={15} size={87} accent />
        <div
          style={{
            fontSize: 26,
            lineHeight: 1.5,
            width: 450,
            marginTop: 35,
            opacity: reveal(frame, 40),
          }}
        >
          What if the address
          <br />
          is missing?
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 21,
            lineHeight: 1.6,
            width: 440,
            opacity: reveal(frame, 65),
          }}
        >
          Explore clue-led reveals and
          <br />
          visual search as creative inspiration.
        </div>
        <div
          style={{
            marginTop: 36,
            borderLeft: `3px solid ${C.ink}`,
            paddingLeft: 20,
            width: 385,
            fontSize: 17,
            lineHeight: 1.5,
            color: "#617164",
            opacity: reveal(frame, 100),
          }}
        >
          Mechanism-inspired direction.
          <br />A creative hypothesis to test.
        </div>
      </div>
      <Screen
        path="trailer/screen-identify.png"
        frame={frame}
        left={650}
        top={198}
        width={1220}
        height={680}
        scale={1.14}
        origin="52% 30%"
        drift={24}
        {...assets}
      />
    </Shell>
  );
}

function End({ frame }: { frame: number }) {
  const p = reveal(frame, 12, 48);
  return (
    <Shell dark chapter="A clearer way to begin" number="08" frame={frame}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 210,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 25,
            opacity: p,
            transform: `translateY(${(1 - p) * 32}px)`,
          }}
        >
          <Mark size={110} color={C.lime} />
          <span style={{ fontSize: 194, letterSpacing: -14 }}>angle</span>
          <span style={{ color: C.lime, fontFamily: serif, fontSize: 120, marginTop: -70 }}>.</span>
        </div>
        <Words
          text="Your next video"
          frame={frame}
          delay={39}
          size={65}
          style={{ marginTop: 40 }}
        />
        <Words
          text="starts with a better angle."
          frame={frame}
          delay={52}
          size={73}
          accent
          style={{ color: C.lime }}
        />
        <div
          style={{
            marginTop: 55,
            display: "flex",
            alignItems: "center",
            gap: 18,
            opacity: reveal(frame, 95),
          }}
        >
          <span style={{ width: 36, height: 1, background: C.lime }} />
          <Eyebrow light style={{ fontSize: 15 }}>
            VIDEO RESEARCH BY ORIANE
          </Eyebrow>
          <span style={{ width: 36, height: 1, background: C.lime }} />
        </div>
      </div>
    </Shell>
  );
}

function Subtitles({ captions }: { captions: Caption[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const caption = captions.find((item) => time >= item.start && time < item.end);
  if (!caption) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 195,
        right: 195,
        bottom: 20,
        display: "flex",
        justifyContent: "center",
        zIndex: 20,
      }}
    >
      <div
        style={{
          background: "#06130ef0",
          color: "#fffef4",
          padding: "12px 25px 14px",
          borderRadius: 8,
          fontFamily: sans,
          fontSize: 30,
          lineHeight: 1.28,
          textAlign: "center",
          maxWidth: 1470,
          textWrap: "balance",
          boxShadow: "0 4px 20px #0002",
        }}
      >
        {caption.text}
      </div>
    </div>
  );
}

const SCENES = [Opening, Brief, Search, Study, Proof, Storyboard, Identify, End];

function Scene({
  index,
  ...assets
}: Pick<TrailerProps, "assets" | "allowMissingAssets"> & { index: number }) {
  const frame = useCurrentFrame();
  const Component = SCENES[index];
  if (!Component) throw new Error(`Unknown trailer scene ${index}`);
  return <Component frame={frame} {...assets} />;
}

export function AngleTrailer({ assets, captions, scenes, allowMissingAssets }: TrailerProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      {scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          name={scene.title || scene.id}
          from={Math.round(scene.start * fps)}
          durationInFrames={
            Math.round((scene.start + scene.duration) * fps) - Math.round(scene.start * fps)
          }
        >
          <Scene index={index} assets={assets} allowMissingAssets={allowMissingAssets} />
        </Sequence>
      ))}
      {assets.includes("trailer/narration.mp3") && (
        <Audio src={staticFile("trailer/narration.mp3")} />
      )}
      <Subtitles captions={captions} />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 3,
          width: `${Math.min(100, (frame / (DURATION * fps - 1)) * 100)}%`,
          background: C.lime,
        }}
      />
    </AbsoluteFill>
  );
}
