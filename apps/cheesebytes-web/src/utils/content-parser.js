import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const notesPath = "../../notes/Cheese\ Bytes";

// Función para normalizar URLs
export function normalizeUrl(path) {
  if (!path) return '';
  
  // Convertir a minúscula para consistencia
  let normalizedPath = path.toLowerCase();
  
  // Reemplazar espacios con guiones
  normalizedPath = normalizedPath.replace(/\s+/g, '-');
  
  // Reemplazar caracteres especiales
  normalizedPath = normalizedPath.replace(/[()[\]{}'",:;]/g, '');
  
  // Reemplazar múltiples guiones con uno solo
  normalizedPath = normalizedPath.replace(/--+/g, '-');
  
  // Eliminar guiones al principio y al final
  normalizedPath = normalizedPath.replace(/^-+|-+$/g, '');
  
  return normalizedPath;
}

// Normalizar partes de una ruta manteniendo la estructura de directorios
export function normalizePathParts(path) {
  if (!path) return '';
  
  const parts = path.split('/');
  const filename = parts.pop() || '';
  
  const normalizedFilename = normalizeUrl(filename);
  
  if (parts.length > 0) {
    return parts.join('/') + '/' + normalizedFilename;
  } else {
    return normalizedFilename;
  }
}

// Helper function to get git dates for a file.
export function getGitDates(filePath) {
  try {
    // Use --diff-filter=A with -1 to get the first commit that added the file.
    const created = execSync(
      `git log --diff-filter=A --format=%aI -1 -- "${filePath}"`,
      { encoding: 'utf8' }
    ).trim();
    // Get the latest commit (last modified)
    const modified = execSync(
      `git log -1 --format=%aI -- "${filePath}"`,
      { encoding: 'utf8' }
    ).trim();
    return { created, modified };
  } catch (err) {
    console.error(`Error getting git dates for ${filePath}:`, err);
    return { created: null, modified: null };
  }
}

// Extrae WikiLinks del contenido en formato [[Link]]
export function extractWikiLinks(content) {
  if (!content) return [];
  
  const wikiLinks = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const linkedTitle = match[1].trim().replace(/\.md$/, '');
    wikiLinks.push(linkedTitle);
  }

  return wikiLinks;
}

// Extrae enlaces de Markdown [texto](enlace)
export function extractMarkdownLinks(content) {
  if (!content) return [];
  
  const links = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const text = match[1].trim();
    const url = match[2];
    
    // Solo considerar enlaces internos (que no empiezan con http)
    if (!url.startsWith('http')) {
      links.push({
        text,
        url
      });
    }
  }

  return links;
}

// Extrae tags al estilo obsidian (#tag)
export function extractTags(content) {
  if (!content) return [];
  
  const tags = [];
  // Buscar #tag pero no dentro de URLs o elementos que no sean tags
  const regex = /(?<!\S)#([a-zA-Z][a-zA-Z0-9_-]*)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    tags.push(match[1]);
  }

  return [...new Set(tags)]; // Eliminar duplicados
}

/**
 * Analiza una nota y extrae sus metadatos y relaciones
 */
export function parseNoteContent(id, filePath, content) {
  // Extraer título del nombre de archivo
  const fileName = path.basename(filePath, '.md');
  const title = fileName;
  
  // Extraer una breve descripción
  const description = content.slice(0, 200);
  
  // Extraer relaciones mediante WikiLinks
  const wikiLinks = extractWikiLinks(content);
  
  // Extraer otras relaciones Markdown
  const markdownLinks = extractMarkdownLinks(content);
  
  // Extraer tags
  const tags = extractTags(content);
  
  // Normalizar ID para URL
  const normalizedId = normalizePathParts(id);
  
  // Fechas Git
  const { created, modified } = getGitDates(filePath);
  
  return {
    id,
    normalizedId,
    fileName,
    title,
    description,
    created,
    modified,
    wikiLinks,
    markdownLinks,
    tags,
    content // Incluir el contenido completo
  };
}

/**
 * Carga y analiza todas las notas del directorio
 */
export async function parseAllNotes(baseDir = notesPath) {
  try {
    console.log("Analizando notas desde:", baseDir);
    // Objeto para almacenar todas las notas y sus metadatos
    const notes = [];
    const notesMap = {};
    const titleToIdMap = new Map();
    
    // Verificar que el directorio existe
    if (!fs.existsSync(baseDir)) {
      console.error(`El directorio ${baseDir} no existe`);
      return null;
    }
    
    // Función recursiva para leer directorios
    function readDirectory(dir, pathPrefix = '') {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = pathPrefix ? path.join(pathPrefix, item) : item;
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          readDirectory(fullPath, relativePath);
        } else if (item.endsWith('.md')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const id = relativePath.replace(/\.md$/, '');
          const note = parseNoteContent(id, fullPath, content);
          
          notes.push(note);
          notesMap[id] = note;
          titleToIdMap.set(note.title.toLowerCase(), id);
          titleToIdMap.set(id.toLowerCase(), id);
        }
      }
    }
    
    readDirectory(baseDir);
    
    console.log(`Se encontraron ${notes.length} notas`);
    
    // Establecer relaciones bidireccionales
    for (const note of notes) {
      note.links = [];
      note.backlinks = [];
    }
    
    // Procesar enlaces entre notas
    for (const sourceNote of notes) {
      // Convertir WikiLinks a IDs definitivos
      for (const targetTitle of sourceNote.wikiLinks) {
        const targetId = titleToIdMap.get(targetTitle.toLowerCase());
        
        if (targetId && targetId !== sourceNote.id) {
          // Añadir enlace desde esta nota
          sourceNote.links.push(targetId);
          
          // Añadir backlink en la nota destino
          const targetNote = notesMap[targetId];
          if (targetNote) {
            targetNote.backlinks.push(sourceNote.id);
          }
        }
      }
    }
    
    // Eliminar duplicados en enlaces y backlinks
    for (const note of notes) {
      note.links = [...new Set(note.links)];
      note.backlinks = [...new Set(note.backlinks)];
    }
    
    console.log("Análisis de notas completado");
    
    return {
      notes,
      notesMap,
      titleToIdMap
    };
  } catch (error) {
    console.error("Error al analizar las notas:", error);
    return null;
  }
}

// Inicialización de los datos
export let notesData = null;

// Función que carga los datos una sola vez
export async function loadNotesData() {
  try {
    if (!notesData) {
      console.log("Cargando datos de notas...");
      notesData = await parseAllNotes();
      console.log("Datos de notas cargados correctamente");
    }
    return notesData;
  } catch (error) {
    console.error("Error al cargar datos de notas:", error);
    return null;
  }
}

// No ejecutamos loadNotesData() aquí para evitar carga prematura
// Será llamado desde content.config.ts cuando sea necesario 