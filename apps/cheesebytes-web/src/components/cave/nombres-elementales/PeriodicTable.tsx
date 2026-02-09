import React, { useState, useMemo } from "react";

// Tipos para las categorías de los elementos, para asegurar consistencia.
type Category =
  | "no-metal-reactivo"
  | "gas-noble"
  | "alcalino"
  | "alcalinoterreo"
  | "metaloide"
  | "metal-post-transicion"
  | "metal-transicion"
  | "lantanido"
  | "actinido"
  | "desconocido";

// Interface para la estructura de cada elemento químico.
interface ElementData {
  number: number;
  symbol: string;
  name: string;
  nameEn: string;
  category: Category;
  xpos: number;
  ypos: number;
}

// Tipo para el filtro de resaltado.
type HighlightFilter = "one-letter" | "two-letters" | null;

// --- DATOS Y COLORES CON TIPADO ---

// Array de elementos con el tipo ElementData aplicado.
const elementsData: ElementData[] = [
  {
    number: 1,
    symbol: "H",
    name: "Hidrógeno",
    nameEn: "Hydrogen",
    category: "no-metal-reactivo",
    xpos: 1,
    ypos: 1,
  },
  {
    number: 2,
    symbol: "He",
    name: "Helio",
    nameEn: "Helium",
    category: "gas-noble",
    xpos: 18,
    ypos: 1,
  },
  {
    number: 3,
    symbol: "Li",
    name: "Litio",
    nameEn: "Lithium",
    category: "alcalino",
    xpos: 1,
    ypos: 2,
  },
  {
    number: 4,
    symbol: "Be",
    name: "Berilio",
    nameEn: "Beryllium",
    category: "alcalinoterreo",
    xpos: 2,
    ypos: 2,
  },
  {
    number: 5,
    symbol: "B",
    name: "Boro",
    nameEn: "Boron",
    category: "metaloide",
    xpos: 13,
    ypos: 2,
  },
  {
    number: 6,
    symbol: "C",
    name: "Carbono",
    nameEn: "Carbon",
    category: "no-metal-reactivo",
    xpos: 14,
    ypos: 2,
  },
  {
    number: 7,
    symbol: "N",
    name: "Nitrógeno",
    nameEn: "Nitrogen",
    category: "no-metal-reactivo",
    xpos: 15,
    ypos: 2,
  },
  {
    number: 8,
    symbol: "O",
    name: "Oxígeno",
    nameEn: "Oxygen",
    category: "no-metal-reactivo",
    xpos: 16,
    ypos: 2,
  },
  {
    number: 9,
    symbol: "F",
    name: "Flúor",
    nameEn: "Fluorine",
    category: "no-metal-reactivo",
    xpos: 17,
    ypos: 2,
  },
  {
    number: 10,
    symbol: "Ne",
    name: "Neón",
    nameEn: "Neon",
    category: "gas-noble",
    xpos: 18,
    ypos: 2,
  },
  {
    number: 11,
    symbol: "Na",
    name: "Sodio",
    nameEn: "Sodium",
    category: "alcalino",
    xpos: 1,
    ypos: 3,
  },
  {
    number: 12,
    symbol: "Mg",
    name: "Magnesio",
    nameEn: "Magnesium",
    category: "alcalinoterreo",
    xpos: 2,
    ypos: 3,
  },
  {
    number: 13,
    symbol: "Al",
    name: "Aluminio",
    nameEn: "Aluminium",
    category: "metal-post-transicion",
    xpos: 13,
    ypos: 3,
  },
  {
    number: 14,
    symbol: "Si",
    name: "Silicio",
    nameEn: "Silicon",
    category: "metaloide",
    xpos: 14,
    ypos: 3,
  },
  {
    number: 15,
    symbol: "P",
    name: "Fósforo",
    nameEn: "Phosphorus",
    category: "no-metal-reactivo",
    xpos: 15,
    ypos: 3,
  },
  {
    number: 16,
    symbol: "S",
    name: "Azufre",
    nameEn: "Sulfur",
    category: "no-metal-reactivo",
    xpos: 16,
    ypos: 3,
  },
  {
    number: 17,
    symbol: "Cl",
    name: "Cloro",
    nameEn: "Chlorine",
    category: "no-metal-reactivo",
    xpos: 17,
    ypos: 3,
  },
  {
    number: 18,
    symbol: "Ar",
    name: "Argón",
    nameEn: "Argon",
    category: "gas-noble",
    xpos: 18,
    ypos: 3,
  },
  {
    number: 19,
    symbol: "K",
    name: "Potasio",
    nameEn: "Potassium",
    category: "alcalino",
    xpos: 1,
    ypos: 4,
  },
  {
    number: 20,
    symbol: "Ca",
    name: "Calcio",
    nameEn: "Calcium",
    category: "alcalinoterreo",
    xpos: 2,
    ypos: 4,
  },
  {
    number: 21,
    symbol: "Sc",
    name: "Escandio",
    nameEn: "Scandium",
    category: "metal-transicion",
    xpos: 3,
    ypos: 4,
  },
  {
    number: 22,
    symbol: "Ti",
    name: "Titanio",
    nameEn: "Titanium",
    category: "metal-transicion",
    xpos: 4,
    ypos: 4,
  },
  {
    number: 23,
    symbol: "V",
    name: "Vanadio",
    nameEn: "Vanadium",
    category: "metal-transicion",
    xpos: 5,
    ypos: 4,
  },
  {
    number: 24,
    symbol: "Cr",
    name: "Cromo",
    nameEn: "Chromium",
    category: "metal-transicion",
    xpos: 6,
    ypos: 4,
  },
  {
    number: 25,
    symbol: "Mn",
    name: "Manganeso",
    nameEn: "Manganese",
    category: "metal-transicion",
    xpos: 7,
    ypos: 4,
  },
  {
    number: 26,
    symbol: "Fe",
    name: "Hierro",
    nameEn: "Iron",
    category: "metal-transicion",
    xpos: 8,
    ypos: 4,
  },
  {
    number: 27,
    symbol: "Co",
    name: "Cobalto",
    nameEn: "Cobalt",
    category: "metal-transicion",
    xpos: 9,
    ypos: 4,
  },
  {
    number: 28,
    symbol: "Ni",
    name: "Níquel",
    nameEn: "Nickel",
    category: "metal-transicion",
    xpos: 10,
    ypos: 4,
  },
  {
    number: 29,
    symbol: "Cu",
    name: "Cobre",
    nameEn: "Copper",
    category: "metal-transicion",
    xpos: 11,
    ypos: 4,
  },
  {
    number: 30,
    symbol: "Zn",
    name: "Zinc",
    nameEn: "Zinc",
    category: "metal-transicion",
    xpos: 12,
    ypos: 4,
  },
  {
    number: 31,
    symbol: "Ga",
    name: "Galio",
    nameEn: "Gallium",
    category: "metal-post-transicion",
    xpos: 13,
    ypos: 4,
  },
  {
    number: 32,
    symbol: "Ge",
    name: "Germanio",
    nameEn: "Germanium",
    category: "metaloide",
    xpos: 14,
    ypos: 4,
  },
  {
    number: 33,
    symbol: "As",
    name: "Arsénico",
    nameEn: "Arsenic",
    category: "metaloide",
    xpos: 15,
    ypos: 4,
  },
  {
    number: 34,
    symbol: "Se",
    name: "Selenio",
    nameEn: "Selenium",
    category: "no-metal-reactivo",
    xpos: 16,
    ypos: 4,
  },
  {
    number: 35,
    symbol: "Br",
    name: "Bromo",
    nameEn: "Bromine",
    category: "no-metal-reactivo",
    xpos: 17,
    ypos: 4,
  },
  {
    number: 36,
    symbol: "Kr",
    name: "Kriptón",
    nameEn: "Krypton",
    category: "gas-noble",
    xpos: 18,
    ypos: 4,
  },
  {
    number: 37,
    symbol: "Rb",
    name: "Rubidio",
    nameEn: "Rubidium",
    category: "alcalino",
    xpos: 1,
    ypos: 5,
  },
  {
    number: 38,
    symbol: "Sr",
    name: "Estroncio",
    nameEn: "Strontium",
    category: "alcalinoterreo",
    xpos: 2,
    ypos: 5,
  },
  {
    number: 39,
    symbol: "Y",
    name: "Itrio",
    nameEn: "Yttrium",
    category: "metal-transicion",
    xpos: 3,
    ypos: 5,
  },
  {
    number: 40,
    symbol: "Zr",
    name: "Zirconio",
    nameEn: "Zirconium",
    category: "metal-transicion",
    xpos: 4,
    ypos: 5,
  },
  {
    number: 41,
    symbol: "Nb",
    name: "Niobio",
    nameEn: "Niobium",
    category: "metal-transicion",
    xpos: 5,
    ypos: 5,
  },
  {
    number: 42,
    symbol: "Mo",
    name: "Molibdeno",
    nameEn: "Molybdenum",
    category: "metal-transicion",
    xpos: 6,
    ypos: 5,
  },
  {
    number: 43,
    symbol: "Tc",
    name: "Tecnecio",
    nameEn: "Technetium",
    category: "metal-transicion",
    xpos: 7,
    ypos: 5,
  },
  {
    number: 44,
    symbol: "Ru",
    name: "Rutenio",
    nameEn: "Ruthenium",
    category: "metal-transicion",
    xpos: 8,
    ypos: 5,
  },
  {
    number: 45,
    symbol: "Rh",
    name: "Rodio",
    nameEn: "Rhodium",
    category: "metal-transicion",
    xpos: 9,
    ypos: 5,
  },
  {
    number: 46,
    symbol: "Pd",
    name: "Paladio",
    nameEn: "Palladium",
    category: "metal-transicion",
    xpos: 10,
    ypos: 5,
  },
  {
    number: 47,
    symbol: "Ag",
    name: "Plata",
    nameEn: "Silver",
    category: "metal-transicion",
    xpos: 11,
    ypos: 5,
  },
  {
    number: 48,
    symbol: "Cd",
    name: "Cadmio",
    nameEn: "Cadmium",
    category: "metal-transicion",
    xpos: 12,
    ypos: 5,
  },
  {
    number: 49,
    symbol: "In",
    name: "Indio",
    nameEn: "Indium",
    category: "metal-post-transicion",
    xpos: 13,
    ypos: 5,
  },
  {
    number: 50,
    symbol: "Sn",
    name: "Estaño",
    nameEn: "Tin",
    category: "metal-post-transicion",
    xpos: 14,
    ypos: 5,
  },
  {
    number: 51,
    symbol: "Sb",
    name: "Antimonio",
    nameEn: "Antimony",
    category: "metaloide",
    xpos: 15,
    ypos: 5,
  },
  {
    number: 52,
    symbol: "Te",
    name: "Telurio",
    nameEn: "Tellurium",
    category: "metaloide",
    xpos: 16,
    ypos: 5,
  },
  {
    number: 53,
    symbol: "I",
    name: "Yodo",
    nameEn: "Iodine",
    category: "no-metal-reactivo",
    xpos: 17,
    ypos: 5,
  },
  {
    number: 54,
    symbol: "Xe",
    name: "Xenón",
    nameEn: "Xenon",
    category: "gas-noble",
    xpos: 18,
    ypos: 5,
  },
  {
    number: 55,
    symbol: "Cs",
    name: "Cesio",
    nameEn: "Cesium",
    category: "alcalino",
    xpos: 1,
    ypos: 6,
  },
  {
    number: 56,
    symbol: "Ba",
    name: "Bario",
    nameEn: "Barium",
    category: "alcalinoterreo",
    xpos: 2,
    ypos: 6,
  },
  {
    number: 57,
    symbol: "La",
    name: "Lantano",
    nameEn: "Lanthanum",
    category: "lantanido",
    xpos: 4,
    ypos: 8.5,
  },
  {
    number: 72,
    symbol: "Hf",
    name: "Hafnio",
    nameEn: "Hafnium",
    category: "metal-transicion",
    xpos: 4,
    ypos: 6,
  },
  {
    number: 73,
    symbol: "Ta",
    name: "Tantalio",
    nameEn: "Tantalum",
    category: "metal-transicion",
    xpos: 5,
    ypos: 6,
  },
  {
    number: 74,
    symbol: "W",
    name: "Wolframio",
    nameEn: "Tungsten",
    category: "metal-transicion",
    xpos: 6,
    ypos: 6,
  },
  {
    number: 75,
    symbol: "Re",
    name: "Renio",
    nameEn: "Rhenium",
    category: "metal-transicion",
    xpos: 7,
    ypos: 6,
  },
  {
    number: 76,
    symbol: "Os",
    name: "Osmio",
    nameEn: "Osmium",
    category: "metal-transicion",
    xpos: 8,
    ypos: 6,
  },
  {
    number: 77,
    symbol: "Ir",
    name: "Iridio",
    nameEn: "Iridium",
    category: "metal-transicion",
    xpos: 9,
    ypos: 6,
  },
  {
    number: 78,
    symbol: "Pt",
    name: "Platino",
    nameEn: "Platinum",
    category: "metal-transicion",
    xpos: 10,
    ypos: 6,
  },
  {
    number: 79,
    symbol: "Au",
    name: "Oro",
    nameEn: "Gold",
    category: "metal-transicion",
    xpos: 11,
    ypos: 6,
  },
  {
    number: 80,
    symbol: "Hg",
    name: "Mercurio",
    nameEn: "Mercury",
    category: "metal-transicion",
    xpos: 12,
    ypos: 6,
  },
  {
    number: 81,
    symbol: "Tl",
    name: "Talio",
    nameEn: "Thallium",
    category: "metal-post-transicion",
    xpos: 13,
    ypos: 6,
  },
  {
    number: 82,
    symbol: "Pb",
    name: "Plomo",
    nameEn: "Lead",
    category: "metal-post-transicion",
    xpos: 14,
    ypos: 6,
  },
  {
    number: 83,
    symbol: "Bi",
    name: "Bismuto",
    nameEn: "Bismuth",
    category: "metal-post-transicion",
    xpos: 15,
    ypos: 6,
  },
  {
    number: 84,
    symbol: "Po",
    name: "Polonio",
    nameEn: "Polonium",
    category: "metaloide",
    xpos: 16,
    ypos: 6,
  },
  {
    number: 85,
    symbol: "At",
    name: "Astato",
    nameEn: "Astatine",
    category: "metaloide",
    xpos: 17,
    ypos: 6,
  },
  {
    number: 86,
    symbol: "Rn",
    name: "Radón",
    nameEn: "Radon",
    category: "gas-noble",
    xpos: 18,
    ypos: 6,
  },
  {
    number: 87,
    symbol: "Fr",
    name: "Francio",
    nameEn: "Francium",
    category: "alcalino",
    xpos: 1,
    ypos: 7,
  },
  {
    number: 88,
    symbol: "Ra",
    name: "Radio",
    nameEn: "Radium",
    category: "alcalinoterreo",
    xpos: 2,
    ypos: 7,
  },
  {
    number: 89,
    symbol: "Ac",
    name: "Actinio",
    nameEn: "Actinium",
    category: "actinido",
    xpos: 4,
    ypos: 9.5,
  },
  {
    number: 104,
    symbol: "Rf",
    name: "Rutherfordio",
    nameEn: "Rutherfordium",
    category: "metal-transicion",
    xpos: 4,
    ypos: 7,
  },
  {
    number: 105,
    symbol: "Db",
    name: "Dubnio",
    nameEn: "Dubnium",
    category: "metal-transicion",
    xpos: 5,
    ypos: 7,
  },
  {
    number: 106,
    symbol: "Sg",
    name: "Seaborgio",
    nameEn: "Seaborgium",
    category: "metal-transicion",
    xpos: 6,
    ypos: 7,
  },
  {
    number: 107,
    symbol: "Bh",
    name: "Bohrio",
    nameEn: "Bohrium",
    category: "metal-transicion",
    xpos: 7,
    ypos: 7,
  },
  {
    number: 108,
    symbol: "Hs",
    name: "Hasio",
    nameEn: "Hassium",
    category: "metal-transicion",
    xpos: 8,
    ypos: 7,
  },
  {
    number: 109,
    symbol: "Mt",
    name: "Meitnerio",
    nameEn: "Meitnerium",
    category: "desconocido",
    xpos: 9,
    ypos: 7,
  },
  {
    number: 110,
    symbol: "Ds",
    name: "Darmstatio",
    nameEn: "Darmstadtium",
    category: "desconocido",
    xpos: 10,
    ypos: 7,
  },
  {
    number: 111,
    symbol: "Rg",
    name: "Roentgenio",
    nameEn: "Roentgenium",
    category: "desconocido",
    xpos: 11,
    ypos: 7,
  },
  {
    number: 112,
    symbol: "Cn",
    name: "Copernicio",
    nameEn: "Copernicium",
    category: "metal-transicion",
    xpos: 12,
    ypos: 7,
  },
  {
    number: 113,
    symbol: "Nh",
    name: "Nihonio",
    nameEn: "Nihonium",
    category: "desconocido",
    xpos: 13,
    ypos: 7,
  },
  {
    number: 114,
    symbol: "Fl",
    name: "Flerovio",
    nameEn: "Flerovium",
    category: "desconocido",
    xpos: 14,
    ypos: 7,
  },
  {
    number: 115,
    symbol: "Mc",
    name: "Moscovio",
    nameEn: "Moscovium",
    category: "desconocido",
    xpos: 15,
    ypos: 7,
  },
  {
    number: 116,
    symbol: "Lv",
    name: "Livermorio",
    nameEn: "Livermorium",
    category: "desconocido",
    xpos: 16,
    ypos: 7,
  },
  {
    number: 117,
    symbol: "Ts",
    name: "Teneso",
    nameEn: "Tennessine",
    category: "desconocido",
    xpos: 17,
    ypos: 7,
  },
  {
    number: 118,
    symbol: "Og",
    name: "Oganesón",
    nameEn: "Oganesson",
    category: "desconocido",
    xpos: 18,
    ypos: 7,
  },
  {
    number: 58,
    symbol: "Ce",
    name: "Cerio",
    nameEn: "Cerium",
    category: "lantanido",
    xpos: 5,
    ypos: 8.5,
  },
  {
    number: 59,
    symbol: "Pr",
    name: "Praseodimio",
    nameEn: "Praseodymium",
    category: "lantanido",
    xpos: 6,
    ypos: 8.5,
  },
  {
    number: 60,
    symbol: "Nd",
    name: "Neodimio",
    nameEn: "Neodymium",
    category: "lantanido",
    xpos: 7,
    ypos: 8.5,
  },
  {
    number: 61,
    symbol: "Pm",
    name: "Prometio",
    nameEn: "Promethium",
    category: "lantanido",
    xpos: 8,
    ypos: 8.5,
  },
  {
    number: 62,
    symbol: "Sm",
    name: "Samario",
    nameEn: "Samarium",
    category: "lantanido",
    xpos: 9,
    ypos: 8.5,
  },
  {
    number: 63,
    symbol: "Eu",
    name: "Europio",
    nameEn: "Europium",
    category: "lantanido",
    xpos: 10,
    ypos: 8.5,
  },
  {
    number: 64,
    symbol: "Gd",
    name: "Gadolinio",
    nameEn: "Gadolinium",
    category: "lantanido",
    xpos: 11,
    ypos: 8.5,
  },
  {
    number: 65,
    symbol: "Tb",
    name: "Terbio",
    nameEn: "Terbium",
    category: "lantanido",
    xpos: 12,
    ypos: 8.5,
  },
  {
    number: 66,
    symbol: "Dy",
    name: "Disprosio",
    nameEn: "Dysprosium",
    category: "lantanido",
    xpos: 13,
    ypos: 8.5,
  },
  {
    number: 67,
    symbol: "Ho",
    name: "Holmio",
    nameEn: "Holmium",
    category: "lantanido",
    xpos: 14,
    ypos: 8.5,
  },
  {
    number: 68,
    symbol: "Er",
    name: "Erbio",
    nameEn: "Erbium",
    category: "lantanido",
    xpos: 15,
    ypos: 8.5,
  },
  {
    number: 69,
    symbol: "Tm",
    name: "Tulio",
    nameEn: "Thulium",
    category: "lantanido",
    xpos: 16,
    ypos: 8.5,
  },
  {
    number: 70,
    symbol: "Yb",
    name: "Iterbio",
    nameEn: "Ytterbium",
    category: "lantanido",
    xpos: 17,
    ypos: 8.5,
  },
  {
    number: 71,
    symbol: "Lu",
    name: "Lutecio",
    nameEn: "Lutetium",
    category: "lantanido",
    xpos: 18,
    ypos: 8.5,
  },
  {
    number: 90,
    symbol: "Th",
    name: "Torio",
    nameEn: "Thorium",
    category: "actinido",
    xpos: 5,
    ypos: 9.5,
  },
  {
    number: 91,
    symbol: "Pa",
    name: "Protactinio",
    nameEn: "Protactinium",
    category: "actinido",
    xpos: 6,
    ypos: 9.5,
  },
  {
    number: 92,
    symbol: "U",
    name: "Uranio",
    nameEn: "Uranium",
    category: "actinido",
    xpos: 7,
    ypos: 9.5,
  },
  {
    number: 93,
    symbol: "Np",
    name: "Neptunio",
    nameEn: "Neptunium",
    category: "actinido",
    xpos: 8,
    ypos: 9.5,
  },
  {
    number: 94,
    symbol: "Pu",
    name: "Plutonio",
    nameEn: "Plutonium",
    category: "actinido",
    xpos: 9,
    ypos: 9.5,
  },
  {
    number: 95,
    symbol: "Am",
    name: "Americio",
    nameEn: "Americium",
    category: "actinido",
    xpos: 10,
    ypos: 9.5,
  },
  {
    number: 96,
    symbol: "Cm",
    name: "Curio",
    nameEn: "Curium",
    category: "actinido",
    xpos: 11,
    ypos: 9.5,
  },
  {
    number: 97,
    symbol: "Bk",
    name: "Berkelio",
    nameEn: "Berkelium",
    category: "actinido",
    xpos: 12,
    ypos: 9.5,
  },
  {
    number: 98,
    symbol: "Cf",
    name: "Californio",
    nameEn: "Californium",
    category: "actinido",
    xpos: 13,
    ypos: 9.5,
  },
  {
    number: 99,
    symbol: "Es",
    name: "Einstenio",
    nameEn: "Einsteinium",
    category: "actinido",
    xpos: 14,
    ypos: 9.5,
  },
  {
    number: 100,
    symbol: "Fm",
    name: "Fermio",
    nameEn: "Fermium",
    category: "actinido",
    xpos: 15,
    ypos: 9.5,
  },
  {
    number: 101,
    symbol: "Md",
    name: "Mendelevio",
    nameEn: "Mendelevium",
    category: "actinido",
    xpos: 16,
    ypos: 9.5,
  },
  {
    number: 102,
    symbol: "No",
    name: "Nobelio",
    nameEn: "Nobelium",
    category: "actinido",
    xpos: 17,
    ypos: 9.5,
  },
  {
    number: 103,
    symbol: "Lr",
    name: "Lawrencio",
    nameEn: "Lawrencium",
    category: "actinido",
    xpos: 18,
    ypos: 9.5,
  },
];

