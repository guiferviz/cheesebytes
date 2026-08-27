import { defineCollection, z } from "astro:content";
import { glob, type Loader } from "astro/loaders";
import * as nodePath from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const notesPattern = "**/*.{md,mdx}";
const notesBase = "../../notes/Cheese Bytes";
const registeredWatchers = new WeakSet<object>();

function runGit(args: string[], maxBuffer?: number): string {
  const gitResult = spawnSync("git", args, {
    encoding: "utf8",
    ...(maxBuffer ? { maxBuffer } : {}),
  });

  if (gitResult.error) throw gitResult.error;
  if (gitResult.status !== 0) {
    throw new Error(
      `git ${args[0]} failed with exit code ${gitResult.status}: ${gitResult.stderr.trim()}`,
    );
  }

  return gitResult.stdout;
}

// Función para normalizar URLs
function normalizeUrl(path: string): string {
  if (!path) return "";

  let normalizedPath = path.toLowerCase();
  normalizedPath = normalizedPath.replace(/\s+/g, "-");
  normalizedPath = normalizedPath.replace(/[()[\]{}'",:;`.]/g, "");
  normalizedPath = normalizedPath.replace(/--+/g, "-");
  normalizedPath = normalizedPath.replace(/^-+|-+$/g, "");

  return normalizedPath;
}

// Normalizar partes de una ruta manteniendo la estructura de directorios
function normalizePathParts(path: string): string {
  if (!path) return "";
  const parts = path.split("/");
  const filename = parts.pop() || "";
  const normalizedFilename = normalizeUrl(filename);
  return parts.length > 0
    ? parts.join("/") + "/" + normalizedFilename
    : normalizedFilename;
}

// Batch git data: gets created/modified dates and edit counts for ALL files in 2 git calls
function batchGitData(
  filePaths: string[],
): Map<
  string,
  { created: string | null; modified: string | null; editCount: number }
> {
  const result = new Map<
    string,
    { created: string | null; modified: string | null; editCount: number }
  >();
  for (const fp of filePaths) {
    result.set(fp, { created: null, modified: null, editCount: 0 });
  }

  if (filePaths.length === 0) return result;

  try {
    // 1) Get git repo root so we can match --name-only output → original paths
    const gitRoot = runGit(["rev-parse", "--show-toplevel"]).trim();

    const relToOriginal = new Map<string, string>();
    for (const fp of filePaths) {
      const absPath = nodePath.resolve(fp);
      const relPath = nodePath.relative(gitRoot, absPath);
      relToOriginal.set(relPath, fp);
    }

    // 2) ONE git-log call for every file: dates + file names
    const gitLog = runGit(
      ["log", "--format=__COMMIT__%aI", "--name-only", "--", ...filePaths],
      50 * 1024 * 1024,
    );

    let currentDate = "";
    for (const line of gitLog.split("\n")) {
      if (line.startsWith("__COMMIT__")) {
        currentDate = line.slice("__COMMIT__".length);
      } else if (line.trim() && currentDate) {
        const originalPath = relToOriginal.get(line.trim());
        if (originalPath && result.has(originalPath)) {
          const entry = result.get(originalPath)!;
          entry.editCount++;
          if (!entry.modified) entry.modified = currentDate; // first seen = newest
          entry.created = currentDate; // keep overwriting → last seen = oldest
        }
      }
    }

    console.log(
      `batchGitData: processed ${filePaths.length} files in 2 git calls (was ${filePaths.length * 3} calls)`,
    );
  } catch (err) {
    console.error("Error in batchGitData:", err);
    if (process.env.CI) throw err;
  }

  return result;
}

// Extraer WikiLinks
function extractWikiLinks(content: string): string[] {
  const wikiLinks: string[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const linkedTitle = match[1].trim().replace(/\.md$/, "");
    wikiLinks.push(linkedTitle);
  }
  return wikiLinks;
}

// Mapa global de IDs normalizados
const normalizedIdMap = new Map<string, string>();

// Asignar imagen de queso basada en el tipo de nota
function assignCheeseImage(noteType: string): string | undefined {
  // Mapear el noteType al icono correspondiente
  switch (noteType) {
    case "white-full":
      return "/note-logos/64/burgos-full.png";
    case "white-wedge":
      return "/note-logos/64/burgos-wedge.png";
    case "emmental-full":
      return "/note-logos/64/emmental-full.png";
    case "emmental-wedge":
      return "/note-logos/64/emmental-wedge.png";
    case "parmigiano-full":
      return "/note-logos/64/parmigiano-reggiano-full.png";
    case "parmigiano-wedge":
      return "/note-logos/64/parmigiano-reggiano-wedge.png";
    case "cabrales-full":
      return "/note-logos/64/cabrales-full.png";
    case "cabrales-wedge":
      return "/note-logos/64/cabrales-wedge.png";
    default:
      return undefined;
  }
}

// Función para calcular el tipo de nota automáticamente
function calculateNoteType(
  content: string,
  filePath: string,
  wikiLinks: string[],
  editCount: number,
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
    const externalLinksCount = (
      content.match(/\[([^\]]+)\]\(https?:\/\/[^\)]+\)/g) || []
    ).length;
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
    const isMdx = filePath.endsWith(".mdx");
    let fileTypeScore = isMdx ? 3 : 2; // MDX tiene más peso

    // Factor 6: Tags MDX (componentes React)
    const mdxTagsCount = isMdx
      ? (content.match(/<[A-Z][a-zA-Z0-9]*[^>]*>/g) || []).length
      : 0;
    let mdxTagsScore = 0;
    if (mdxTagsCount === 0) mdxTagsScore = 1;
    else if (mdxTagsCount < 3) mdxTagsScore = 2;
    else if (mdxTagsScore < 6) mdxTagsScore = 3;
    else mdxTagsScore = 4;

    // Factor 7: Número de ediciones en Git (from batch data)
    let gitEditsScore = 2;
    if (editCount <= 1) gitEditsScore = 1;
    else if (editCount < 5) gitEditsScore = 2;
    else if (editCount < 15) gitEditsScore = 3;
    else gitEditsScore = 4;

    // Calcular puntuación de profundidad (complejidad del contenido)
    const depthScore = Math.round(
      lengthScore * 0.25 +
        linksScore * 0.2 +
        externalLinksScore * 0.15 +
        codeScore * 0.15 +
        fileTypeScore * 0.1 +
        mdxTagsScore * 0.1 +
        gitEditsScore * 0.05,
    );

    // Mapear puntuaciones a tipos de queso
    let cheeseType = "";
    if (depthScore <= 1)
      cheeseType = "white"; // Burgos (blanco)
    else if (depthScore <= 2)
      cheeseType = "emmental"; // Emmental (con agujeros)
    else if (depthScore <= 3)
      cheeseType = "parmigiano"; // Parmesano (curado)
    else cheeseType = "cabrales"; // Cabrales (azul)

    // Las notas asignadas automaticamente siempre usan wedge.
    // El formato full queda reservado para un noteType manual en frontmatter.
    return `${cheeseType}-wedge`;
  } catch (error) {
    console.error("Error calculating note type:", error);
    // Valor por defecto en caso de error
    return "white-wedge";
  }
}

