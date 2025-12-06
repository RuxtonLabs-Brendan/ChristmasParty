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
    console.log('usePusher: Initializing...');
    console.log('PUSHER_KEY:', PUSHER_KEY ? 'Set' : 'NOT SET');
    console.log('PUSHER_CLUSTER:', PUSHER_CLUSTER);
    
    if (!PUSHER_KEY) {
      console.error('❌ PUSHER_KEY not set in environment variables');
      console.error('Make sure VITE_PUSHER_KEY is set in Vercel environment variables');
      return;
    }

    // Get or create player ID
    playerIdRef.current = getOrCreatePlayerId();
    console.log('Player ID:', playerIdRef.current);

    // Initialize Pusher
    console.log('Initializing Pusher with key:', PUSHER_KEY.substring(0, 10) + '...');
    const pusherInstance = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      encrypted: true
    });

    // Subscribe to game channel
    console.log('Subscribing to game-channel...');
    const gameChannel = pusherInstance.subscribe('game-channel');

    gameChannel.bind('pusher:subscription_succeeded', () => {
      console.log('✅ Connected to Pusher channel: game-channel');
      setConnected(true);
    });

    gameChannel.bind('pusher:subscription_error', (error) => {
      console.error('❌ Pusher subscription error:', error);
      setConnected(false);
    });

    pusherInstance.connection.bind('connected', () => {
      console.log('✅ Pusher connection established');
      setConnected(true);
    });

    pusherInstance.connection.bind('disconnected', () => {
      console.log('⚠️ Pusher disconnected');
      setConnected(false);
    });

    pusherInstance.connection.bind('error', (error) => {
      console.error('❌ Pusher connection error:', error);
      setConnected(false);
    });

    pusherInstance.connection.bind('state_change', (states) => {
      console.log('Pusher state changed:', states.previous, '->', states.current);
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

