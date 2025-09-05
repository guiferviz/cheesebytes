import { defineCollection, z } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';
import * as nodePath from 'path';
import { spawnSync } from 'child_process';

// Función para normalizar URLs
function normalizeUrl(path: string): string {
  if (!path) return '';
  
  let normalizedPath = path.toLowerCase();
  normalizedPath = normalizedPath.replace(/\s+/g, '-');
  normalizedPath = normalizedPath.replace(/[()[\]{}'",:;`.]/g, '');
  normalizedPath = normalizedPath.replace(/--+/g, '-');
  normalizedPath = normalizedPath.replace(/^-+|-+$/g, '');
  
  return normalizedPath;
}

// Normalizar partes de una ruta manteniendo la estructura de directorios
function normalizePathParts(path: string): string {
  if (!path) return '';
  const parts = path.split('/');
  const filename = parts.pop() || '';
  const normalizedFilename = normalizeUrl(filename);
  return parts.length > 0 ? parts.join('/') + '/' + normalizedFilename : normalizedFilename;
}

// Helper para fechas Git
function getGitDates(filePath: string) {
  try {
    const created = spawnSync(
      'git',
      ['log', '--diff-filter=A', '--format=%aI', '-1', '--', filePath],
      { encoding: 'utf8' }
    ).stdout.trim();

    const modified = spawnSync(
      'git',
      ['log', '-1', '--format=%aI', '--', filePath],
      { encoding: 'utf8' }
    ).stdout.trim();

    return { created, modified };
  } catch (err) {
    console.error(`Error getting git dates for ${filePath}:`, err);
    return { created: null, modified: null };
  }
}

// Extraer WikiLinks
function extractWikiLinks(content: string): string[] {
  const wikiLinks: string[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const linkedTitle = match[1].trim().replace(/\.md$/, '');
    wikiLinks.push(linkedTitle);
  }
  return wikiLinks;
}

// Mapa global de IDs normalizados
const normalizedIdMap = new Map<string, string>();

// Asignar imagen de queso basada en el tipo de nota
function assignCheeseImage(noteType: string): string {
  // Mapear el noteType al icono correspondiente
  switch (noteType) {
    case 'white-full':
      return '/note-logos/64/burgos-full.png';
    case 'white-wedge':
      return '/note-logos/64/burgos-wedge.png';
    case 'emmental-full':
      return '/note-logos/64/emmental-full.png';
    case 'emmental-wedge':
      return '/note-logos/64/emmental-wedge.png';
    case 'parmigiano-full':
      return '/note-logos/64/parmigiano-reggiano-full.png';
    case 'parmigiano-wedge':
      return '/note-logos/64/parmigiano-reggiano-wedge.png';
    case 'cabrales-full':
      return '/note-logos/64/cabrales-full.png';
    case 'cabrales-wedge':
      return '/note-logos/64/cabrales-wedge.png';
    default:
      // Valor por defecto para tipos no reconocidos
      return '/note-logos/64/burgos-wedge.png';
  }
}

// Función para calcular el tipo de nota automáticamente
function calculateNoteType(
  content: string,
  filePath: string,
  wikiLinks: string[],
  created: string | null,
  modified: string | null
): string {
  try {
    // Factor 1: Longitud del contenido
    const contentLength = content.length;
    let lengthScore = 0;
    if (contentLength < 500) lengthScore = 1;
    else if (contentLength < 1500) lengthScore = 2;
    else if (contentLength < 4000) lengthScore = 3;
    else lengthScore = 4;

    // Factor 2: Enlaces internos (WikiLinks)
    const internalLinksCount = wikiLinks.length;
    let linksScore = 0;
    if (internalLinksCount === 0) linksScore = 1;
    else if (internalLinksCount < 3) linksScore = 2;
    else if (internalLinksCount < 8) linksScore = 3;
    else linksScore = 4;

    // Factor 3: Enlaces externos
    const externalLinksCount = (content.match(/\[([^\]]+)\]\(https?:\/\/[^\)]+\)/g) || []).length;
    let externalLinksScore = 0;
    if (externalLinksCount === 0) externalLinksScore = 1;
    else if (externalLinksCount < 2) externalLinksScore = 2;
    else if (externalLinksCount < 5) externalLinksScore = 3;
    else externalLinksScore = 4;

    // Factor 4: Presencia de bloques de código
    const codeBlocksCount = (content.match(/```/g) || []).length / 2; // Cada bloque tiene apertura y cierre
    let codeScore = 0;
    if (codeBlocksCount === 0) codeScore = 1;
    else if (codeBlocksCount < 2) codeScore = 2;
    else if (codeBlocksCount < 4) codeScore = 3;
    else codeScore = 4;

    // Factor 5: Tipo de archivo (MDX tiene más complejidad)
    const isMdx = filePath.endsWith('.mdx');
    let fileTypeScore = isMdx ? 3 : 2; // MDX tiene más peso

    // Factor 6: Tags MDX (componentes React)
    const mdxTagsCount = isMdx ? (content.match(/<[A-Z][a-zA-Z0-9]*[^>]*>/g) || []).length : 0;
    let mdxTagsScore = 0;
    if (mdxTagsCount === 0) mdxTagsScore = 1;
    else if (mdxTagsCount < 3) mdxTagsScore = 2;
    else if (mdxTagsScore < 6) mdxTagsScore = 3;
    else mdxTagsScore = 4;

    // Factor 7: Número de ediciones en Git
    let gitEditsScore = 2; // Valor por defecto si no se puede obtener
    try {
      const gitLogResult = spawnSync(
        'git',
        ['rev-list', '--count', 'HEAD', '--', filePath],
        { encoding: 'utf8' }
      );
      const editCount = parseInt(gitLogResult.stdout.trim()) || 1;
      if (editCount === 1) gitEditsScore = 1;
      else if (editCount < 5) gitEditsScore = 2;
      else if (editCount < 15) gitEditsScore = 3;
      else gitEditsScore = 4;
    } catch (error) {
      // Mantener valor por defecto
    }

    // Factor 8: Días desde la última edición
    let daysSinceModified = 0;
    let stabilityScore = 2; // Valor por defecto
    if (modified) {
      const modifiedDate = new Date(modified);
      const now = new Date();
      daysSinceModified = Math.floor((now.getTime() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceModified < 7) stabilityScore = 1;      // Muy reciente
      else if (daysSinceModified < 30) stabilityScore = 2; // Reciente
      else if (daysSinceModified < 90) stabilityScore = 3; // Algo estable
      else stabilityScore = 4;                             // Muy estable
    }

    // Factor 9: Antigüedad de la nota (días desde creación)
    let daysSinceCreated = 0;
    let ageScore = 2; // Valor por defecto
    if (created) {
      const createdDate = new Date(created);
      const now = new Date();
      daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceCreated < 30) ageScore = 1;      // Nueva
      else if (daysSinceCreated < 90) ageScore = 2;  // Algo madura
      else if (daysSinceCreated < 365) ageScore = 3; // Madura
      else ageScore = 4;                             // Muy madura
    }

    // Calcular puntuación de profundidad (complejidad del contenido)
    const depthScore = Math.round((
      lengthScore * 0.25 +
      linksScore * 0.20 +
      externalLinksScore * 0.15 +
      codeScore * 0.15 +
      fileTypeScore * 0.10 +
      mdxTagsScore * 0.10 +
      gitEditsScore * 0.05
    ));

    // Calcular puntuación de estabilidad
    const finalStabilityScore = Math.round((
      stabilityScore * 0.6 +
      ageScore * 0.4
    ));

    // Mapear puntuaciones a tipos de queso
    let cheeseType = '';
    if (depthScore <= 1) cheeseType = 'white';        // Burgos (blanco)
    else if (depthScore <= 2) cheeseType = 'emmental'; // Emmental (con agujeros)
    else if (depthScore <= 3) cheeseType = 'parmigiano'; // Parmesano (curado)
    else cheeseType = 'cabrales';                      // Cabrales (azul)

    // Determinar forma basada en estabilidad
    const isStable = finalStabilityScore >= 3;
    const shape = isStable ? 'full' : 'wedge';

    return `${cheeseType}-${shape}`;

  } catch (error) {
    console.error('Error calculating note type:', error);
    // Valor por defecto en caso de error
    return 'white-wedge';
  }
}

const customLoader: Loader = {
  ...glob,
  name: 'CustomLoader',
  load: async function (loaderParams) {
    const { store } = loaderParams;

    try {
      const baseLoader = glob({
        pattern: '**/*.{md,mdx}',
        base: '../../notes/Cheese Bytes',
      });

      await baseLoader.load.call(this, loaderParams);

      let items = [...store.entries()].map(([_, item]) => item);

      console.log(`Loaded ${items.length} items from the store`);

      // Crear mapas para wikilinks
      const allNoteIds = new Set<string>();
      const titleToIdMap = new Map<string, string>();

      // Paso 1: Normalizar IDs y construir mapas
      items.forEach(item => {
        const id = item.id || '';
        const normalizedId = normalizePathParts(id);
        allNoteIds.add(normalizedId);

        if (item.filePath) {
          const fileName = nodePath.parse(item.filePath).name;
          titleToIdMap.set(fileName.toLowerCase(), normalizedId);
        }
        titleToIdMap.set(normalizedId, normalizedId);
      });

      console.log(`Created a set of ${allNoteIds.size} note IDs`);

      // --- 🔥 ORDENAR ITEMS: folders always at the end ---
      items.sort((a, b) => {
        const aIsFolder = a.id.includes('/');
        const bIsFolder = b.id.includes('/');
        if (!aIsFolder && bIsFolder) return -1;
        if (aIsFolder && !bIsFolder) return 1;
        return a.id.toLowerCase().localeCompare(b.id.toLowerCase());
      });

      // Paso 2: Procesar cada item
      items = items.map((item) => {
        const originalId = item.id || '';
        const normalizedId = normalizePathParts(originalId);
        normalizedIdMap.set(originalId, normalizedId);

        let fileName = '';
        let title = '';

        if (item.filePath) {
          fileName = nodePath.parse(item.filePath).name;
          title = fileName;
        } else if (typeof item.id === 'string') {
          fileName = nodePath.basename(item.id, '.md');
          title = fileName;
        } else {
          fileName = 'unknown';
          title = 'Unknown';
        }

        let description = '';
        let content = '';

        if (typeof item.body === 'string') {
          content = item.body;
          description = content.slice(0, 200);
        } else {
          description = `Note about ${title}`;
          content = description;
        }

        const allWikiLinks = extractWikiLinks(content);

        const validWikiLinks = allWikiLinks
          .map(link => {
            return titleToIdMap.get(link.toLowerCase()) || titleToIdMap.get(normalizeUrl(link));
          })
          .filter(id => id && allNoteIds.has(id)) as string[];

        let created = null;
        let modified = null;

        if (item.filePath) {
          const dates = getGitDates(item.filePath);
          created = dates.created;
          modified = dates.modified;
        }

        // Verificar si hay un noteType manual en el frontmatter
        const manualNoteType = typeof item.data?.noteType === 'string' ? item.data.noteType : null;
        
        // Calcular el tipo de nota automáticamente solo si no hay uno manual
        const noteType = manualNoteType || calculateNoteType(
          content,
          item.filePath || '',
          validWikiLinks,
          created,
          modified
        );
        
        // Asignar imagen basada en el tipo de nota (manual o automático)
        const cheeseImage = assignCheeseImage(noteType);

        return {
          ...item,
          id: normalizedId,
          data: {
            ...item.data,
            title: title,
            description: description,
            created,
            modified,
            wikiLinks: validWikiLinks,
            originalId: originalId,
            cheeseImage: cheeseImage,
            noteType: noteType,
          },
        };
      });

      // Paso 3: Calcular enlaces entrantes y salientes
      const inboundLinksMap = new Map<string, Array<{id: string, title: string}>>();
      
      // Inicializar el mapa para todos los items
      items.forEach(item => {
        inboundLinksMap.set(item.id, []);
      });
      
      // Construir enlaces entrantes basados en los wikiLinks de cada nota
      items.forEach(item => {
        const wikiLinks = (item.data.wikiLinks as string[]) || [];
        wikiLinks.forEach((linkedId: string) => {
          if (inboundLinksMap.has(linkedId)) {
            inboundLinksMap.get(linkedId)!.push({
              id: item.id,
              title: (item.data.title as string) || item.id
            });
          }
        });
      });
      
      // Paso 4: Añadir enlaces entrantes y salientes a cada item
      items = items.map(item => {
        const wikiLinks = (item.data.wikiLinks as string[]) || [];
        const outboundLinks = wikiLinks.map((linkedId: string) => {
          const linkedItem = items.find(i => i.id === linkedId);
          return {
            id: linkedId,
            title: (linkedItem?.data.title as string) || linkedId
          };
        });
        
        const inboundLinks = inboundLinksMap.get(item.id) || [];
        
        return {
          ...item,
          data: {
            ...item.data,
            outboundLinks,
            inboundLinks
          }
        };
      });

      // Limpiar y reinsertar en el store
      store.clear();
      for (const item of items) {
        try {
          store.set(item);
        } catch (error) {
          console.error(`Error adding item ${item.id} to store:`, error);
        }
      }

      console.log(`Added ${items.length} processed items back to the store`);
      console.log("Mapa de IDs normalizados:", Object.fromEntries(normalizedIdMap));

    } catch (error) {
      console.error("Error in customLoader:", error);
    }
  },
};

const notes = defineCollection({
  loader: customLoader,
});

export const collections = { notes };

// Exportar para otros componentes
export { normalizeUrl, normalizePathParts, normalizedIdMap };

