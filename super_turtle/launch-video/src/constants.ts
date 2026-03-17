export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const PHONE_WIDTH = 1080;
export const PHONE_HEIGHT = 1920;
export const TRANSITION_DURATION = 12;

export const SCENE_DURATIONS = {
  intro: 80,
  teleport: 98,
  cutover: 92,
  remote: 94,
  home: 84,
} as const;

export const TOTAL_DURATION =
  Object.values(SCENE_DURATIONS).reduce((sum, duration) => sum + duration, 0) -
  TRANSITION_DURATION * (Object.keys(SCENE_DURATIONS).length - 1);

export const PHONE_ONBOARDING_SCENE_DURATIONS = {
  hero: 75,
  chat: 120,
  architecture: 96,
  teleport: 102,
  close: 66,
} as const;

export const PHONE_ONBOARDING_TOTAL_DURATION =
  Object.values(PHONE_ONBOARDING_SCENE_DURATIONS).reduce((sum, duration) => sum + duration, 0) -
  TRANSITION_DURATION * (Object.keys(PHONE_ONBOARDING_SCENE_DURATIONS).length - 1);
