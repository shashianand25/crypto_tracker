import { useState, useEffect } from 'react';
import { useWebSocketContext } from '../context/WebSocketContext';

export function useDataFreshness() {
  const { lastMessageTime, status } = useWebSocketContext();
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  useEffect(() => {
    if (!lastMessageTime || status !== 'CONNECTED') {
      setSecondsAgo(null);
      return;
    }

    const update = () => {
      const diffSec = Math.max(0, (Date.now() - lastMessageTime) / 1000);
      setSecondsAgo(Number(diffSec.toFixed(1)));
    };

    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [lastMessageTime, status]);

  return {
    secondsAgo,
    lastMessageTime,
    status,
  };
}
