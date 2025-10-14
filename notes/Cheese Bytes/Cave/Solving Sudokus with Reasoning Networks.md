Motivated by the paper
[[Less is More: Recursive Reasoning with Tiny Networks (Paper)]], I have decided
to explore the idea of using small neural networks to solve Sudoku puzzles.

My plan is to start understanding the paper, ponerme al día con terminología y
últimos avances en el mundo de las redes neuronales, y luego implementar una red
pequeña que pueda aprender a resolver Sudokus.

Todo empezó con el paper de [[Hierarchical Reasoning Models]] que fue todo un
revuelo. En este blog se analizó qué hacía que el modelo HRM (Hierarchical
Reasoning Model) funcionara tan bien en ARC-AGI con tan pocos parámetros:
[The Hidden Drivers of HRM's Performance on ARC-AGI](https://arcprize.org/blog/hrm-analysis).
Basándose en las conclusiones, los Tiny Recursive Models (TRM) son una versión
simplificada y más pequeña que generaliza mejor que HRM en tareas de
razonamiento. De hecho es tan simplificada que elimina la jerarquía y usa una
única red para todo.

Tras leer el paper me surge la pregunta: qué tan distinto es esto de una RNN de
toda la vida? No veo mucha diferencia, salvo que la RNN se aplica a secuencias y
aquí estamos aplicándola a la misma entrada + el hidden state. De hecho también
me recuerda un poco a los diffusion models, donde se aplica la misma red varias
veces a la misma entrada (con ruido añadido en cada paso).

# Día 1

Lectura del paper y carga del dataset.

Me descargo el código del paper de TRM y veo que no es posible ni siquiera
ejecutarlo en colab, las TPUs de 14GB de memoria se quedan cortas. Además, el
repo dice que el tiempo de entrenamiento es de unas 24 horas para el problema
del sudoku, así que no es viable para mí... Me decepciona porque asumí que al
tener solo 7M de parámetros sería posible entrenarlo en una GPU accesible por
mi. De todas formas sigo adelante con la idea de entrenar una red pequeña para
resolver sudokus. Si no es siguiendo el paper de TRM lo haré a mi manera.

Se utiliza el dataset de
[sapientinc/sudoku-extreme](https://huggingface.co/datasets/sapientinc/sudoku-extreme).
Creo un pytorch Dataset para cargar sudokus en forma de vector o de grid. El
dataset tiene 3M de training examples y unos 400k de tests examples. La idea
sería entrenar en solo 1k ejemplos, como en el paper.

# Day 2

Overfitting a small dataset of 1000 sudokus with a small feedforward NN. Zero
error in training set.

https://github.com/guiferviz/me/commit/816bb31b1543432062c3736b929fcc641dd5da80

# Day 3

Si uso redes más pequeñas que no llegan a memorizar los training examples, el
test accuracy se queda en un 16%. After un overfitting de libro, me llama la
atención que cuando hago overfitting el test accuracy sube a 25% aprox.

El día 3 lo dedico a entender cuál es el baseline que debemos batir. Se puede
considerar que un 25% ya es aprender algo?

Creo un random model que simplemente llena los espacios vacíos con números
aleatorios y evalúo su rendimiento en el conjunto de prueba. Respeta los números
dados, solo rellena aleatoriamente los vacíos. Eso da un accuracy teórico de
40%.

Aprovecho también para crear una visualización en la terminal del sudoku, con
colores que marcan los números correctos del intento de solución.

Podríamos incluso crear un random model que devuelva permutaciones. En lugar de
poder repetir 9 veces el mismo numero en una fila, columna o región, podríamos
asegurarnos de que cada número solo aparezca una vez por fila, columna y región.
Aunque no sé si eso mejoraría el baseline, creo que hasta lo empeoraría, porque
la probabilidad de tener el numero correcto ya no sería de 1/9...
