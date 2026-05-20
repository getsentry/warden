import mdx from "@astrojs/mdx";
import starlight from "@astrojs/starlight";
import sentryStarlightTheme, {
  monochromeCodeTheme,
} from "@sentry/starlight-theme";
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://warden.sentry.dev',
  redirects: {
    "/skill": "/agent-skill",
    "/github-org-setup": "/github/org",
    "/installation": "/quickstart",
    "/config/workflow": "/github/workflow",
    "/cli/options": "/cli",
  },
  vite: {
    resolve: {
      alias: {
        "nanoid/non-secure": new URL(
          "./src/shims/nanoid-non-secure.ts",
          import.meta.url,
        ).pathname,
      },
    },
  },
  integrations: [
    starlight({
      title: "Warden",
      description: "Define skills in Markdown. Compose them into agents that review every change.",
      customCss: ["./src/styles/docs.css"],
      pagination: false,
      sidebar: [
        {
          label: "Documentation",
          items: [
            { label: "Overview", link: "/guide" },
            { label: "Quickstart", link: "/quickstart" },
            { label: "Architecture", link: "/architecture" },
            {
              label: "Workflows",
              items: [
                { label: "Local Review", link: "/local-review" },
                { label: "Pull Request Reviews", link: "/github" },
                { label: "Agent Skill", link: "/agent-skill" },
              ],
            },
            {
              label: "Skills",
              items: [
                { label: "Overview", link: "/skills" },
                { label: "Built-in Skills", link: "/skills/built-in" },
                { label: "Adding Skills", link: "/skills/adding" },
                { label: "Writing Skills", link: "/skills/writing" },
                { label: "Discovery", link: "/skills/discovery" },
              ],
            },
            {
              label: "GitHub Setup",
              items: [
                { label: "Repository Setup", link: "/github/repository" },
                { label: "Workflow", link: "/github/workflow" },
                { label: "Organization Rollout", link: "/github/org" },
              ],
            },
          ],
        },
        {
          label: "Reference",
          items: [
            {
              label: "warden.toml",
              items: [
                { label: "Overview", link: "/config" },
                { label: "Models and Runtimes", link: "/config/models" },
                { label: "Skill Entries", link: "/config/skills" },
                { label: "Triggers", link: "/config/triggers" },
                { label: "Output and Defaults", link: "/config/output" },
                { label: "Runner", link: "/config/runner" },
                { label: "Chunking", link: "/config/chunking" },
              ],
            },
            {
              label: "CLI",
              items: [
                { label: "Overview", link: "/cli" },
                { label: "run", link: "/cli/run" },
                { label: "init", link: "/cli/init" },
                { label: "add", link: "/cli/add" },
                { label: "sync", link: "/cli/sync" },
                { label: "build", link: "/cli/build" },
                { label: "improve", link: "/cli/improve" },
                { label: "runs", link: "/cli/runs" },
                { label: "setup-app", link: "/cli/setup-app" },
              ],
            },
          ],
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/getsentry/warden",
        },
      ],
      plugins: [sentryStarlightTheme()],
    }),
    mdx(),
  ],
  markdown: {
    shikiConfig: {
      theme: monochromeCodeTheme,
    },
  }
});
