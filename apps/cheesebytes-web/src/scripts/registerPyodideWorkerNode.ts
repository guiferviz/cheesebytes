import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import PyodideWorkerRunner from "../components/PyodideWorkerRunner";

class PyodideWorkerNodeElement extends HTMLElement {
  private root: Root | null = null;
  private mountPoint: HTMLDivElement | null = null;

  connectedCallback() {
    if (this.root) return;

    const encodedCode = this.dataset.code ?? "";
    const initialCode = decodeURIComponent(encodedCode);
    const encodedProps = this.dataset.props ?? "";
    const props = encodedProps
      ? JSON.parse(decodeURIComponent(encodedProps))
      : {};

    // Defaults for pyodide-worker-node elements (matches remark plugin defaults)
    const defaults = { autoRun: true, fitToContent: true };

    this.style.display = "block";
    this.style.margin = "1.5rem 0";

    this.mountPoint = document.createElement("div");
    this.appendChild(this.mountPoint);

    this.root = createRoot(this.mountPoint);
    this.root.render(
      createElement(PyodideWorkerRunner, {
        initialCode,
        ...defaults,
        ...props,
      }),
    );
  }

  disconnectedCallback() {
    this.root?.unmount();
    this.root = null;
    this.mountPoint?.remove();
    this.mountPoint = null;
  }
}

if (!customElements.get("pyodide-worker-node")) {
  customElements.define("pyodide-worker-node", PyodideWorkerNodeElement);
}
