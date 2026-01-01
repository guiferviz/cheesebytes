// src/components/PyodideCodeRunner.jsx
import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useMemo
} from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import pyodideContext from '../utils/pyodideContext'

const PyodideCodeRunner = forwardRef(
  (
    {
      initialCode = '',
      autoRun = false,          // ⬅️ nuevo prop para auto-ejecución
      runDelay = 300           // ⬅️ opcional: debounce en ms
    },
    ref
  ) => {
    const [code, setCode] = useState(initialCode)
    const [output, setOutput] = useState('')

    // ---- Theme dark/light ----
    const [isDark, setIsDark] = useState(
      () => document.documentElement.classList.contains('dark')
    )
    useEffect(() => {
      const obs = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains('dark'))
      })
      obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })
      return () => obs.disconnect()
    }, [])
    const theme = isDark ? oneDark : undefined
    const extensions = useMemo(() => [python()], [])

    // ---- Ejecuta código en Pyodide ----
    const runCode = async (customCode) => {
      const src = customCode !== undefined ? customCode : code
      try {
        const result = await pyodideContext.run(src)
        setOutput(result == null ? '' : String(result))
        return result
      } catch (err) {
        setOutput(err.toString())
        throw err
      }
    }

    // ⬅️ Exponer API al padre
    useImperativeHandle(
      ref,
      () => ({
        run: runCode,
        getGlobal: (name) => pyodideContext.get(name),
        runPython: (expr) => pyodideContext.runSync(expr)
      }),
      [runCode]
    )

    // ---- Auto-ejecutar cuando cambia `code` si `autoRun` es true ----
    useEffect(() => {
      if (!autoRun) return
      const handle = setTimeout(() => {
        runCode().catch(() => {})
      }, runDelay)
      return () => clearTimeout(handle)
    }, [code, autoRun, runDelay])

    return (
      <div>
        <CodeMirror
          value={code}
          extensions={extensions}
          theme={theme}
          onChange={setCode}
        />
        {!autoRun && (
          <button onClick={() => runCode().catch(() => {})}>
            ▶️ Run
          </button>
        )}
        <pre>{output}</pre>
      </div>
    )
  }
)

export default PyodideCodeRunner
