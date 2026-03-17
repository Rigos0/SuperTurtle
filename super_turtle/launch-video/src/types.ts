import { z } from "zod";

export const LaunchVideoSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  remoteLabel: z.string(),
  cta: z.string(),
});

export type LaunchVideoProps = z.infer<typeof LaunchVideoSchema>;
