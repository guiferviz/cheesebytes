// src/utils/pyodideContext.js

const pyodideContext = (() => {
  let pyodide = null;
  let defaultNs = null;
  let loader = null;
  let state = 'uninitialized'; // 'uninitialized' | 'loading' | 'ready' | 'error'

  /**
   * Carga el script de Pyodide y crea el namespace por defecto.
   * Guarda el estado en `state` y memoiza la promesa en `loader`.
   */
  async function init() {
    if (loader) return loader;
    state = 'loading';
    loader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js';
      script.onload = async () => {
        try {
          pyodide = await window.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.21.3/full/'
          });
          defaultNs = pyodide.globals.get('dict')();
          state = 'ready';
          resolve(pyodide);
        } catch (err) {
          state = 'error';
          reject(err);
        }
      };
      script.onerror = (e) => {
        state = 'error';
        reject(new Error(`Failed to load pyodide.js: ${e.message}`));
      };
      document.head.appendChild(script);
    });
    return loader;
  }

  /**
   * Asegura que Pyodide esté listo antes de cualquier llamada.
   * Devuelve un objeto con `{ pyodide, ns }`.
   */
  async function ready() {
    await init();
    return { pyodide, ns: defaultNs };
  }

  /**
   * Ejecuta código Python de forma asíncrona en un namespace dado (o el por defecto).
   * @param {string} code — Código Python a ejecutar.
   * @param {PyProxy|null} ns — Namespace de Pyodide; si es null, usa el por defecto.
   * @returns {Promise<PyProxy>}
   */
  async function run(code, ns = null) {
    const { pyodide } = await ready();
    const globals = ns || defaultNs;
    return pyodide.runPythonAsync(code, { globals });
  }

  /**
   * Ejecuta una expresión Python de forma síncrona y devuelve el resultado.
   * @param {string} expr — Expresión Python para evaluar.
   * @param {PyProxy|null} ns — Namespace de Pyodide; si es null, usa el por defecto.
   * @returns {any}
   */
  async function runSync(expr, ns = null) {
    const { pyodide } = await ready();
    const globals = ns || defaultNs;
    return pyodide.runPython(expr, { globals });
  }

  /**
   * Crea un namespace nuevo (un dict de Pyodide), opcionalmente
   * pre-poblado con un objeto JS.
   * @param {Object} initial — Clave/valor JS a inyectar en el dict.
   * @returns {Promise<PyProxy>}
   */
  async function createNamespace(initial = {}) {
    const { pyodide } = await ready();
    const ns = pyodide.globals.get('dict')();
    for (const [key, val] of Object.entries(initial)) {
      ns.set(key, pyodide.toPy(val));
    }
    return ns;
  }

  /**
   * Ejecuta código Python asíncrono en un namespace concreto.
   * @param {string} code — Código Python a ejecutar.
   * @param {PyProxy} ns — Namespace de Pyodide.
   * @returns {Promise<PyProxy>}
   */
  async function runWithNs(code, ns) {
    const { pyodide } = await ready();
    return pyodide.runPythonAsync(code, { globals: ns });
  }

  /**
   * Extrae y convierte a JS una variable del namespace.
   * @param {string} name — Nombre de la variable en el namespace.
   * @param {PyProxy|null} ns — Namespace de Pyodide; si es null, usa el por defecto.
   * @returns {Promise<any>}
   */
  async function get(name, ns = null) {
    const { pyodide } = await ready();
    const globals = ns || defaultNs;
    const proxy = globals.get(name);
    const value = typeof proxy.toJs === 'function'
      ? proxy.toJs()
      : proxy;
    proxy.destroy && proxy.destroy();
    return value;
  }

  /**
   * Inyecta un valor JS en el namespace.
   * @param {string} name — Nombre de la variable a definir.
   * @param {any} value — Valor JS a convertir e inyectar.
   * @param {PyProxy|null} ns — Namespace de Pyodide; si es null, usa el por defecto.
   */
  async function set(name, value, ns = null) {
    const { pyodide } = await ready();
    const globals = ns || defaultNs;
    globals.set(name, pyodide.toPy(value));
  }

  /**
   * Conversión manual de JS ➔ PyProxy.
   * @param {any} value — Valor JS a convertir.
   * @returns {PyProxy}
   */
  function toPy(value) {
    if (!pyodide) {
      throw new Error('Pyodide no inicializado');
    }
    return pyodide.toPy(value);
  }

  /**
   * Indica si Pyodide ya se cargó y está listo para usar.
   * @returns {boolean}
   */
  function isReady() {
    return state === 'ready';
  }

  /**
   * Indica si Pyodide está en proceso de carga.
   * @returns {boolean}
   */
  function isLoading() {
    return state === 'loading';
  }

  return {
    init,
    ready,
    run,
    runSync,
    createNamespace,
    runWithNs,
    get,
    set,
    toPy,
    isReady,
    isLoading,
  };
})();

export default pyodideContext;
