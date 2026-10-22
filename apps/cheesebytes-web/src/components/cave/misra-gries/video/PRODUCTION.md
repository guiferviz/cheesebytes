# Misra–Gries — revised production

The first delivered cut was rejected by the viewer: weak opening/ending, unclear explanation and insufficiently continuous animation. The records below do not substitute for that feedback.

## Current production

English narration, one canonical stream SCTCTDSCTSSSSSC, two-counter [5,8] and three-counter [6,7] bounds, exact 7 revealed only on a separately announced verification pass. Ten scenes, regenerated af_heart speech, measured phrase boundaries, approximate internal word timings, 1280×720 at 30 fps and a ten-second animated editing tail.

# Dos rondas adicionales de guion y visuales

## Guion, ronda 4
La versión anterior arranca con «Last time» y un contador 3 sin historia. Su pregunta llega a los once segundos. Se sustituye por una pregunta concreta al inicio: si borramos datos, ¿podemos aún asegurar que los cuadrados superan un tercio? Se recupera esa misma decisión al final. Se suprimen la escena contable 15=6+3×3, el desvío al círculo y las clases ausentes, y la definición separada de heavy hitters. La prueba principal pasa a ser visible: cinco supervivientes + como máximo tres perdidos.

## Guion, ronda 5
Se revisa como explicación independiente. La restricción de memoria nace del crecimiento de la tabla. Se distingue explícitamente el resumen de la frecuencia real. Se introduce la pregunta del umbral antes de usarlo. La repetición con tres contadores se anuncia como repetición de los mismos datos, y la segunda pasada se condiciona a poder volver a leerlos. La garantía general define N al pronunciarlo. El cierre vuelve a los datos borrados y al sí que ya podemos justificar.

## Diagnóstico visual de la versión publicada
El mosaico contiene grandes zonas vacías, tipografía excesivamente estrecha y muchas diapositivas con títulos. La cancelación ocupa sólo 1,15 s y luego desaparece todo durante una frase larga. El intervalo cambia instantáneamente de 5 a 8. El repaso con tres contadores salta de los elementos 5 a 6 y luego al 15: falta el proceso. Las entradas del recorrido no viajan a los contadores. Se necesita movimiento que enseñe la operación, no sólo fundidos de texto.

## Visuales, ronda 4 — nueva puesta en escena
Se renderizaron diez escenas con la nueva voz. Cambios: fuente sin condensar, pregunta concreta grande, tres participantes visibles que convergen, entradas que viajan hasta su contador y recuentos que cambian al llegar, huecos de memoria estables, quince pasos reales en ambos recorridos, cinco copias sólidas y tres posibles con contorno discontinuo, intervalo que se expande/contrae. Se añadieron cuatro segundos de observación en cada recorrido para que las quince operaciones no se atropellen.

La revisión del mosaico detectó tres fallos de esta ronda: el cuadrado inicial se solapaba con la pregunta, había un vacío entre la cancelación y el registro del grupo, y la respuesta verde se cruzaba con la fila de verificación durante un fundido. Se separa el icono inicial, se adelanta el registro al instante de la colisión y se hacen secuenciales los fundidos de respuesta y segunda pasada. El rótulo de los cinco supervivientes se centra sobre sus cinco objetos. Estas correcciones se comprueban en la ronda 5 con capturas de entrada, acción, resultado y transición.

## Visuales, ronda 5 — continuidad y lectura
Se revisaron los diez puntos medios y 23 estados focalizados, incluyendo cinco fases de la cancelación, el paso de cinco objetos reales a tres posibles, una cancelación de cuatro valores y la entrada/salida de la verificación. Se generaron cuatro clips de límites de escena a 30 fps. Se retiraron los números decorativos del inicio: no correspondían al stream visible. La segunda pasada se divide en marcas de frase medidas para que el siete exacto aparezca al terminar el recuento y permanezca durante la conclusión, en lugar de llegar en el último medio segundo. El cierre rotula el intervalo como resumen de una sola pasada, para distinguirlo del siete conocido tras verificar. En la generalización se desvanece el ejemplo de tres valores antes de aumentar m, para no mostrar m=3 junto a una cancelación de sólo tres.

Pruebas: garantía de cotas y conservación de masa en todos los streams cortos; permanencia de las identidades en sus huecos de memoria; convergencia y continuidad de trayectorias/opacidad; TypeScript del visual y sus dependencias. La voz se ha regenerado para el texto actual y se usan tiempos medidos por frase; no se presenta como alineación fonética. No ha sido posible una escucha perceptiva mediante las herramientas disponibles. Los clips y muestras temporales permiten inspeccionar las transiciones; las capturas aisladas no prueban suavidad.


