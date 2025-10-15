// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

// Function to add a connection
export function addConnection(connectionId: string, controller: ReadableStreamDefaultController): void {
  connections.set(connectionId, controller);
}

// Function to remove a connection
export function removeConnection(connectionId: string): void {
  connections.delete(connectionId);
}

// Function to broadcast updates to all connected clients
export function broadcastUpdate(type: string, data: any, targetRole?: string): void {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString()
  });

  connections.forEach((controller, connectionId) => {
    try {
      // If targetRole is specified, only send to clients with that role
      if (targetRole && !connectionId.startsWith(targetRole)) {
        return;
      }
      
      controller.enqueue(`data: ${message}\n\n`);
    } catch (error) {
      console.error('Error sending SSE message:', error);
      // Remove dead connections
      connections.delete(connectionId);
    }
  });
}
