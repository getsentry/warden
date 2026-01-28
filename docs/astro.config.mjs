import { defineConfig } from 'astro/config';
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
});