// Objeto de colores con un tipado estricto.
const categoryColors: Record<Category, string> = {
  alcalino: "#d08770",
  alcalinoterreo: "#ebcb8b",
  lantanido: "#b48ead",
  actinido: "#a3be8c",
  "metal-transicion": "#88c0d0",
  "metal-post-transicion": "#81a1c1",
  metaloide: "#8fbcbb",
  "no-metal-reactivo": "#ca7d84",
  "gas-noble": "#5e81ac",
  desconocido: "#b0968d",
};

// --- PROPS PARA LA TABLA PERIÓDICA ---
interface PeriodicTableSVGProps {
  highlightFilter: "one-letter" | "two-letters" | null;
  interactive?: boolean;
}

// --- COMPONENTE DE LA TABLA PERIÓDICA (SVG) ---
const PeriodicTableSVG: React.FC<PeriodicTableSVGProps> = ({
  highlightFilter,
  interactive = true,
}) => {
  const [activeElement, setActiveElement] = useState<number | null>(null);

  const viewBoxWidth = 18 * 100;
  const viewBoxHeight = 10 * 100;

  const activeElementData = activeElement
    ? elementsData.find((el) => el.number === activeElement)
    : null;

  return (
    <svg
      className="w-full h-auto overflow-visible"
      viewBox={`-5 -5 ${viewBoxWidth} ${viewBoxHeight}`}
    >
      {elementsData
        .filter((el) => el.number !== activeElement)
        .map((el) => {
          let isMuted = false;
          if (highlightFilter === "one-letter" && el.symbol.length !== 1)
            isMuted = true;
          if (highlightFilter === "two-letters" && el.symbol.length !== 2)
            isMuted = true;
          const TILE_SIZE = 95;
          const TILE_MARGIN = 5;
          const TOTAL_SIZE = TILE_SIZE + TILE_MARGIN;
          const x = (el.xpos - 1) * TOTAL_SIZE;
          const y = (el.ypos - 1) * TOTAL_SIZE;
          const isActive = activeElement === el.number;
          const handlePointerEnter = () =>
            interactive && !isMuted && setActiveElement(el.number);
          const handlePointerLeave = () =>
            interactive && setActiveElement(null);
          return (
            <g
              key={el.number}
              transform={`translate(${x}, ${y})`}
              style={{
                transition: "opacity 0.3s ease-in-out, filter 0.3s ease-in-out",
                opacity: isMuted ? 0.2 : 1,
                filter: isMuted ? "blur(1px)" : "blur(0)",
                zIndex: isActive ? 100 : 1,
                position: "relative",
              }}
              onMouseEnter={handlePointerEnter}
              onMouseLeave={handlePointerLeave}
              onTouchStart={handlePointerEnter}
              onTouchEnd={handlePointerLeave}
            >
              <g
                style={{
                  transform: isActive ? "scale(2)" : "scale(1)",
                  transformOrigin: `${TILE_SIZE / 2}px ${TILE_SIZE / 2}px`,
                  transition: "transform 0.15s ease-in-out",
                }}
              >
                <ElementTileSVG element={el} />
              </g>
            </g>
          );
        })}
      {activeElementData &&
        (() => {
          const TILE_SIZE = 95;
          const TILE_MARGIN = 5;
          const TOTAL_SIZE = TILE_SIZE + TILE_MARGIN;
          const x = (activeElementData.xpos - 1) * TOTAL_SIZE;
          const y = (activeElementData.ypos - 1) * TOTAL_SIZE;
          // Handlers para el grupo ampliado
          const handlePointerEnter = () =>
            setActiveElement(activeElementData.number);
          const handlePointerLeave = () => setActiveElement(null);
          return (
            <g
              key={activeElementData.number}
              transform={`translate(${x}, ${y})`}
              style={{ zIndex: 100, position: "relative" }}
              onMouseEnter={handlePointerEnter}
              onMouseLeave={handlePointerLeave}
              onTouchStart={handlePointerEnter}
              onTouchEnd={handlePointerLeave}
            >
              <g
                style={{
                  transform: "scale(2)",
                  transformOrigin: `${TILE_SIZE / 2}px ${TILE_SIZE / 2}px`,
                  transition: "transform 0.15s ease-in-out",
                }}
              >
                <ElementTileSVG element={activeElementData} />
              </g>
            </g>
          );
        })()}
    </svg>
  );
};

