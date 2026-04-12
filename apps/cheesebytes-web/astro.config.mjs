// @ts-check
import { defineConfig } from 'astro/config';
import extractLinksTags from './src/plugins/remark-links-tags.js';
import rehypeExternalLinks from './src/plugins/rehype-external-links.js';
import remarkStripDeadWikilinks from './src/plugins/remark-strip-dead-wikilinks.js';
import remarkMarimoIsland from './src/plugins/remark-marimo-island.js';
import remarkPyodideWorkerNode from './src/plugins/remark-pyodide-worker-node.js';
import remarkObsidianCallout from 'remark-obsidian-callout';
import { wikiLinkPlugin } from 'remark-wiki-link';
import rehypeMermaid from 'rehype-mermaid';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectConfigUrl = pathToFileURL(path.join(__dirname, 'astro.config.mjs')).href;

const resolveExternalDependencies = {
  name: 'resolve-external-dependencies',
  async resolveId(source, importer, options) {
    // Si el import es una dependencia (no relativa/absoluta) y viene de fuera del proyecto (ej: notes)
    if (importer && !source.startsWith('.') && !source.startsWith('/') && !source.startsWith('\0')) {
      // Si el archivo que importa NO está dentro de la carpeta del proyecto
      if (!importer.startsWith(__dirname)) {
        try {
          return fileURLToPath(await import.meta.resolve(source, projectConfigUrl));
        } catch {
          const resolution = await this.resolve(source, path.join(__dirname, 'astro.config.mjs'), {
            skipSelf: true,
            ...options,
          });

          if (resolution) return resolution;
        }
      }
    }
  }
};

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

// Extract frontmatter slug from a file (if present)
function extractFrontmatterSlug(filePath) {
  try {
    const abs = path.resolve(__dirname, filePath);
    const content = fs.readFileSync(abs, 'utf8');
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (fmMatch) {
      const slugMatch = fmMatch[1].match(/^slug:\s*(.+)$/m);
      if (slugMatch) return slugMatch[1].trim();
    }
  } catch { /* ignore */ }
  return null;
}

// Build permalinks + a map from normalized title → permalink
// so wiki-links resolve correctly even when a file overrides its slug
const titleToPermalink = new Map();
const permalinks = Object.keys(files).map(filePath => {
  const frontmatterSlug = extractFrontmatterSlug(filePath);
  const permalink = frontmatterSlug
    ? `/${frontmatterSlug.replace(/^\/+/, '')}`
    : `/${slugify(filePath).replace(/^\/+/, '')}`;

  // Map the normalized file name to the permalink
  const fileName = path.parse(filePath).name.replace(/\.(md|mdx)$/i, '');
  titleToPermalink.set(normalizeUrl(fileName), permalink);

  return permalink;
});

const folderPrefixes = new Set();
permalinks.forEach(perm => {
  const segments = perm.split('/');
  for (let i = 2; i < segments.length; i++) {
    folderPrefixes.add(segments.slice(1, i).join('/'));
  }
});

function pageResolver(name) {
  // Check if the title maps directly to a permalink (handles slug overrides)
  const normalizedName = normalizeUrl(name);
  if (titleToPermalink.has(normalizedName)) {
    return [titleToPermalink.get(normalizedName)];
  }

  // Fall back to slug-based candidate generation
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
      remarkMath,
      [wikiLinkPlugin, {
        permalinks,
        pageResolver,
        hrefTemplate: permalink => permalink,
        aliasDivider: '|',
      }],
      remarkStripDeadWikilinks,
      extractLinksTags,
      remarkObsidianCallout,
      remarkMarimoIsland,
      remarkPyodideWorkerNode,
    ],
    rehypePlugins: [rehypeExternalLinks, rehypeKatex, [rehypeMermaid, {strategy: 'img-svg'}]],
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid', 'math'],
    },
    shikiConfig: {
      wrap: true,
      themes: {
        light: 'solarized-light',
        dark: 'everforest-dark',
      },
    },
  },
  vite: {
    plugins: [tailwindcss(), resolveExternalDependencies],
  },
  integrations: [mdx(), react()],
});
