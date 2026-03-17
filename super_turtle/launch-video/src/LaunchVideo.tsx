import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { HomeScene, IntroScene, RemoteScene, TeleportScene, CutoverScene } from "./scenes";
import { SCENE_DURATIONS, TRANSITION_DURATION } from "./constants";
import { headlineFont } from "./fonts";
import type { LaunchVideoProps } from "./types";

export const LaunchVideo: React.FC<LaunchVideoProps> = (props) => {
  return (
    <AbsoluteFill
      style={{
        fontFamily: headlineFont,
      }}
    >
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.intro}>
          <IntroScene {...props} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          presentation={fade()}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.teleport}>
          <TeleportScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          presentation={fade()}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.cutover}>
          <CutoverScene remoteLabel={props.remoteLabel} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          presentation={fade()}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.remote}>
          <RemoteScene remoteLabel={props.remoteLabel} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          presentation={fade()}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.home}>
          <HomeScene cta={props.cta} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export const LaunchThumbnail: React.FC<Pick<LaunchVideoProps, "title" | "subtitle">> = ({
  title,
  subtitle,
}) => {
  return (
    <AbsoluteFill
      style={{
        fontFamily: headlineFont,
        background:
          "radial-gradient(circle at top left, rgba(118,247,191,0.18), transparent 28%), radial-gradient(circle at 80% 20%, rgba(59,184,255,0.28), transparent 24%), linear-gradient(145deg, #08111a 0%, #0d1b26 46%, #050b12 100%)",
        color: "#e8f4ff",
        padding: 110,
        justifyContent: "space-between",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 28,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            opacity: 0.72,
            marginBottom: 24,
          }}
        >
          SuperTurtle launch video
        </div>
        <div style={{ fontSize: 122, lineHeight: 0.94, fontWeight: 700, maxWidth: 1200 }}>
          {title}
        </div>
        <div style={{ marginTop: 30, fontSize: 38, maxWidth: 980, lineHeight: 1.35, opacity: 0.78 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ fontSize: 34, opacity: 0.7 }}>
        {"local -> teleport -> webhook cutover -> remote -> home"}
      </div>
    </AbsoluteFill>
  );
};
