import { WebSocketServer as Server } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'url';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const clearOldMessages = async (): Promise<void> => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('messages')
    .delete()
    .lt('created_at', oneHourAgo);

  if (error) {
    console.error('Error clearing old messages:', error);
  } else {
    console.log('Old messages cleared');
  }
};

// Schedule the clearOldMessages function to run every hour
setInterval(clearOldMessages, 60 * 60 * 1000);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomCode = searchParams.get('roomCode');

  if (!roomCode) {
    return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
  }

  if ((req as any).socket.server.ws) {
    console.log('WebSocket server already running');
    return NextResponse.json({ message: 'WebSocket server already running' });
  }

  const wss = new Server({ server: (req as any).socket.server });

  wss.on('connection', async (socket: any, req: any) => {
    const { query } = parse(req.url!, true);
    const roomCode = query.roomCode as string;
    console.log('Client connected to room:', roomCode);

    // Fetch previous messages from Supabase
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_code', roomCode)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      // Send all previous messages to the new client
      messages.forEach((message: { email: string, content: string }) => {
        socket.send(JSON.stringify({ email: message.email, content: message.content }));
      });
    }

    socket.on('message', async (data: any) => {
      const { email, message } = JSON.parse(data.toString());
      console.log('Received:', message, 'from:', email);

      // Store the message in Supabase
      const { error } = await supabase
        .from('messages')
        .insert([{ room_code: roomCode, email, content: message }]);

      if (error) {
        console.error('Error storing message:', error);
      }

      // Broadcast the message to all connected clients
      wss.clients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ email, content: message }));
        }
      });
    });

    socket.on('close', () => {
      console.log('Client disconnected');
    });

    socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });
  });

  (req as any).socket.server.ws = wss;
  console.log('WebSocket server started');
  return NextResponse.json({ message: 'WebSocket server started' });
}
