import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import { visit } from 'unist-util-visit';

const base = '/warden';

/** Rehype plugin to prefix internal links with base path */
function rehypeBaseLinks() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'a' && node.properties?.href?.startsWith('/')) {
        node.properties.href = base + node.properties.href;
      }
    });
  };
}

export default defineConfig({
  site: 'https://getsentry.github.io',
  base,
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
      rehypeBaseLinks,
    ],
  },
});
