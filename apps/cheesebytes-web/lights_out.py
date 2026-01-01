# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "numpy",
# ]
# ///

import numpy as np


def build_augmented_matrix_custom(n_rows, n_cols, patron):
    """
    Crea la matriz aumentada [A^T | I] para Lights Out con patrón personalizable.
    patron: lista de offsets (dr, dc) relativos a la celda del interruptor.
    """
    N = n_rows * n_cols
    A = np.zeros((N, N), dtype=int)

    for row in range(n_rows):
        for col in range(n_cols):
            pos = row * n_cols + col
            for dr, dc in patron:
                rr, cc = row + dr, col + dc
                if 0 <= rr < n_rows and 0 <= cc < n_cols:
                    idx = rr * n_cols + cc
                    A[pos, idx] = 1

    # Matriz aumentada: [A^T | I]
    A_T = A.T
    augmented = np.concatenate([A_T, np.eye(N, dtype=int)], axis=1)
    return augmented


def gauss_jordan_mod2(aug):
    """
    Reduce la matriz aumentada con Gauss-Jordan en módulo 2.
    Trabaja en el sitio (modifica aug).
    """
    n_rows, n_cols = aug.shape
    n_vars = n_cols // 2  # número de luces/interruptores

    for col in range(n_vars):
        # Busca un pivote (1) en o debajo de la diagonal
        pivot_row = None
        for r in range(col, n_rows):
            if aug[r, col]:
                pivot_row = r
                break
        if pivot_row is None:
            continue  # columna dependiente, salta
        # Intercambia la fila actual con la fila del pivote si es necesario
        if pivot_row != col:
            aug[[col, pivot_row], :] = aug[[pivot_row, col], :]
        # Haz cero el resto de la columna
        for r in range(n_rows):
            if r != col and aug[r, col]:
                aug[r, :] ^= aug[col, :]
    return aug


# Ejemplo: cruz clásica (central y vecinos ortogonales)
PATRON = [
    (0, 0),  # Central
    (1, 0),  # Abajo
    (0, 1),  # Derecha
    (-1, 0),  # Arriba
    (0, -1),  # Izquierda
]
aug = build_augmented_matrix_custom(5, 5, PATRON)
print(aug.shape)  # (15, 30)

# Aplica el proceso
aug_reduced = gauss_jordan_mod2(aug.copy())

# Para visualizar (puedes quitar los prints si no quieres ver toda la matriz)
np.set_printoptions(linewidth=250, threshold=np.inf)
print(aug_reduced)
