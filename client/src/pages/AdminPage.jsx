import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GAME_PHASES } from '../../../shared/types.js';
import { useGameStatePusher } from '../hooks/useGameStatePusher';

// Use environment variable for backend URL, or fallback to relative/localhost
const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return `${import.meta.env.VITE_BACKEND_URL}/api/admin`;
  }
  return import.meta.env.PROD 
    ? '/api/admin'
    : 'http://localhost:3001/api/admin';
};

const API_BASE = getBackendUrl();
const ADMIN_PASSWORD = 'merrychristmas';

export default function AdminPage() {
  const navigate = useNavigate();
  const { gameState, startGame, connected } = useGameStatePusher();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', image: '', amazonUrl: '' });
  const [editingGift, setEditingGift] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', image: '', amazonUrl: '' });
  const [extractingImage, setExtractingImage] = useState(false);
  const [error, setError] = useState('');
  const [startingGame, setStartingGame] = useState(false);
  const [realtimeNotification, setRealtimeNotification] = useState(null);
  const prevPlayerCountRef = useRef(0);
  const passwordInputRef = useRef(null);

  // Listen for game state changes to clear loading state and track updates
  useEffect(() => {
    if (gameState?.phase === GAME_PHASES.PLAYING && startingGame) {
      setStartingGame(false);
      setError('');
    }
    // Track when game state updates
    if (gameState) {
      const now = new Date();
      const currentPlayerCount = gameState.players?.length || 0;
      
      // Check if a new player joined (real-time update)
      if (currentPlayerCount > prevPlayerCountRef.current && prevPlayerCountRef.current > 0) {
        const newPlayers = gameState.players.slice(prevPlayerCountRef.current);
        if (newPlayers.length > 0) {
          const newPlayer = newPlayers[0];
          setRealtimeNotification({
            message: `${newPlayer.emoji} ${newPlayer.name} joined!`,
            timestamp: now
          });
          // Clear notification after 3 seconds
          setTimeout(() => setRealtimeNotification(null), 3000);
        }
      }
      
      prevPlayerCountRef.current = currentPlayerCount;
      setLastUpdate(now);
      console.log('AdminPage - Game state updated:', {
        players: currentPlayerCount,
        playerNames: gameState.players?.map(p => p.name) || [],
        phase: gameState.phase,
        timestamp: now.toISOString(),
        connected: connected
      });
    }
  }, [gameState, startingGame, connected]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
      loadGifts();
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const loadGifts = async () => {
    try {
      const response = await fetch(`${API_BASE}/gifts`);
      if (!response.ok) {
        const text = await response.text();
        let errorMsg = `Failed to load gifts: ${response.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMsg = errorData.error || errorMsg;
        } catch {
          // Use default error message
        }
        throw new Error(errorMsg);
      }
      
      const text = await response.text();
      if (!text || text.trim() === '') {
        setGifts([]);
        return;
      }
      
      const data = JSON.parse(text);
      setGifts(data.gifts || []);
    } catch (err) {
      console.error('Failed to load gifts:', err);
      setError('Failed to load gifts: ' + err.message);
      // Set empty array on error so UI doesn't break
      setGifts([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadGifts();
    }
  }, [isAuthenticated]);

  const extractImageFromAmazon = async (amazonUrl) => {
    if (!amazonUrl || !amazonUrl.trim()) {
      setError('Please enter an Amazon product URL');
      return;
    }

    setExtractingImage(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/extract-amazon-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: amazonUrl.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to extract image');
      }

      const data = await response.json();
      setFormData({ ...formData, image: data.imageUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setExtractingImage(false);
    }
  };

  const extractImageFromAmazonEdit = async (amazonUrl) => {
    if (!amazonUrl || !amazonUrl.trim()) {
      setError('Please enter an Amazon product URL');
      return;
    }

    setExtractingImage(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/extract-amazon-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: amazonUrl.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to extract image');
      }

      const data = await response.json();
      setEditFormData({ ...editFormData, image: data.imageUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setExtractingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/gifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          image: formData.image.trim()
        })
      });

      // Check response status
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch {
          errorText = '';
        }
        
        let errorData;
        try {
          errorData = errorText ? JSON.parse(errorText) : {};
        } catch {
          throw new Error(`Server error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
        }
        throw new Error(errorData.error || `Failed to add gift: ${response.status}`);
      }

      // Parse response
      let responseText = '';
      try {
        responseText = await response.text();
      } catch (err) {
        console.error('Error reading response:', err);
        throw new Error('Failed to read server response');
      }
      
      if (!responseText || !responseText.trim()) {
        console.error('Empty response from server');
        throw new Error('Empty response from server');
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('Failed to parse JSON response:', parseErr, 'Response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }
      
      setGifts(data.gifts || []);
      setFormData({ name: '', image: '', amazonUrl: '' });
      setError('');
    } catch (err) {
      console.error('Error adding gift:', err);
      setError(err.message || 'Failed to add gift');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (gift) => {
    setEditingGift(gift.id);
    setEditFormData({ name: gift.name, image: gift.image || '', amazonUrl: '' });
    setError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/gifts/${editingGift}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          image: editFormData.image.trim()
        })
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          throw new Error(`Server error: ${response.status}`);
        }
        throw new Error(errorData.error || 'Failed to update gift');
      }

      const text = await response.text();
      if (!text) {
        await loadGifts();
        setEditingGift(null);
        setEditFormData({ name: '', image: '', amazonUrl: '' });
        return;
      }
      
      const data = JSON.parse(text);
      setGifts(data.gifts || []);
      setEditingGift(null);
      setEditFormData({ name: '', image: '', amazonUrl: '' });
      setError('');
    } catch (err) {
      console.error('Error updating gift:', err);
      setError(err.message || 'Failed to update gift');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (giftId) => {
    if (!confirm('Are you sure you want to delete this gift?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/gifts/${giftId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          throw new Error(`Server error: ${response.status}`);
        }
        throw new Error(errorData.error || 'Failed to delete gift');
      }

      const text = await response.text();
      if (!text) {
        await loadGifts();
        return;
      }
      
      const data = JSON.parse(text);
      setGifts(data.gifts || []);
    } catch (err) {
      console.error('Error deleting gift:', err);
      setError(err.message || 'Failed to delete gift');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL gifts? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/gifts`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          throw new Error(`Server error: ${response.status}`);
        }
        throw new Error(errorData.error || 'Failed to clear gifts');
      }

      const text = await response.text();
      if (!text) {
        setGifts([]);
        return;
      }
      
      const data = JSON.parse(text);
      setGifts(data.gifts || []);
    } catch (err) {
      console.error('Error clearing gifts:', err);
      setError(err.message || 'Failed to clear gifts');
    } finally {
      setLoading(false);
    }
  };

  // Password prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black bg-opacity-80 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-christmas-red to-christmas-green p-8 rounded-lg border-8 border-christmas-gold shadow-3d-strong max-w-md w-full">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-impact text-christmas-gold drop-shadow-lg">
              🔒 ADMIN ACCESS
            </h1>
            <button
              onClick={() => navigate('/')}
              className="text-christmas-gold text-3xl hover:text-white transition"
              title="Back to Game"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-christmas-gold font-impact text-lg mb-2">
                Enter Password
              </label>
              <input
                ref={passwordInputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded border-4 border-christmas-gold bg-white text-black font-impact text-xl"
                placeholder="Password"
                autoFocus
                style={{ pointerEvents: 'auto' }}
              />
              {passwordError && (
                <p className="text-red-300 font-impact text-sm mt-2">{passwordError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-christmas-gold text-christmas-red font-impact text-xl rounded border-4 border-white hover:bg-yellow-300 transition shadow-lg"
              style={{ pointerEvents: 'auto' }}
            >
              ACCESS ADMIN PORTAL
            </button>
          </form>
          
          <button
            onClick={() => navigate('/')}
            className="w-full mt-4 py-2 bg-christmas-red text-christmas-gold font-impact text-lg rounded border-4 border-christmas-gold hover:bg-red-800 transition shadow-lg"
          >
            ← Back to Game
          </button>
        </div>
      </div>
    );
  }

  // Main admin portal content
  return (
    <div className="min-h-screen bg-black bg-opacity-80 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-christmas-red to-christmas-green p-8 rounded-lg border-8 border-christmas-gold shadow-3d-strong mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-impact text-christmas-gold drop-shadow-lg">
              🎁 ADMIN PORTAL - GIFT MANAGEMENT
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-christmas-gold text-christmas-red font-impact text-lg rounded border-4 border-white hover:bg-yellow-300 transition shadow-lg"
              >
                🎮 Back to Game
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-600 text-white p-3 rounded border-4 border-white mb-4 font-impact">
              {error}
            </div>
          )}

          {realtimeNotification && (
            <div className="bg-green-600 text-white p-4 rounded border-4 border-christmas-gold mb-4 font-impact animate-pulse shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <span className="text-xl">{realtimeNotification.message}</span>
              </div>
            </div>
          )}

          {/* Start Session Button */}
          {startGame && gameState && (
            <div className="bg-white bg-opacity-20 p-6 rounded-lg border-4 border-christmas-gold mb-6">
              <h2 className="text-2xl font-impact text-christmas-gold mb-4">🎮 Game Session Control</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-impact text-christmas-gold">
                      Game Phase: <span className="text-white">{gameState.phase || 'Unknown'}</span>
                    </p>
                    <p className="text-lg font-impact text-christmas-gold">
                      Players Joined: <span className="text-white">{gameState.players?.length || 0}</span>
                    </p>
                    <p className="text-sm font-impact text-christmas-gold mt-2">
                      Connection: <span className={connected ? 'text-green-300' : 'text-red-300'}>
                        {connected ? '🟢 Connected (Real-time)' : '🔴 Disconnected'}
                      </span>
                    </p>
                    <p className="text-xs font-impact text-christmas-gold mt-1 opacity-75">
                      Last update: {lastUpdate.toLocaleTimeString()}
                      {connected && <span className="ml-2 text-green-300">⚡ Live</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (startGame) {
                        setStartingGame(true);
                        setError('');
                        startGame().catch(err => {
                          setError(err.message || 'Failed to start game');
                          setStartingGame(false);
                        });
                      }
                    }}
                    disabled={
                      startingGame ||
                      gameState.phase !== GAME_PHASES.LOBBY ||
                      (gameState.players?.length || 0) < 2
                    }
                    className="px-8 py-4 bg-gradient-to-r from-christmas-green to-christmas-red text-white font-impact text-xl rounded border-4 border-christmas-gold hover:from-green-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg transform hover:scale-105"
                    title={
                      startingGame
                        ? 'Starting game...'
                        : gameState.phase !== GAME_PHASES.LOBBY
                        ? 'Game already started'
                        : (gameState.players?.length || 0) < 2
                        ? 'Need at least 2 players to start'
                        : 'Start the game session'
                    }
                  >
                    {startingGame ? '⏳ Starting...' : '🚀 START SESSION'}
                  </button>
                </div>
                {gameState.phase === GAME_PHASES.LOBBY && (gameState.players?.length || 0) < 2 && (
                  <p className="text-sm text-christmas-gold font-impact">
                    ⚠️ Need at least 2 players to start the game
                  </p>
                )}
                {gameState.phase === GAME_PHASES.PLAYING && (
                  <p className="text-sm text-christmas-gold font-impact">
                    ✅ Game is currently in progress
                  </p>
                )}
                {gameState.players && gameState.players.length > 0 && (
                  <div className="mt-4 pt-4 border-t-2 border-christmas-gold border-opacity-30">
                    <p className="text-sm text-christmas-gold font-impact mb-2">Players in lobby:</p>
                    <div className="space-y-1">
                      {gameState.players.map((player) => (
                        <div key={player.id} className="flex items-center gap-2 bg-white bg-opacity-20 rounded px-2 py-1">
                          <span className="text-lg">{player.emoji}</span>
                          <span className="text-christmas-gold font-impact text-sm">{player.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Gift Form */}
          <div className="bg-white bg-opacity-20 p-6 rounded-lg border-4 border-christmas-gold mb-6">
            <h2 className="text-2xl font-impact text-christmas-gold mb-4">Add New Gift</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-christmas-gold font-impact text-lg mb-2">
                  Gift Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded border-4 border-christmas-gold bg-white text-black font-impact text-lg"
                  placeholder="e.g., Amazon Echo Dot"
                  required
                />
              </div>
              <div>
                <label className="block text-christmas-gold font-impact text-lg mb-2">
                  Amazon Product URL (Optional)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={formData.amazonUrl}
                    onChange={(e) => setFormData({ ...formData, amazonUrl: e.target.value })}
                    className="flex-1 px-4 py-2 rounded border-4 border-christmas-gold bg-white text-black font-impact text-lg"
                    placeholder="https://www.amazon.com/dp/B08..."
                  />
                  <button
                    type="button"
                    onClick={() => extractImageFromAmazon(formData.amazonUrl)}
                    disabled={extractingImage || !formData.amazonUrl.trim()}
                    className="px-4 py-2 bg-blue-600 text-white font-impact rounded border-4 border-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {extractingImage ? '⏳' : '🔍 Extract Image'}
                  </button>
                </div>
                  <div>
                    <label className="block text-christmas-gold font-impact text-sm mb-2">
                      Image URL (Auto-filled or paste manually)
                    </label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-4 py-2 rounded border-4 border-christmas-gold bg-white text-black font-impact text-lg"
                    placeholder="https://images-na.ssl-images-amazon.com/images/I/..."
                  />
                </div>
                <p className="text-sm text-christmas-gold mt-1">
                  Paste an Amazon product URL and click "Extract Image" to auto-fill, or paste image URL directly
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="w-full py-3 bg-christmas-gold text-christmas-red font-impact text-xl rounded border-4 border-white hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
              >
                {loading ? 'Adding...' : 'ADD GIFT'}
              </button>
            </form>
          </div>

          {/* Gift List */}
          <div className="bg-white bg-opacity-20 p-6 rounded-lg border-4 border-christmas-gold">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-impact text-christmas-gold">
                Current Gifts ({gifts.length})
              </h2>
              {gifts.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-red-600 text-white font-impact rounded border-2 border-white hover:bg-red-700 transition"
                >
                  Clear All
                </button>
              )}
            </div>

            {gifts.length === 0 ? (
              <p className="text-center text-christmas-gold font-impact text-lg py-8">
                No gifts added yet. Add your first gift above!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {gifts.map((gift) => (
                  <div key={gift.id}>
                    {editingGift === gift.id ? (
                      // Edit Mode
                      <div className="bg-white bg-opacity-95 border-4 border-christmas-gold rounded-lg p-4">
                        <form onSubmit={handleSaveEdit} className="space-y-3">
                          <div>
                            <label className="block text-christmas-red font-impact text-sm mb-1">
                              Gift Name *
                            </label>
                            <input
                              type="text"
                              value={editFormData.name}
                              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                              className="w-full px-3 py-2 rounded border-2 border-christmas-gold bg-white text-black font-impact text-sm"
                              placeholder="Gift name"
                              required
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-christmas-red font-impact text-sm mb-1">
                              Amazon Product URL (Optional)
                            </label>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="url"
                                value={editFormData.amazonUrl}
                                onChange={(e) => setEditFormData({ ...editFormData, amazonUrl: e.target.value })}
                                className="flex-1 px-3 py-2 rounded border-2 border-christmas-gold bg-white text-black font-impact text-sm"
                                placeholder="https://www.amazon.com/dp/B08..."
                              />
                              <button
                                type="button"
                                onClick={() => extractImageFromAmazonEdit(editFormData.amazonUrl)}
                                disabled={extractingImage || !editFormData.amazonUrl.trim()}
                                className="px-3 py-2 bg-blue-600 text-white font-impact text-xs rounded border-2 border-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                {extractingImage ? '⏳' : '🔍'}
                              </button>
                            </div>
                            <div>
                              <label className="block text-christmas-red font-impact text-xs mb-1">
                                Image URL
                              </label>
                              <input
                                type="url"
                                value={editFormData.image}
                                onChange={(e) => setEditFormData({ ...editFormData, image: e.target.value })}
                                className="w-full px-3 py-2 rounded border-2 border-christmas-gold bg-white text-black font-impact text-sm"
                                placeholder="Image URL"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 px-3 py-2 bg-christmas-gold text-christmas-red font-impact text-sm rounded border-2 border-white hover:bg-yellow-300 disabled:opacity-50 transition"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGift(null);
                                setEditFormData({ name: '', image: '', amazonUrl: '' });
                              }}
                              className="px-3 py-2 bg-gray-400 text-white font-impact text-sm rounded border-2 border-white hover:bg-gray-500 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      // Display Mode
                      <div className="bg-white bg-opacity-95 border-4 border-christmas-gold rounded-lg p-4 hover:shadow-lg transition">
                        <div className="flex items-start gap-4">
                          {gift.image && (
                            <img
                              src={gift.image}
                              alt={gift.name}
                              className="w-20 h-20 object-cover rounded border-2 border-christmas-gold"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-impact text-christmas-red text-lg mb-2">
                              {gift.name}
                            </h3>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(gift)}
                                className="px-3 py-1 bg-blue-500 text-white font-impact text-xs rounded border-2 border-white hover:bg-blue-600 transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(gift.id)}
                                className="px-3 py-1 bg-red-500 text-white font-impact text-xs rounded border-2 border-white hover:bg-red-600 transition"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

