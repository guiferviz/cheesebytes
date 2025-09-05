export default function rehypeExternalLinks() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (
        node.tagName === 'a' &&
        node.properties?.href &&
        isExternal(node.properties.href) &&
        !node.properties.className?.includes('internal')
      ) {
        node.properties.target = '_blank'
        node.properties.rel = 'noopener noreferrer'

        // Add class="external"
        node.properties.className = [
          ...(node.properties.className || []),
          'external',
        ]
      }
    });
  };
}

function isExternal(href) {
  return href.startsWith('http://') || href.startsWith('https://');
}

import { visit } from 'unist-util-visit';