## Previous cut: archived production record

# Misra–Gries production record

Source: `notes/Cheese Bytes/Cave/Majority Vote Algorithm.mdx`, its frequency-bound discussion and Misra–Gries reference. English narration continues the existing Majority Vote visual vocabulary.

## Script review 1 — focus and teaching

Rejected a survey of heavy-hitter algorithms. The one takeaway is that a residual count and a cancellation budget give a deterministic interval, and more counters can make that interval sufficient for a decision. Start with the disappearing stream, introduce two slots through arrivals, then motivate the three-way cancellation. Do not require prior knowledge of code.

## Script review 2 — mathematics and continuity

Use only SCTCTDSCTSSSSSC: 15 values, with exact frequencies S=7, C=4, T=3, D=1. Two counters leave S=5, C=1, with D=3 cancellations; three counters leave S=6, C=3, T=2, with D=1. Every deletion group has distinct values and contains at most one copy of any fixed value. Thus c_x <= f_x <= c_x + D, including c_x=0 for untracked values; N = sum(c_x) + (m+1)D. Values occurring strictly more than N/(m+1) must survive; survivors can be false positives. Error is additive, deterministic, and not a confidence percentage. Exact counts still require verification. The three-counter square interval [6,7] is entirely above the same threshold 5, so that particular threshold decision needs no second pass.

## Script review 3 — narration, reveal order and pacing

Keep formula labels until their spoken explanation. Distinguish the summary's residual 5 from the later exact 7. Replay explicitly when changing the number of slots; preserve the same 15 values and order. Show a cancellation group without a square so it is not depicted as privileged. Remove the initially proposed extra two-square tail: comparing two and three counters on the same data makes the memory/precision trade-off clearer. Put exact verification after the interval decision, then generalize. End on a useful bounded answer, with a ten-second editing tail, rather than a logo.

## Visual review record

Round 1: rendered eleven section midpoints. Removed duplicated arrival sprites over the counters; arrivals now move once and disappear into a counter. Kept the cancellation slots empty while the actual three actors converge. In the three-counter comparison, show the real prefix states after five and six arrivals before revealing the final summary, and animate the four distinct values removed together. Bound values were checked against the simulation tests.

Narration: Kokoro ONNX 0.6.1, model v1.0, af_heart. Each marked paragraph is synthesized separately and cached. Paragraph audio boundaries are measured; internal word timings are distributed by token length and are approximate, not a transcription. Action timing uses the measured paragraph durations. No claim of forced word alignment.


Round 2: inspected measured-voice section midpoints and five targeted frames. Kept candidate slots fixed when the square temporarily disappears in the three-counter prefix; circle and triangle must not jump left. Label both partial and complete replay states with the number of arrivals, so the two-counter final result is not confused with a partial three-counter state. Target frames confirm two-counter [5,8], three-counter [6,7], and the distinct exact verification result 7. Peak speech level is below clipping; a DC offset and conservative loudness were measured, so apply a high-pass filter and loudness normalization before final encoding. Audio listening could not be performed by the available audio-input tool; waveform/level and phrase-duration checks do not replace listening.


Round 3: encoded three 3-second H.264/AAC motion windows (three-way cancellation, four-way cancellation and verification) at 12 fps and reviewed their sampled poses plus six focused full-size PNGs. All reports have zero runtime/resource errors and stable inputs. Moved the four cancellation actors into the gap below the “3 counters” label so their paths cannot cross the heading. Exact 7 is revealed only during verification, after the [6,7] interval has already justified the >5 decision. Rendering chrome stays hidden. Final render uses 1280×720 at 24 fps with synthetic English narration and a ten-second tail.

Validation: 71 engine tests, new exhaustive short-stream bound/mass tests, engine TypeScript and targeted visual TypeScript passed. The upstream mobile smoke assertions passed at four viewports. The broader pre-existing agent smoke exposed HMR navigation/cancellation races after its deliberate broken-resource edits; those unrelated engine races were not changed by the mobile commit.


## Final encoded artifact

`Misra-Gries.mp4`: 211.923 seconds, H.264 1280×720 at 24 fps, AAC mono 24 kHz, 3,233,780 bytes. The agent rendered 5,087 frames in 464 seconds with zero errors and stable inputs, and FFmpeg decoded the entire MP4 without errors. The delivered mosaic samples the encoded MP4 rather than only the preview screenshots. Audio provenance is current and the normalized waveform is included in the handoff. The engine's generic estimated-timing warning says “Silent draft”, but the video has the provided synthesized narration; the warning is caused by approximate within-paragraph word timings, not by missing audio.