const customLoader: Loader = {
  ...glob,
  name: "CustomLoader",
  load: async function (loaderParams) {
    const { store, watcher, logger, config } = loaderParams;

    try {
      const baseLoader = glob({
        pattern: notesPattern,
        base: notesBase,
      });
      const notesBasePath = nodePath.resolve(
        fileURLToPath(config.root),
        notesBase,
      );

      const rebuildStore = async () => {
        normalizedIdMap.clear();
        store.clear();

        await baseLoader.load.call(this, {
          ...loaderParams,
          watcher: undefined,
        });

        let items = [...store.entries()].map(([_, item]) => item);

        console.log(`Loaded ${items.length} items from the store`);

        // Crear mapas para wikilinks
        const allNoteIds = new Set<string>();
        const titleToIdMap = new Map<string, string>();

        // Paso 1: Normalizar IDs y construir mapas
        items.forEach((item) => {
          const id = item.id || "";
          const normalizedId = normalizePathParts(id);
          allNoteIds.add(normalizedId);

          if (item.filePath) {
            const fileName = nodePath.parse(item.filePath).name;
            titleToIdMap.set(fileName.toLowerCase(), normalizedId);
            titleToIdMap.set(normalizeUrl(fileName), normalizedId);
          }
          if (typeof item.data?.title === "string") {
            titleToIdMap.set(item.data.title.toLowerCase(), normalizedId);
            titleToIdMap.set(normalizeUrl(item.data.title), normalizedId);
          }
          if (Array.isArray(item.data?.aliases)) {
            for (const alias of item.data.aliases) {
              if (typeof alias !== "string") continue;
              titleToIdMap.set(alias.toLowerCase(), normalizedId);
              titleToIdMap.set(normalizeUrl(alias), normalizedId);
            }
          }
          titleToIdMap.set(normalizedId, normalizedId);
        });

        console.log(`Created a set of ${allNoteIds.size} note IDs`);

        // --- 🔥 ORDENAR ITEMS: folders always at the end ---
        items.sort((a, b) => {
          const aIsFolder = a.id.includes("/");
          const bIsFolder = b.id.includes("/");
          if (!aIsFolder && bIsFolder) return -1;
          if (aIsFolder && !bIsFolder) return 1;
          return a.id.toLowerCase().localeCompare(b.id.toLowerCase());
        });

        // --- 🚀 Batch git data (2 calls instead of 378) ---
        const allFilePaths = items
          .map((item) => item.filePath)
          .filter((fp): fp is string => typeof fp === "string");
        const gitDataMap = batchGitData(allFilePaths);

        // Paso 2: Procesar cada item
        items = items.map((item) => {
          const originalId = item.id || "";
          const normalizedId = normalizePathParts(originalId);
          normalizedIdMap.set(originalId, normalizedId);

          let fileName = "";
          let title = "";

          if (item.filePath) {
            fileName = nodePath.parse(item.filePath).name;
            title =
              typeof item.data?.title === "string" ? item.data.title : fileName;
          } else if (typeof item.id === "string") {
            fileName = nodePath.basename(item.id, ".md");
            title =
              typeof item.data?.title === "string" ? item.data.title : fileName;
          } else {
            fileName = "unknown";
            title = "Unknown";
          }

          let description = "";
          let content = "";

          if (typeof item.body === "string") {
            content = item.body;
            description = content.slice(0, 200);
          } else {
            description = `Note about ${title}`;
            content = description;
          }

          const allWikiLinks = extractWikiLinks(content);

          const validWikiLinks = allWikiLinks
            .map((link) => {
              return (
                titleToIdMap.get(link.toLowerCase()) ||
                titleToIdMap.get(normalizeUrl(link))
              );
            })
            .filter((id) => id && allNoteIds.has(id)) as string[];

          let created = null;
          let modified = null;

          if (item.filePath) {
            const gitData = gitDataMap.get(item.filePath);
            if (gitData) {
              created = gitData.created;
              modified = gitData.modified;
            }
          }

          // Verificar si hay un noteType manual en el frontmatter
          const manualNoteType =
            typeof item.data?.noteType === "string" ? item.data.noteType : null;

          // Calcular el tipo de nota automáticamente solo si no hay uno manual
          const editCount = item.filePath
            ? (gitDataMap.get(item.filePath)?.editCount ?? 1)
            : 1;
          const noteType =
            manualNoteType ||
            calculateNoteType(
              content,
              item.filePath || "",
              validWikiLinks,
              editCount,
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
              fileName,
              cheeseImage: cheeseImage,
              noteType: noteType,
            },
          };
        });

        // Paso 3: Calcular enlaces entrantes y salientes
        const inboundLinksMap = new Map<
          string,
          Array<{ id: string; title: string }>
        >();

        // Inicializar el mapa para todos los items
        items.forEach((item) => {
          inboundLinksMap.set(item.id, []);
        });

        // Construir enlaces entrantes basados en los wikiLinks de cada nota
        items.forEach((item) => {
          const wikiLinks = (item.data.wikiLinks as string[]) || [];
          wikiLinks.forEach((linkedId: string) => {
            if (inboundLinksMap.has(linkedId)) {
              inboundLinksMap.get(linkedId)!.push({
                id: item.id,
                title: (item.data.title as string) || item.id,
                cheeseImage:
                  typeof item.data.cheeseImage === "string"
                    ? item.data.cheeseImage
                    : null,
                noteType:
                  typeof item.data.noteType === "string"
                    ? item.data.noteType
                    : null,
              });
            }
          });
        });

        // Paso 4: Añadir enlaces entrantes y salientes a cada item
        items = items.map((item) => {
          const wikiLinks = (item.data.wikiLinks as string[]) || [];
          const outboundLinks = wikiLinks.map((linkedId: string) => {
            const linkedItem = items.find((i) => i.id === linkedId);
            return {
              id: linkedId,
              title: (linkedItem?.data.title as string) || linkedId,
              cheeseImage:
                typeof linkedItem?.data.cheeseImage === "string"
                  ? linkedItem.data.cheeseImage
                  : null,
              noteType:
                typeof linkedItem?.data.noteType === "string"
                  ? linkedItem.data.noteType
                  : null,
            };
          });

          const inboundLinks = inboundLinksMap.get(item.id) || [];

          return {
            ...item,
            data: {
              ...item.data,
              outboundLinks,
              inboundLinks,
            },
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
        console.log(
          "Mapa de IDs normalizados:",
          Object.fromEntries(normalizedIdMap),
        );
      };

      await rebuildStore();

      if (watcher && !registeredWatchers.has(watcher)) {
        watcher.add(notesBasePath);

        const reloadNotes = async (changedPath: string) => {
          if (!/\.(md|mdx)$/i.test(changedPath)) return;
          if (nodePath.relative(notesBasePath, changedPath).startsWith(".."))
            return;

          await rebuildStore();
          logger.info(`Reloaded data from ${nodePath.basename(changedPath)}`);
        };

        watcher.on("change", reloadNotes);
        watcher.on("add", reloadNotes);
        watcher.on("unlink", reloadNotes);
        registeredWatchers.add(watcher);
      }
    } catch (error) {
      console.error("Error in customLoader:", error);
      if (process.env.CI) throw error;
    }
  },
};

const notes = defineCollection({
  loader: customLoader,
});

export const collections = { notes };

// Exportar para otros componentes
export { normalizeUrl, normalizePathParts, normalizedIdMap };
