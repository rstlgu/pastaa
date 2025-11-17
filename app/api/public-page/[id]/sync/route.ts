import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Server-Sent Events per sincronizzazione in tempo reale
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pageId = params.id;
  
  // Crea un ReadableStream per SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Invia header SSE
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };
      
      // Polling ogni 1 secondo per cambiamenti
      const interval = setInterval(async () => {
        try {
          const page = await prisma.publicPage.findUnique({
            where: { id: pageId },
            select: { content: true, updatedAt: true },
          });
          
          if (page) {
            send(JSON.stringify({
              type: 'update',
              content: page.content,
              updatedAt: page.updatedAt.toISOString(),
            }));
          }
        } catch (error) {
          console.error('Errore polling:', error);
          send(JSON.stringify({ type: 'error', message: 'Errore sincronizzazione' }));
        }
      }, 1000);
      
      // Cleanup quando il client si disconnette
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

