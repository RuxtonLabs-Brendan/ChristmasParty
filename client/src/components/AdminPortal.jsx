import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Use relative URL in production, localhost in development
const API_BASE = import.meta.env.PROD 
  ? '/api/admin'
  : 'http://localhost:3001/api/admin';
const ADMIN_PASSWORD = 'merrychristmas';

export default function AdminPortal({ onClose }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', image: '', amazonUrl: '' });
  const [editingGift, setEditingGift] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', image: '', amazonUrl: '' });
  const [extractingImage, setExtractingImage] = useState(false);
  const [error, setError] = useState('');
  const passwordInputRef = useRef(null);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const loadGifts = async () => {
    try {
      const response = await fetch(`${API_BASE}/gifts`);
      const data = await response.json();
      setGifts(data.gifts || []);
    } catch (err) {
      console.error('Failed to load gifts:', err);
      setError('Failed to load gifts');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadGifts();
    } else {
      // Focus password input when modal opens
      setTimeout(() => {
        if (passwordInputRef.current) {
          passwordInputRef.current.focus();
        }
      }, 100);
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add gift');
      }

      const data = await response.json();
      setGifts(data.gifts);
      setFormData({ name: '', image: '', amazonUrl: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (gift) => {
    setEditingGift(gift.id);
    setEditFormData({ name: gift.name, image: gift.image || '', amazonUrl: '' });
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingGift(null);
    setEditFormData({ name: '', image: '', amazonUrl: '' });
    setError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!editingGift) return;
    
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
        const data = await response.json();
        throw new Error(data.error || 'Failed to update gift');
      }

      const data = await response.json();
      setGifts(data.gifts);
      setEditingGift(null);
      setEditFormData({ name: '', image: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (giftId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this gift?')) return;

    try {
      const response = await fetch(`${API_BASE}/gifts/${giftId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete gift');

      const data = await response.json();
      setGifts(data.gifts);
      if (editingGift === giftId) {
        setEditingGift(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL gifts? This cannot be undone.')) return;

    try {
      const response = await fetch(`${API_BASE}/gifts`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to clear gifts');

      const data = await response.json();
      setGifts(data.gifts);
    } catch (err) {
      setError(err.message);
    }
  };

  // Password prompt if not authenticated
  if (!isAuthenticated) {
    const passwordModal = (
      <div 
        className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center" 
        style={{ zIndex: 99999, pointerEvents: 'auto' }}
        onClick={(e) => {
          // Close if clicking backdrop
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-gradient-to-br from-christmas-red to-christmas-green p-8 rounded-lg border-8 border-christmas-gold shadow-3d-strong max-w-md w-full relative" 
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-impact text-christmas-gold drop-shadow-lg">
              🔒 ADMIN ACCESS
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-christmas-gold text-christmas-red font-impact text-lg rounded border-4 border-white hover:bg-yellow-300 transition shadow-lg"
                type="button"
              >
                🎮 Back to Game
              </button>
              <button
                onClick={onClose}
                className="text-christmas-gold text-3xl hover:text-white transition"
                type="button"
                title="Close"
              >
                ✕
              </button>
            </div>
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit(e)}
                className="w-full px-4 py-3 rounded border-4 border-christmas-gold bg-white text-black font-impact text-xl"
                placeholder="Password"
                autoFocus
                style={{ cursor: 'text' }}
              />
              {passwordError && (
                <p className="text-red-300 font-impact text-sm mt-2">{passwordError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-christmas-gold text-christmas-red font-impact text-xl rounded border-4 border-white hover:bg-yellow-300 transition shadow-lg"
            >
              ACCESS ADMIN PORTAL
            </button>
          </form>
        </div>
      </div>
    );
    
    return createPortal(passwordModal, document.body);
  }

  const adminModal = (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center overflow-y-auto p-4" style={{ zIndex: 99999, pointerEvents: 'auto' }}>
      <div className="bg-gradient-to-br from-christmas-red to-christmas-green p-8 rounded-lg border-8 border-christmas-gold shadow-3d-strong max-w-4xl w-full my-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-impact text-christmas-gold drop-shadow-lg">
            🎁 ADMIN PORTAL - GIFT MANAGEMENT
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-christmas-gold text-christmas-red font-impact text-lg rounded border-4 border-white hover:bg-yellow-300 transition shadow-lg"
            >
              🎮 Back to Game
            </button>
            <button
              onClick={onClose}
              className="text-christmas-gold text-3xl hover:text-white transition"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded border-4 border-white mb-4 font-impact">
            {error}
          </div>
        )}

        {/* Add Gift Form */}
        <div className="bg-white bg-opacity-90 p-6 rounded-lg border-4 border-christmas-gold mb-6">
          <h2 className="text-2xl font-impact text-christmas-red mb-4">Add New Gift</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-christmas-red font-impact text-lg mb-2">
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
              <label className="block text-christmas-red font-impact text-lg mb-2">
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
                <label className="block text-christmas-red font-impact text-sm mb-2">
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
              <p className="text-sm text-gray-600 mt-1">
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
        <div className="bg-white bg-opacity-90 p-6 rounded-lg border-4 border-christmas-gold">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-impact text-christmas-red">
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
            <p className="text-center text-gray-600 font-impact text-lg py-8">
              No gifts added yet. Add your first gift above!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {gifts.map((gift) => (
                <div key={gift.id}>
                  {editingGift === gift.id ? (
                    // Edit Mode
                    <div 
                      className="bg-white border-4 border-christmas-gold rounded-lg p-4"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                            onClick={(e) => e.stopPropagation()}
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
                              onClick={(e) => e.stopPropagation()}
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
                            <label className="block text-christmas-red font-impact text-sm mb-1">
                              Image URL
                            </label>
                            <input
                              type="url"
                              value={editFormData.image}
                              onChange={(e) => setEditFormData({ ...editFormData, image: e.target.value })}
                              className="w-full px-3 py-2 rounded border-2 border-christmas-gold bg-white text-black font-impact text-sm"
                              placeholder="https://..."
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={loading || !editFormData.name.trim()}
                            className="flex-1 px-3 py-2 bg-christmas-gold text-christmas-red font-impact text-sm rounded border-2 border-white hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            {loading ? 'Saving...' : '💾 Save'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={loading}
                            className="px-3 py-2 bg-gray-400 text-white font-impact text-sm rounded border-2 border-white hover:bg-gray-500 disabled:opacity-50 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    // Display Mode
                    <div
                      onClick={() => handleEdit(gift)}
                      className="bg-white border-4 border-christmas-gold rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-yellow-50 transition-all hover:shadow-lg hover:border-yellow-400"
                      title="Click to edit"
                    >
                      {gift.image && (
                        <img
                          src={gift.image}
                          alt={gift.name}
                          className="w-20 h-20 object-cover rounded border-2 border-christmas-gold flex-shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-impact text-christmas-red text-lg truncate">{gift.name}</h3>
                        {gift.image && (
                          <p className="text-xs text-gray-500 truncate" title={gift.image}>
                            {gift.image}
                          </p>
                        )}
                        {!gift.image && (
                          <p className="text-xs text-gray-400 italic">No image</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => handleEdit(gift)}
                          className="text-blue-600 hover:text-blue-800 text-lg font-bold px-2"
                          title="Edit gift"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => handleDelete(gift.id, e)}
                          className="text-red-600 hover:text-red-800 text-xl font-bold px-2"
                          title="Delete gift"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-christmas-gold font-impact">
          <p className="text-lg">
            💡 Tip: Add gifts equal to the number of players for best gameplay!
          </p>
        </div>
      </div>
    </div>
  );
  
  return createPortal(adminModal, document.body);
}

