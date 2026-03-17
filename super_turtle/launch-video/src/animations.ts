import { Easing, interpolate, spring } from "remotion";

export const smoothStep = (frame: number, input: [number, number], output: [number, number]) =>
  interpolate(frame, input, output, {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const reveal = (frame: number, fps: number, delayFrames = 0, durationInFrames = 20) =>
  spring({
    frame: frame - delayFrames,
    fps,
    durationInFrames,
    config: { damping: 200 },
  });
