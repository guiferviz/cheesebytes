# Resumen: Framework de Visualización Algorítmica

Este documento resume la idea y arquitectura de un framework React para crear visualizaciones didácticas de algoritmos, basado en conversaciones y reflexiones sobre la experiencia de usuario y la modularidad del código.

## Objetivo
Permitir graficar y reproducir visualmente algoritmos de forma flexible y reutilizable, separando claramente la entrada de datos, la ejecución del algoritmo, el registro de pasos y la visualización.

## Componentes principales

### 1. InputManager
- UI para entrada o generación de datos.
- Ejemplo: input para nombre, botón para generar lista aleatoria.

### 2. AlgorithmRunner
- Ejecuta el algoritmo con los datos actuales.
- Llama al algoritmo (por ejemplo, bubbleSort(lista, logger)).
- Utiliza StepLogger para registrar los pasos.

### 3. StepLogger
- Guarda los pasos del algoritmo.
- Métodos: `step(...)`, `group(...)`, `mark(...)`.
- Permite registrar pasos simples y jerárquicos (útil para bucles, recursión, backtracking).
- Solo es usado internamente, no expuesto al usuario final.

### 4. StepPlayer
- Reproduce los pasos registrados.
- Permite navegación (play, pausa, avanzar, retroceder, reset).
- Muestra tabla o timeline de pasos.
- Puede expandir/colapsar grupos de pasos.
- Notifica al Visualizer el paso activo.

### 5. Visualizer
- Visualización específica para cada problema.
- Recibe el estado del paso actual y lo representa (arrays, árboles, etc).
- Declarativo: recibe estado → pinta.

## Flujo de trabajo
1. El usuario introduce o genera datos con InputManager.
2. AlgorithmRunner ejecuta el algoritmo, registrando pasos en StepLogger.
3. StepPlayer permite reproducir y navegar los pasos.
4. Visualizer muestra el estado correspondiente a cada paso.

## Consideraciones
- Los pasos se guardan como array JSON para fácil depuración.
- Se pueden resaltar elementos (highlight) o agrupar pasos (group).
- El usuario final no interactúa con StepLogger ni define pasos manualmente.
- La arquitectura permite experiencias didácticas pulidas y controladas.

## Ejemplo de uso (suma de números)
```js
stepLogger.step({ id: 0, action: "Inicializa suma = 0", state: { suma: 0 } });
for (let i = 0; i < nums.length; i++) {
  suma += nums[i];
  stepLogger.step({ id: i + 1, action: `Suma ${nums[i]}`, state: { suma, index: i } });
}
```

## Ventajas
- Modularidad y reutilización.
- Control total sobre la narrativa y visualización.
- Experiencia de usuario sencilla y guiada.
- Preparado para algoritmos complejos (recursión, DP, backtracking).

---
Este framework está pensado como infraestructura interna para CheeseBites, no como API pública para usuarios finales.
