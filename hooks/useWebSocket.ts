import { useEffect, useRef } from 'react';

const useWebSocket = (url: string, onMessage: (message: string) => void) => {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.current.onmessage = (event) => {
      onMessage(event.data);
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      ws.current?.close();
    };
  }, [url, onMessage]);

  const sendMessage = (message: string) => {
    ws.current?.send(message);
  };

  return sendMessage;
};

export default useWebSocket;