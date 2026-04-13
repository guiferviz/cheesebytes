import { visit } from 'unist-util-visit';

/**
 * Transform fenced `pyodide` code blocks into `<pyodide-worker-node>`.
 *
 * Usage:
 * ```md
 * ```pyodide auto-run=once height=220 show-run-button=false
 * print("hello")
 * ```
 * ```
 *
 * Meta parsing rules:
 * - `key` -> boolean `true`
 * - `key=value`, `key="value"`, `key='value'`
 * - kebab-case keys are converted to camelCase
 * - `height` is aliased to `initialEditorHeight`
 * - `autorun`, `auto-run`, and `autoRun` all map to `autoRun`
 * - `true`, `false`, and integer literals are coerced from strings
 *
 * Defaults when omitted:
 * - `autoRun: false`
 * - `fitToContent: true`
 *
 * Practical meta props for markdown fences:
 * - `auto-run=false|true|once`
 * - `fit-to-content=true|false`
 * - `height=240` or `initial-editor-height=240`
 * - `run-delay=800`
 * - `show-run-button=true|false`
 * - `show-worker-status=true|false`
 * - `show-memory=true|false`
 *
 * Note: the custom element forwards props directly to `PyodideWorkerRunner`,
 * but fenced-code meta is only suitable for scalar values. Structured props
 * such as `context` or `returnVars` are not practical to pass from markdown
 * with the current parser.
 *
 * Run button behavior:
 * - `showRunButton=true` always shows the Run button, even with `autoRun=true`.
 * - `showRunButton=false` always hides the Run button.
 * - When `showRunButton` is not set, the Run button is shown by default.
 * - omitting `autoRun` is equivalent to `autoRun=false`.
 */

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
        autoRun: false,
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