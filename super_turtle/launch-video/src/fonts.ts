import { loadFont as loadHeadline } from "@remotion/google-fonts/Geist";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";

export const headlineFont = loadHeadline("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
}).fontFamily;

export const monoFont = loadMono("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
}).fontFamily;
