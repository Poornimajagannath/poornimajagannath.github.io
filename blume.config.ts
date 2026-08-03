import { defineConfig } from "blume";

export default defineConfig({
  title: "Poornima Jagannath",
  description:
    "I care about developer experience, APIs, SDKs, AI, and small things I build.",

  content: {
    root: "content",
  },

  theme: {
    mode: "light",
    accent: { light: "#3f8fd9", dark: "#7eb6f0" },
    action: "#172033",
    background: { light: "#fffaf6", dark: "#0e141d" },
    radius: "lg",
    fonts: {
      display: "lora",
      body: "source-sans-3",
      mono: "ibm-plex-mono",
    },
  },

  navigation: {
    tabs: [
      { label: "Home", path: "/", href: "/" },
      { label: "Writing", path: "/writing" },
      { label: "Building", path: "/building" },
      { label: "Connect", path: "/connect" },
    ],
    repo: false,
  },

  ai: {
    llmsTxt: true,
    // WebMCP + discovery headers/manifests are on by default in 1.3
  },

  analytics: {
    posthog: {
      key: "phc_rGCfNXQhyzJ7PQC5xWppzpeezrgN69NaFT7RyN5CDNcT",
      host: "https://us.i.posthog.com",
    },
  },

  seo: {
    // Source Sans 3's unquoted family name breaks the OG renderer; pin Lora.
    og: {
      enabled: true,
      fonts: [
        { name: "Lora", weight: 500 },
        { name: "Lora", weight: 400 },
      ],
    },
    sitemap: true,
    robots: true,
    structuredData: true,
    agentReadability: true,
  },

  deployment: {
    output: "static",
    site: "https://poornimajagannath.github.io",
  },

  github: {
    owner: "Poornimajagannath",
    repo: "poornimajagannath.github.io",
  },
});
