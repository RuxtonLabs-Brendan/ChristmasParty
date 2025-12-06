import { useEffect, useState, useRef } from 'react';
import Pusher from 'pusher-js';

// Get Pusher config from environment
const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY || '';
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'us3';

// Generate a unique player ID (stored in sessionStorage)
function getOrCreatePlayerId() {
  let playerId = sessionStorage.getItem('playerId');
  if (!playerId) {
    playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('playerId', playerId);
  }
  return playerId;
}

export function usePusher() {
  const [pusher, setPusher] = useState(null);
  const [channel, setChannel] = useState(null);
  const [connected, setConnected] = useState(false);
  const playerIdRef = useRef(null);

  useEffect(() => {
    if (!PUSHER_KEY) {
      console.error('PUSHER_KEY not set in environment variables');
      return;
    }

    // Get or create player ID
    playerIdRef.current = getOrCreatePlayerId();

    // Initialize Pusher
    const pusherInstance = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      encrypted: true
    });

    // Subscribe to game channel
    const gameChannel = pusherInstance.subscribe('game-channel');

    gameChannel.bind('pusher:subscription_succeeded', () => {
      console.log('Connected to Pusher channel');
      setConnected(true);
    });

    gameChannel.bind('pusher:subscription_error', (error) => {
      console.error('Pusher subscription error:', error);
      setConnected(false);
    });

    pusherInstance.connection.bind('connected', () => {
      console.log('Pusher connected');
      setConnected(true);
    });

    pusherInstance.connection.bind('disconnected', () => {
      console.log('Pusher disconnected');
      setConnected(false);
    });

    pusherInstance.connection.bind('error', (error) => {
      console.error('Pusher connection error:', error);
      setConnected(false);
    });

    setPusher(pusherInstance);
    setChannel(gameChannel);

    return () => {
      gameChannel.unbind_all();
      gameChannel.unsubscribe();
      pusherInstance.disconnect();
    };
  }, []);

  return { pusher, channel, connected, playerId: playerIdRef.current };
}

