import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';

export default defineConfig({
  site: 'https://warden.sentry.dev',
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      theme: 'vitesse-black',
    },
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, {
        behavior: 'prepend',
        properties: { className: ['heading-anchor'] },
        content: { type: 'text', value: '#' }
      }],
    ],
  },
  experimental: {
    fonts: [{
      name: "Geist Mono",
      provider: fontProviders.local(),
      cssVariable: "--font-geist-mono",
      options: {
          variants: [
              {
                  weight: 400,
                  style: "normal",
                  src: ["./node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.woff2"]
              },
              {
                  weight: 600,
                  style: "normal",
                  src: ["./node_modules/geist/dist/fonts/geist-mono/GeistMono-SemiBold.woff2"]
              }
          ]
      }
    }]
  }
});
