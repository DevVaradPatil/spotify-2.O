import { Server } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'url';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const clearOldMessages = async () => {
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

export default function handler(req, res) {
  if (res.socket.server.ws) {
    console.log('WebSocket server already running');
    res.end();
    return;
  }

  const wss = new Server({ server: res.socket.server });

  wss.on('connection', async (socket, req) => {
    const { query } = parse(req.url, true);
    const roomCode = query.roomCode;
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
      messages.forEach((message) => {
        socket.send(JSON.stringify({ email: message.email, content: message.content }));
      });
    }

    socket.on('message', async (data) => {
      const { email, message } = JSON.parse(data);
      console.log('Received:', message, 'from:', email);

      // Store the message in Supabase
      const { error } = await supabase
        .from('messages')
        .insert([{ room_code: roomCode, email, content: message }]);

      if (error) {
        console.error('Error storing message:', error);
      }

      // Broadcast the message to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ email, content: message }));
        }
      });
    });

    socket.on('close', () => {
      console.log('Client disconnected');
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  res.socket.server.ws = wss;
  console.log('WebSocket server started');
  res.end();
}
