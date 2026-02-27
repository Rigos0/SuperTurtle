import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Super Turtle Docs",
  description: "Setup and run Super Turtle locally.",
  lang: "en-US",
  srcExclude: [
    "CODEX_QUOTA_INTEGRATION.md",
    "NEXT_PROJECT_INTAKE_TEMPLATE.md",
    "NEXT_PROJECT_KICKOFF_RUNBOOK.md",
    "PRD-onboarding.md",
    "UX-overhaul-proposal.md",
    "code-quality-audit.md",
    "long-run-state-tracking.md",
    "openclaw-gap-implementation-map.md",
    "openclaw-parity-improvements.md",
    "openclaw-reliability-comparison.md",
    "steipete-research.md",
    "reviews/**"
  ],
  themeConfig: {
    nav: [{ text: "Setup", link: "/#setup" }, { text: "Run", link: "/#run" }]
  }
});