// --- COMPONENTE CONTENEDOR (MANEJA LA LÓGICA) ---
const PeriodicTableContainer: React.FC<{ interactive?: boolean }> = ({
  interactive = true,
}) => {
  const [highlightFilter, setHighlightFilter] = useState<HighlightFilter>(null);

  // useMemo calcula los conteos solo una vez.
  const counts = useMemo(() => {
    const oneLetter = elementsData.filter(
      (el) => el.symbol.length === 1,
    ).length;
    const twoLetters = elementsData.filter(
      (el) => el.symbol.length === 2,
    ).length;
    return { oneLetter, twoLetters };
  }, []);

  const text = {
    oneLetter: "one-letter elements",
    conjunction: " and ",
    twoLetters: "two-letter elements",
  };

  return (
    <div>
      {interactive && (
        <div>
          <p className="text-center font-mono">
            <span>{text.prefix}</span>
            <span
              className="group cursor-pointer decoration-dotted underline hover:decoration-solid"
              onMouseEnter={() => setHighlightFilter("one-letter")}
              onMouseLeave={() => setHighlightFilter(null)}
              onTouchStart={() => setHighlightFilter("one-letter")}
              onTouchEnd={() => setHighlightFilter(null)}
            >
              <span className="text-xl font-bold group-hover:text-amber-500 transition-colors">
                {counts.oneLetter}
              </span>{" "}
              {text.oneLetter}
            </span>
            <span>{text.conjunction}</span>
            <span
              className="group cursor-pointer decoration-dotted underline hover:decoration-solid"
              onMouseEnter={() => setHighlightFilter("two-letters")}
              onMouseLeave={() => setHighlightFilter(null)}
              onTouchStart={() => setHighlightFilter("two-letters")}
              onTouchEnd={() => setHighlightFilter(null)}
            >
              <span className="text-xl font-bold group-hover:text-amber-500 transition-colors">
                {counts.twoLetters}
              </span>{" "}
              {text.twoLetters}
            </span>
            <span>{text.suffix}</span>
          </p>
        </div>
      )}
      <PeriodicTableSVG
        highlightFilter={interactive ? highlightFilter : null}
        interactive={interactive}
      />
    </div>
  );
};

