const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PORT = process.env.PORT || 8080;
const server = new WebSocket.Server({ port: PORT });

// Room code -> Set of authenticated sockets in that room.
// Previously every broadcast went to server.clients, i.e. every client
// connected to the process regardless of room, leaking chat and track
// changes across rooms.
const rooms = new Map();

// A socket has ROOM_CODE_MAX_AGE to send a valid AUTH frame before it is
// closed. Until then it receives nothing and may not send anything else.
const AUTH_TIMEOUT_MS = 10_000;
const MAX_MESSAGE_BYTES = 4096;
const MAX_CHAT_LENGTH = 2000;
const ROOM_CODE_RE = /^[A-Z0-9]{6}$/;

const joinRoom = (roomCode, socket) => {
  if (!rooms.has(roomCode)) rooms.set(roomCode, new Set());
  rooms.get(roomCode).add(socket);
};

const leaveRoom = (roomCode, socket) => {
  const peers = rooms.get(roomCode);
  if (!peers) return;
  peers.delete(socket);
  if (peers.size === 0) rooms.delete(roomCode);
};

const broadcast = (roomCode, payload, { includeSelf = true, sender } = {}) => {
  const peers = rooms.get(roomCode);
  if (!peers) return;
  const data = JSON.stringify(payload);
  for (const peer of peers) {
    if (!includeSelf && peer === sender) continue;
    if (peer.readyState === WebSocket.OPEN) peer.send(data);
  }
};

const clearOldMessages = async () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('messages')
    .delete()
    .lt('created_at', oneHourAgo);

  if (error) console.error('Error clearing old messages:', error);
};

setInterval(clearOldMessages, 60 * 60 * 1000);

server.on('connection', async (socket, req) => {
  const roomCode = (req.url || '').split('/')[1]?.split('?')[0]?.toUpperCase();

  if (!roomCode || !ROOM_CODE_RE.test(roomCode)) {
    socket.close(4400, 'Invalid room code');
    return;
  }

  // Connection state. `identity` is populated only from a verified Supabase
  // session — never from anything the client claims about itself.
  let identity = null;

  const authTimer = setTimeout(() => {
    if (!identity) socket.close(4401, 'Authentication timeout');
  }, AUTH_TIMEOUT_MS);

  const authenticate = async (token) => {
    if (typeof token !== 'string' || token.length === 0) return false;

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return false;

    const user = data.user;
    identity = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null
    };
    return true;
  };

  const replayHistory = async () => {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_code', roomCode)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    for (const message of messages) {
      if (socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({
        type: 'CHAT',
        email: message.email,
        content: message.content,
        full_name: message.full_name,
        avatar_url: message.avatar_url
      }));
    }
  };

  socket.on('message', async (raw) => {
    if (raw.length > MAX_MESSAGE_BYTES) {
      socket.close(4413, 'Message too large');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (!parsed || typeof parsed.type !== 'string') return;

    if (parsed.type === 'AUTH') {
      if (identity) return;
      const ok = await authenticate(parsed.token);
      if (!ok) {
        socket.close(4401, 'Authentication failed');
        return;
      }
      clearTimeout(authTimer);
      joinRoom(roomCode, socket);
      socket.send(JSON.stringify({ type: 'AUTH_OK' }));
      await replayHistory();
      return;
    }

    // Every other frame requires a verified session.
    if (!identity) {
      socket.close(4401, 'Not authenticated');
      return;
    }

    if (parsed.type === 'PLAY_SONG') {
      const songId = parsed.songId;
      if (typeof songId !== 'string' && typeof songId !== 'number') return;
      broadcast(roomCode, { type: 'PLAY_SONG', songId });
      return;
    }

    if (parsed.type === 'CHAT') {
      const content = typeof parsed.content === 'string' ? parsed.content.trim() : '';
      if (!content || content.length > MAX_CHAT_LENGTH) return;

      // Identity comes from the verified session, not the payload, so a
      // client can no longer post as somebody else.
      const row = {
        room_code: roomCode,
        email: identity.email,
        content,
        full_name: identity.full_name,
        avatar_url: identity.avatar_url
      };

      const { error } = await supabase.from('messages').insert([row]);
      if (error) {
        console.error('Error storing message:', error);
        return;
      }

      broadcast(roomCode, { type: 'CHAT', ...row, room_code: undefined });
      return;
    }
  });

  socket.on('close', () => {
    clearTimeout(authTimer);
    leaveRoom(roomCode, socket);
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearTimeout(authTimer);
    leaveRoom(roomCode, socket);
  });
});

console.log(`WebSocket server listening on :${PORT}`);
