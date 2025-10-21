import { useState, useEffect } from 'react';
import { postJSON, getJSON } from '../lib/api';
import logger from '@/utils/logger';

const log = logger.background;

interface BackgroundData {
  premise: string;
  tone_rules: string[];
  stakes: string[];
  mysteries: string[];
  factions: string[];
  location_palette: string[];
  npc_roster_skeleton: string[];
  motifs: string[];
  doNots: string[];
  playstyle_implications: string[];
  numberOfPlayers?: number;
}

interface BackgroundPanelProps {
  sessionId: string | null;
  onBackgroundUpdate?: (background: BackgroundData | null) => void;
  onLockToggle?: (locked: boolean) => void;
  currentIsLocked?: boolean;
  loading?: boolean;
}

export default function BackgroundPanel({ sessionId, onBackgroundUpdate, onLockToggle, currentIsLocked: externalIsLocked, loading: externalLoading }: BackgroundPanelProps) {
  const [background, setBackground] = useState<BackgroundData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Use external props when available
  const currentLoading = externalLoading !== undefined ? externalLoading : loading;
  const currentIsLocked = externalIsLocked !== undefined ? externalIsLocked : isLocked;
  
  const [editingBackground, setEditingBackground] = useState<BackgroundData | null>(null);
  const [showJson, setShowJson] = useState(false);

  // Load existing background on mount
  useEffect(() => {
    if (sessionId) {
      loadBackground();
    }
  }, [sessionId]);

  // Sync external lock state
  useEffect(() => {
    if (externalIsLocked !== undefined) {
      setIsLocked(externalIsLocked);
    }
  }, [externalIsLocked]);

  const loadBackground = async () => {
    if (!sessionId) return;

    try {
      const response = await getJSON(`/api/context/get?sessionId=${sessionId}`);
      if (response.ok && response.data?.blocks?.background) {
        setBackground(response.data.blocks.background);
        setIsLocked(response.data.locks?.background || false);
        if (onBackgroundUpdate) {
          onBackgroundUpdate(response.data.blocks.background);
        }
      }
    } catch (error) {
      log.error('Failed to load background:', error);
    }
  };

  const generateBackground = async (concept: string, meta?: any) => {
    if (!sessionId) {
      setError('No active session');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const response = await postJSON('/api/generate_background', {
        sessionId,
        concept,
        meta
      });

      if (!response.ok) {
        throw new Error('Failed to generate background');
      }

      const newBackground = response.data.background;
      setBackground(newBackground);

      // Append to context
      await postJSON('/api/context/append', {
        sessionId,
        blockType: 'background',
        data: newBackground
      });

      if (onBackgroundUpdate) {
        onBackgroundUpdate(newBackground);
      }

      // Show success message
      log.info('Background generated and saved successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      log.error('Error generating background:', err);
    } finally {
      setLoading(false);
    }
  };

  const lockBackground = async (locked: boolean) => {
    if (!sessionId) return;

    try {
      await postJSON('/api/context/lock', {
        sessionId,
        blockType: 'background',
        locked
      });
      setIsLocked(locked);
      // Call external callback if provided
      if (onLockToggle) {
        onLockToggle(locked);
      }
    } catch (error) {
      log.error('Failed to lock background:', error);
    }
  };

  const startEditing = () => {
    if (background) {
      setEditingBackground(JSON.parse(JSON.stringify(background))); // Deep copy
      setIsEditing(true);
    }
  };

  const saveEdit = async () => {
    if (!sessionId || !editingBackground) return;

    try {
      setLoading(true);

      // Update context
      await postJSON('/api/context/append', {
        sessionId,
        blockType: 'background',
        data: editingBackground
      });

      setBackground(editingBackground);
      if (onBackgroundUpdate) {
        onBackgroundUpdate(editingBackground);
      }
      setIsEditing(false);
      setEditingBackground(null);
    } catch (error) {
      log.error('Failed to save background edit:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingBackground(null);
  };

  const deleteBackground = async () => {
    if (!sessionId || !confirm('Are you sure you want to delete the background?')) return;

    try {
      // Clear the background block
      await postJSON('/api/context/append', {
        sessionId,
        blockType: 'background',
        data: null
      });

      setBackground(null);
      setIsLocked(false);
      if (onBackgroundUpdate) {
        onBackgroundUpdate(null);
      }
    } catch (error) {
      log.error('Failed to delete background:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Story Background</h3>
          <p className="text-sm text-gray-600">
            Generate and manage the story background for context-aware generation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {background && !isEditing && (
            <>
              <button
                onClick={() => lockBackground(!currentIsLocked)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  currentIsLocked
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {currentIsLocked ? '🔒 Locked' : '🔓 Unlocked'}
              </button>
              <button
                onClick={startEditing}
                disabled={currentIsLocked}
                className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setShowJson(!showJson)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                {showJson ? 'Hide JSON' : 'Show JSON'}
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={saveEdit}
                disabled={currentLoading}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
              >
                {currentLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {background && (
        <div className="space-y-4">
          {!showJson ? (
            isEditing ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-yellow-900 mb-3">Edit Background</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premise</label>
                      <textarea
                        value={editingBackground?.premise || ''}
                        onChange={(e) => setEditingBackground({
                          ...editingBackground!,
                          premise: e.target.value
                        })}
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of Players</label>
                      <input
                        type="number"
                        min="3"
                        max="6"
                        value={editingBackground?.numberOfPlayers || 4}
                        onChange={(e) => setEditingBackground({
                          ...editingBackground!,
                          numberOfPlayers: parseInt(e.target.value) || 4
                        })}
                        placeholder="4"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">How many players will participate? (3-6 recommended)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tone Rules (one per line)</label>
                      <textarea
                        value={editingBackground?.tone_rules?.join('\n') || ''}
                        onChange={(e) => setEditingBackground({
                          ...editingBackground!,
                          tone_rules: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stakes (one per line)</label>
                      <textarea
                        value={editingBackground?.stakes?.join('\n') || ''}
                        onChange={(e) => setEditingBackground({
                          ...editingBackground!,
                          stakes: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mysteries (one per line)</label>
                      <textarea
                        value={editingBackground?.mysteries?.join('\n') || ''}
                        onChange={(e) => setEditingBackground({
                          ...editingBackground!,
                          mysteries: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Factions (one per line)</label>
                      <textarea
                        value={editingBackground?.factions?.join('\n') || ''}
                        onChange={(e) => setEditingBackground({
                          ...editingBackground!,
                          factions: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location Palette (one per line)</label>
                      <textarea
                        value={editingBackground?.location_palette?.join('\n') || ''}
                        onChange={(e) => setEditingBackground({
                          ...editingBackground!,
                          location_palette: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NPC Roster (one per line)</label>
                      <textarea
                        value={editingBackground?.npc_roster_skeleton?.join('\n') || ''}
                        onChange={(e) => setEditingBackground({
                          ...editingBackground!,
                          npc_roster_skeleton: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motifs (one per line)</label>
                      <textarea
                        value={editingBackground?.motifs?.join('\n') || ''}
                        onChange={(e) => setEditingBackground({
                          ...editingBackground!,
                          motifs: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Do Nots (one per line)</label>
                      <textarea
                        value={editingBackground?.doNots?.join('\n') || ''}
                        onChange={(e) => setEditingBackground({
                          ...editingBackground!,
                          doNots: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Playstyle Implications (one per line)</label>
                      <textarea
                        value={editingBackground?.playstyle_implications?.join('\n') || ''}
                        onChange={(e) => setEditingBackground({
                          ...editingBackground!,
                          playstyle_implications: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-blue-900 mb-2">Premise</h4>
                  <p className="text-blue-800">{background.premise}</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-green-900 mb-2">Number of Players</h4>
                  <p className="text-green-800">{background.numberOfPlayers || 4} players</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Tone Rules</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {background.tone_rules.map((rule, index) => (
                        <li key={index}>• {rule}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Stakes</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {background.stakes.map((stake, index) => (
                        <li key={index}>• {stake}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Mysteries</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {background.mysteries.map((mystery, index) => (
                        <li key={index}>• {mystery}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Factions</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {background.factions.map((faction, index) => (
                        <li key={index}>• {faction}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Locations</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {background.location_palette.map((location, index) => (
                        <li key={index}>• {location}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">NPCs</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {background.npc_roster_skeleton.map((npc, index) => (
                        <li key={index}>• {npc}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Motifs</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {background.motifs.map((motif, index) => (
                        <li key={index}>• {motif}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Do Nots</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {background.doNots.map((doNot, index) => (
                        <li key={index}>• {doNot}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Playstyle Implications</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {background.playstyle_implications.map((implication, index) => (
                        <li key={index}>• {implication}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">JSON Output</h4>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-green-400 text-sm whitespace-pre-wrap">
                  {JSON.stringify(background, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded ${
                  currentIsLocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {currentIsLocked ? '🔒 Locked' : '🔓 Unlocked'}
                </span>
              </div>
              <button
                onClick={deleteBackground}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Delete Background
              </button>
            </div>
          )}
        </div>
      )}

      {!background && !currentLoading && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Background Generated</h3>
          <p className="text-gray-600">
            Generate a background from your story concept to enable background-aware chain and scene generation.
          </p>
        </div>
      )}
    </div>
  );
}

// Export the generateBackground function for use by other components
export { BackgroundPanel };
