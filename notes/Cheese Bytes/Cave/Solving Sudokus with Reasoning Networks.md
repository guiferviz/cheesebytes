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
