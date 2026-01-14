// Barrel export para componentes de Nombres Elementales
// Esto permite importar todos los componentes desde una sola ubicación:
// import { ElementalNamesTree, PeriodicTable } from '@/components/cave/nombres-elementales';

export { default as ElementalNamesTree } from './ElementalNamesTree';
export { default as PeriodicTable, elementsData, categoryColors, ElementTileSVG } from './PeriodicTable';
export type { ElementData, Category } from './PeriodicTable';
export { default as ElementalNamesSingleChar } from './ElementalNamesSingleChar';
export { default as ElementalNamesDPArray } from './ElementalNamesDPArray';
export { default as ElementalNamesAllPossibilities } from './ElementalNamesAllPossibilities';