// --- COMPONENTE SVG REUTILIZABLE ---
const ElementTileSVG: React.FC<{
  element: ElementData;
  x?: number;
  size?: number;
}> = ({ element, x = 0, size = 95 }) => {
  const TILE_SIZE = size;
  const TILE_CENTER = TILE_SIZE / 2;
  const categoryColor = categoryColors[element.category] || "#D1C4E9";
  const name = element.nameEn;
  return (
    <g transform={`translate(${x},0)`}>
      <rect
        width={TILE_SIZE}
        height={TILE_SIZE}
        rx="12"
        ry="12"
        fill={categoryColor}
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="3"
      />
      <text x="8" y="20" className="text-sm font-bold" fill="#4a5568">
        {element.number}
      </text>
      <text
        x={TILE_CENTER}
        y={TILE_CENTER + 10}
        textAnchor="middle"
        className="text-4xl font-bold"
        fill="#2d3748"
      >
        {element.symbol}
      </text>
      <text
        x={TILE_CENTER}
        y={TILE_CENTER + 32}
        textAnchor="middle"
        className="text-xs"
        fill="#4a5568"
      >
        {name}
      </text>
    </g>
  );
};

export default PeriodicTableContainer;
export { elementsData, categoryColors, ElementTileSVG };
export type { ElementData, Category };
