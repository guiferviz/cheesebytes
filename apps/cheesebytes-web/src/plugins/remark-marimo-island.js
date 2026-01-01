import { visit } from 'unist-util-visit';

let islandCounter = 0;

export default function remarkMarimoIsland(options = {}) {
  const { appId = 'main', reactive = true } = options;
  
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang === 'python' && node.meta && node.meta.includes('marimo')) {
        const cellId = `marimo-cell-${islandCounter++}`;
        const code = node.value.trim();
        const encoded = encodeURIComponent(code);
        const isReactive = reactive ? 'true' : 'false';

        const html = `
<marimo-island
  data-app-id="${appId}"
  data-cell-id="${cellId}"
  data-reactive="${isReactive}"
>
  <marimo-cell-output> <div class="marimo">
          <div class="flex flex-col flex-1 items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-20 animate-spin text-primary"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            <div>Initializing...</div>
          </div>
        </div></marimo-cell-output>
  <marimo-cell-code hidden>${encoded}</marimo-cell-code>
</marimo-island>`.trim();

        parent.children.splice(index, 1, {
          type: 'html',
          value: html
        });
      }
    });
  };
}
