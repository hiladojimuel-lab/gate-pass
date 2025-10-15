import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { addConnection, removeConnection } from '@/lib/realtime';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }

    const decoded = verifyToken(token);
    const connectionId = `${decoded.role}_${decoded.id}_${Date.now()}`;

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Store connection
        addConnection(connectionId, controller);

        // Send initial connection message
        const data = JSON.stringify({
          type: 'connected',
          message: 'Real-time updates connected',
          timestamp: new Date().toISOString()
        });
        controller.enqueue(`data: ${data}\n\n`);

        // Handle connection cleanup
        request.signal.addEventListener('abort', () => {
          removeConnection(connectionId);
          controller.close();
        });
      },
      cancel() {
        removeConnection(connectionId);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });
  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

