import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const notes = await getCollection('notes');
    
    const searchIndex = notes.map((note) => {
      // Extraer texto plano del contenido
      const content = note.body || '';
      const plainText = content
        .replace(/```[\s\S]*?```/g, '') // Remover bloques de código
        .replace(/#{1,6}\s+/g, '') // Remover headers markdown
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convertir links a texto
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remover bold
        .replace(/\*([^*]+)\*/g, '$1') // Remover italic
        .replace(/`([^`]+)`/g, '$1') // Remover inline code
        .replace(/\n+/g, ' ') // Convertir newlines a espacios
        .trim();

      return {
        id: note.id,
        title: note.data.title || note.id,
        content: plainText,
        url: `/${note.id}`,
        noteType: note.data.noteType,
        created: note.data.created,
        modified: note.data.modified,
        // Crear un snippet corto para mostrar en resultados
        snippet: plainText.slice(0, 300)
      };
    });

    return new Response(JSON.stringify(searchIndex), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating search index:', error);
    return new Response(JSON.stringify({ error: 'Failed to create search index' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
