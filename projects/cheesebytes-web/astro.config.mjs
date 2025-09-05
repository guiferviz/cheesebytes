// @ts-check
import { defineConfig } from 'astro/config';
import extractLinksTags from './src/plugins/remark-links-tags.js';
import rehypeExternalLinks from './src/plugins/rehype-external-links.js';
import remarkMarimoIsland from './src/plugins/remark-marimo-island.js';
import remarkObsidianCallout from 'remark-obsidian-callout';
import { wikiLinkPlugin } from 'remark-wiki-link';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

function normalizeUrl(path) {
  if (!path) return '';
  let normalized = path.toLowerCase();
  normalized = normalized.replace(/\s+/g, '-');
  normalized = normalized.replace(/[()[\]{}'",:;`.]/g, '');
  normalized = normalized.replace(/--+/g, '-');
  normalized = normalized.replace(/^-+|-+$/g, '');
  return normalized;
}

function slugify(name) {
  name = name.replace(/\.(md|mdx)$/i, '');

  // Elimina leading ./ o ../ (por si acaso siguen saliendo del glob)
  name = name.replace(/^(\.{1,2}\/)+/, '');

  const slug = name
    .split('/')
    .map(part => (part === '.' ? part : normalizeUrl(part)))
    .filter(Boolean)
    .join('/');

  // Quitar prefijo notes/cheese-bytes (con o sin slash inicial)
  return slug.replace(/^\/?notes\/cheese[- ]bytes\/?/i, '');
}

const files = import.meta.glob('../../notes/Cheese Bytes/**/*.{md,mdx}');
const permalinks = Object.keys(files).map(i => `/${slugify(i).replace(/^\/+/, '')}`);

const folderPrefixes = new Set();
permalinks.forEach(perm => {
  const segments = perm.split('/');
  for (let i = 2; i < segments.length; i++) {
    folderPrefixes.add(segments.slice(1, i).join('/'));
  }
});

function pageResolver(name) {
  const slug = slugify(name).replace(/^\/+/, '');
  const candidates = [`/${slug}`];
  folderPrefixes.forEach(prefix => {
    candidates.push(`/${prefix}/${slug}`);
  });
  return candidates;
}

export default defineConfig({
  site: 'https://cheesebytes.com/',
  markdown: {
    remarkPlugins: [
      [wikiLinkPlugin, {
        permalinks,
        pageResolver,
        hrefTemplate: permalink => permalink,
        aliasDivider: '|',
      }],
      extractLinksTags,
      remarkObsidianCallout,
      remarkMarimoIsland,
    ],
    rehypePlugins: [rehypeExternalLinks],
    shikiConfig: {
      wrap: true,
      themes: {
        light: 'solarized-light',
        dark: 'everforest-dark',
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [mdx(), react()],
});
