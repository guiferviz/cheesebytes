import { visit } from 'unist-util-visit';

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function normalizeOptionKey(rawKey) {
  const key = toCamelCase(rawKey.trim());
  if (key === 'height') return 'initialEditorHeight';
  if (key === 'autorun' || key === 'autoRun') return 'autoRun';
  return key;
}

function coerceValue(rawValue) {
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;
  if (/^-?\d+$/.test(rawValue)) return Number(rawValue);
  return rawValue;
}

function parseMeta(meta) {
  if (!meta) return {};
  const props = {};
  const tokenRegex = /([A-Za-z][\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;

  for (const match of meta.matchAll(tokenRegex)) {
    const rawKey = match[1];
    const rawValue = match[2] ?? match[3] ?? match[4];
    const key = normalizeOptionKey(rawKey);
    props[key] = rawValue === undefined ? true : coerceValue(rawValue);
  }

  return props;
}

export default function remarkPyodideWorkerNode() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (!parent || index == null || node.lang !== 'pyodide') return;

      const encodedCode = encodeURIComponent(node.value.replace(/\s+$/, ''));
      const props = {
        autoRun: 'once',
        fitToContent: true,
        ...parseMeta(node.meta),
      };
      const encodedProps = encodeURIComponent(JSON.stringify(props));
      const html = `<pyodide-worker-node data-code="${encodedCode}" data-props="${encodedProps}"></pyodide-worker-node>`;

      parent.children.splice(index, 1, {
        type: 'html',
        value: html,
      });
    });
  };
}