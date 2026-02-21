import { visit } from 'unist-util-visit';

/**
 * Replace unresolved wikiLink nodes with plain text at remark stage.
 * This prevents generating <a href="..."> links to non-existing pages.
 */
export default function remarkStripDeadWikilinks() {
  return (tree) => {
    visit(tree, 'wikiLink', (node, index, parent) => {
      if (!parent || index == null) return;

      // remark-wiki-link sets `data.exists` = false for missing targets.
      if (node?.data?.exists !== false) return;

      const text =
        node?.data?.alias ||
        node?.value ||
        '';

      parent.children[index] = {
        type: 'text',
        value: text,
      };
    });
  };
}
