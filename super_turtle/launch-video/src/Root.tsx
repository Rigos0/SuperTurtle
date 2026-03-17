import React from "react";
import { Composition, Folder, Still } from "remotion";
import {
  HEIGHT,
  FPS,
  PHONE_HEIGHT,
  PHONE_ONBOARDING_TOTAL_DURATION,
  PHONE_WIDTH,
  TOTAL_DURATION,
  WIDTH,
} from "./constants";
import { LaunchThumbnail, LaunchVideo } from "./LaunchVideo";
import { PhoneLaunchVideo } from "./PhoneLaunchVideo";
import { LaunchVideoSchema } from "./types";

const defaultProps = {
  title: "Teleport your coding agent, not your whole machine.",
  subtitle:
    "SuperTurtle moves Telegram ownership from your PC to a healthy E2B runtime and brings it back with one command.",
  remoteLabel: "E2B webhook runtime",
  cta: "Control code from anywhere.",
} satisfies React.ComponentProps<typeof LaunchVideo>;

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Launch">
      <Composition
        id="TeleportLaunchVideo"
        component={LaunchVideo}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={defaultProps}
        schema={LaunchVideoSchema}
      />
      <Composition
        id="TeleportLaunchVideoPhone"
        component={PhoneLaunchVideo}
        durationInFrames={PHONE_ONBOARDING_TOTAL_DURATION}
        fps={FPS}
        width={PHONE_WIDTH}
        height={PHONE_HEIGHT}
        defaultProps={defaultProps}
        schema={LaunchVideoSchema}
      />
      <Still
        id="LaunchVideoThumbnail"
        component={LaunchThumbnail}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          title: defaultProps.title,
          subtitle: defaultProps.subtitle,
        }}
      />
    </Folder>
  );
};
