import gameState from './gameState.js';
import { generateGifts } from './giftGenerator.js';
import { GAME_PHASES } from '../shared/types.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Send current game state to newly connected player
    gameState.getState().then(state => {
      socket.emit('game-state', state);
    }).catch(err => {
      console.error('Error getting initial game state:', err);
    });

    // Player joins with name and emoji
    socket.on('player-join', async ({ name, emoji }) => {
      try {
        const player = await gameState.addPlayer(socket.id, name, emoji);
        console.log(`Player joined: ${player.name} (${player.emoji})`);
        
        const state = await gameState.getState();
        io.emit('player-joined', {
          player: {
            id: player.id,
            name: player.name,
            emoji: player.emoji,
            gifts: player.gifts,
            isConnected: true
          },
          gameState: state
        });
      } catch (error) {
        console.error('Error adding player:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // Host starts the game
    socket.on('start-game', async () => {
      try {
        const state = await gameState.getState();
        
        if (state.hostId !== socket.id) {
          socket.emit('error', { message: 'Only the host can start the game' });
          return;
        }

        if (state.phase !== GAME_PHASES.LOBBY) {
          socket.emit('error', { message: 'Game already started' });
          return;
        }

        if (state.players.length < 2) {
          socket.emit('error', { message: 'Need at least 2 players to start' });
          return;
        }

        const gifts = await generateGifts(state.players.length);
        const started = await gameState.startGame(gifts);

        if (started) {
          console.log('Game started!');
          const updatedState = await gameState.getState();
          io.emit('game-started', {
            gifts,
            gameState: updatedState
          });
        }
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // Player opens a wrapped gift
    socket.on('open-gift', async ({ giftId }) => {
      try {
        const state = await gameState.getState();
        const currentPlayer = gameState.getCurrentPlayer();
        
        if (currentPlayer?.id !== socket.id) {
          socket.emit('error', { message: 'Not your turn' });
          return;
        }

        if (state.phase !== GAME_PHASES.PLAYING) {
          socket.emit('error', { message: 'Game not in progress' });
          return;
        }

        const gift = await gameState.openGift(giftId);
        
        if (gift) {
          const updatedState = await gameState.getState();
          io.emit('gift-opened', {
            gift,
            gameState: updatedState
          });
        } else {
          socket.emit('error', { message: 'Cannot open that gift' });
        }
      } catch (error) {
        console.error('Error opening gift:', error);
        socket.emit('error', { message: 'Failed to open gift' });
      }
    });

    // Player steals an opened gift
    socket.on('steal-gift', async ({ giftId }) => {
      try {
        const state = await gameState.getState();
        const currentPlayer = gameState.getCurrentPlayer();
        
        if (currentPlayer?.id !== socket.id) {
          socket.emit('error', { message: 'Not your turn' });
          return;
        }

        if (state.phase !== GAME_PHASES.PLAYING) {
          socket.emit('error', { message: 'Game not in progress' });
          return;
        }

        const gift = await gameState.stealGift(giftId);
        
        if (gift) {
          const updatedState = await gameState.getState();
          io.emit('gift-stolen', {
            gift,
            gameState: updatedState
          });
        } else {
          socket.emit('error', { message: 'Cannot steal that gift' });
        }
      } catch (error) {
        console.error('Error stealing gift:', error);
        socket.emit('error', { message: 'Failed to steal gift' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`Player disconnected: ${socket.id}`);
      try {
        await gameState.setPlayerConnected(socket.id, false);
        const state = await gameState.getState();
        
        // Only remove if game hasn't started
        if (state.phase === GAME_PHASES.LOBBY) {
          await gameState.removePlayer(socket.id);
          const updatedState = await gameState.getState();
          io.emit('player-left', {
            playerId: socket.id,
            gameState: updatedState
          });
        } else {
          // Just mark as disconnected during game
          io.emit('player-disconnected', {
            playerId: socket.id,
            gameState: state
          });
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
}
