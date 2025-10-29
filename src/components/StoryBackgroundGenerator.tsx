import { useState, useEffect } from 'react';
import { postJSON, getJSON } from '../lib/api';
import type { GenerateBackgroundRequest, GenerateBackgroundResponse, BackgroundData, SessionContext } from '../types/macro-chain';
import logger from '@/utils/logger';

const log = logger.background;

interface StoryBackgroundGeneratorProps {
  onBackgroundGenerated?: (background: BackgroundData) => void;
  onChainGenerated?: (request: any) => void;
  onLockToggle?: (locked: boolean) => void;
  loading?: boolean;
  sessionId?: string | null;
  isLocked?: boolean;
}

export default function StoryBackgroundGenerator({ onBackgroundGenerated, onChainGenerated, onLockToggle, loading = false, sessionId, isLocked = false }: StoryBackgroundGeneratorProps) {
  const [storyConcept, setStoryConcept] = useState('');
  const [numberOfPlayers, setNumberOfPlayers] = useState<number>(4);
  const [background, setBackground] = useState<BackgroundData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBackground, setEditingBackground] = useState<BackgroundData | null>(null);

  // Load existing background and lock state from context
  useEffect(() => {
    if (sessionId) {
      loadExistingData();
    }
  }, [sessionId]);

  const loadExistingData = async () => {
    if (!sessionId) return;

    try {
      const response = await getJSON<{ok: boolean, data: SessionContext}>('/api/context/get?sessionId=' + sessionId);
      
      if (response.ok && response.data) {
        // Load background
        if (response.data.blocks && response.data.blocks.background) {
          setBackground(response.data.blocks.background);
          // Load numberOfPlayers from existing background
          if (response.data.blocks.background.numberOfPlayers) {
            setNumberOfPlayers(response.data.blocks.background.numberOfPlayers);
          }
          onBackgroundGenerated?.(response.data.blocks.background);
        }
        
        // Lock state is now managed by parent component

        // Load story concept
        if (response.data.blocks && response.data.blocks.story_concept) {
          setStoryConcept(response.data.blocks.story_concept.concept || '');
        }
      }
    } catch (error) {
      log.error('Failed to load existing data:', error);
    }
  };

  const handleGenerateBackground = async () => {
    if (!storyConcept.trim()) {
      setError('Please enter a story concept first!');
      return;
    }

    if (!sessionId) {
      setError('No active session');
      return;
    }

    try {
      setError(null);
      setIsGenerating(true);

      // Store the story concept in context first
      await postJSON('/api/context/append', {
        sessionId,
        blockType: 'story_concept',
        data: {
          concept: storyConcept.trim(),
          timestamp: new Date().toISOString()
        }
      });

      const response = await postJSON<GenerateBackgroundResponse>('/api/generate_background', {
        sessionId,
        concept: storyConcept.trim(),
        meta: {
          numberOfPlayers: numberOfPlayers
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate background');
      }

      const newBackground = response.data.background;
      setBackground(newBackground);
      onBackgroundGenerated?.(newBackground);

      // Append to context
      await postJSON('/api/context/append', {
        sessionId,
        blockType: 'background',
        data: newBackground
      });

      log.info('Background generated and saved successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      log.error('Error generating background:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setStoryConcept('');
    setNumberOfPlayers(4);
    setBackground(null);
    setError(null);
  };

  const handleGenerateChain = async () => {
    if (!storyConcept.trim()) {
      setError('Please enter a story concept first!');
      return;
    }

    if (!sessionId) {
      setError('No active session');
      return;
    }

    // CRITICAL: Log when macro chain generation is triggered
    log.info('🚨 MACRO CHAIN GENERATION TRIGGERED:', {
      sessionId,
      storyConcept: storyConcept.trim(),
      background: !!background,
      characters: 'unknown', // We don't have access to characters state here
      timestamp: new Date().toISOString(),
      trigger: 'manual_button_click'
    });

    if (onChainGenerated) {
      onChainGenerated({
        concept: storyConcept.trim(),
        meta: { gameType: 'D&D', players: '4', level: '5' }
      });
    }
  };

  const lockBackground = async (locked: boolean) => {
    if (!sessionId) return;

    // CRITICAL: Log when background is being locked/unlocked
    log.info('🔒 BACKGROUND LOCK STATE CHANGING:', {
      sessionId,
      locked,
      background: !!background,
      storyConcept: !!storyConcept,
      timestamp: new Date().toISOString(),
      warning: 'This should NOT trigger automatic macro chain generation!'
    });

    try {
      await postJSON('/api/context/lock', {
        sessionId,
        blockType: 'background',
        locked
      });
      
      if (onLockToggle) {
        onLockToggle(locked);
      }
    } catch (error) {
      log.error('Failed to lock background:', error);
    }
  };

  const startEditing = () => {
    if (background) {
      setEditingBackground(JSON.parse(JSON.stringify(background)));
      setIsEditing(true);
    }
  };

  const saveEdit = async () => {
    if (!editingBackground || !sessionId) return;

    try {
      setIsGenerating(true);
      
      // Update the background
      setBackground(editingBackground);
      onBackgroundGenerated?.(editingBackground);

      // Update context
      await postJSON('/api/context/append', {
        sessionId,
        blockType: 'background',
        data: editingBackground
      });

      setIsEditing(false);
      setEditingBackground(null);
    } catch (error) {
      log.error('Failed to save background:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingBackground(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🎭 Story Concept & Background Generator</h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter your story concept below. You can generate a background for context-aware generation, or directly generate a macro chain.
        </p>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="storyConcept" className="block text-sm font-medium text-gray-700 mb-2">
              Story Concept
              {storyConcept && !isGenerating && !loading && (
                <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                  ✓ Loaded from context
                </span>
              )}
            </label>
            <textarea
              id="storyConcept"
              value={storyConcept}
              onChange={(e) => setStoryConcept(e.target.value)}
              placeholder="Enter your story concept here..."
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:border-blue-500 ${
                storyConcept && !isGenerating && !loading 
                  ? 'border-green-300 bg-green-50 focus:ring-green-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              rows={4}
              disabled={isGenerating || loading}
            />
            {storyConcept && !isGenerating && !loading && (
              <p className="mt-1 text-xs text-green-600">
                Story concept loaded from context. To modify, clear and re-enter.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="numberOfPlayers" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Players
            </label>
            <input
              type="number"
              id="numberOfPlayers"
              min="3"
              max="6"
              value={numberOfPlayers}
              onChange={(e) => setNumberOfPlayers(parseInt(e.target.value) || 4)}
              placeholder="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
              disabled={isGenerating || loading}
            />
            <p className="mt-1 text-xs text-gray-500">How many players will participate? (3-6 recommended)</p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleGenerateBackground}
              disabled={isGenerating || loading || !storyConcept.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? '⏳ Generating...' : '🚀 Generate Background'}
            </button>
            
            <button
              onClick={handleGenerateChain}
              disabled={loading || !storyConcept.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⛓️ Generate Chain
            </button>
            
            {background && (
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                🗑️ Clear
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
        </div>
      </div>

      {background && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">📖 Generated Story Background</h3>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <>
                  <button
                    onClick={() => lockBackground(!isLocked)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      isLocked
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {isLocked ? '🔒 Locked' : '🔓 Unlocked'}
                  </button>
                  <button
                    onClick={startEditing}
                    disabled={isLocked}
                    className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50 transition-colors"
                  >
                    Edit
                  </button>
                </>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={saveEdit}
                    disabled={isGenerating}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
                  >
                    {isGenerating ? 'Saving...' : 'Save'}
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
          
          {/* Background Premise */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-2">Premise</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              {isEditing && editingBackground ? (
                <textarea
                  value={editingBackground.premise}
                  onChange={(e) => setEditingBackground({...editingBackground, premise: e.target.value})}
                  className="w-full p-2 border border-blue-300 rounded text-gray-700 leading-relaxed resize-none"
                  rows={3}
                />
              ) : (
                <p className="text-gray-700 leading-relaxed">{background.premise}</p>
              )}
            </div>
          </div>

          {/* Background Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-gray-800 mb-2">🎭 Tone Rules</h5>
              {isEditing && editingBackground ? (
                <div className="space-y-2">
                  {editingBackground.tone_rules.map((rule, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) => {
                          const newRules = [...editingBackground.tone_rules];
                          newRules[index] = e.target.value;
                          setEditingBackground({...editingBackground, tone_rules: newRules});
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => {
                          const newRules = editingBackground.tone_rules.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, tone_rules: newRules});
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingBackground({
                        ...editingBackground,
                        tone_rules: [...editingBackground.tone_rules, '']
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Tone Rule
                  </button>
                </div>
              ) : (
                <ul className="text-sm text-gray-700 space-y-1">
                  {background.tone_rules.map((rule, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="font-medium text-gray-800 mb-2">⚡ Stakes</h5>
              {isEditing && editingBackground ? (
                <div className="space-y-2">
                  {editingBackground.stakes.map((stake, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={stake}
                        onChange={(e) => {
                          const newStakes = [...editingBackground.stakes];
                          newStakes[index] = e.target.value;
                          setEditingBackground({...editingBackground, stakes: newStakes});
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => {
                          const newStakes = editingBackground.stakes.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, stakes: newStakes});
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingBackground({
                        ...editingBackground,
                        stakes: [...editingBackground.stakes, '']
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Stake
                  </button>
                </div>
              ) : (
                <ul className="text-sm text-gray-700 space-y-1">
                  {background.stakes.map((stake, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {stake}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="font-medium text-gray-800 mb-2">🔍 Mysteries</h5>
              {isEditing && editingBackground ? (
                <div className="space-y-2">
                  {editingBackground.mysteries.map((mystery, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={mystery}
                        onChange={(e) => {
                          const newMysteries = [...editingBackground.mysteries];
                          newMysteries[index] = e.target.value;
                          setEditingBackground({...editingBackground, mysteries: newMysteries});
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => {
                          const newMysteries = editingBackground.mysteries.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, mysteries: newMysteries});
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingBackground({
                        ...editingBackground,
                        mysteries: [...editingBackground.mysteries, '']
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Mystery
                  </button>
                </div>
              ) : (
                <ul className="text-sm text-gray-700 space-y-1">
                  {background.mysteries.map((mystery, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {mystery}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="font-medium text-gray-800 mb-2">🏛️ Factions</h5>
              {isEditing && editingBackground ? (
                <div className="space-y-2">
                  {editingBackground.factions.map((faction, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={faction}
                        onChange={(e) => {
                          const newFactions = [...editingBackground.factions];
                          newFactions[index] = e.target.value;
                          setEditingBackground({...editingBackground, factions: newFactions});
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => {
                          const newFactions = editingBackground.factions.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, factions: newFactions});
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingBackground({
                        ...editingBackground,
                        factions: [...editingBackground.factions, '']
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Faction
                  </button>
                </div>
              ) : (
                <ul className="text-sm text-gray-700 space-y-1">
                  {background.factions.map((faction, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {faction}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="font-medium text-gray-800 mb-2">📍 Locations</h5>
              {isEditing && editingBackground ? (
                <div className="space-y-2">
                  {editingBackground.location_palette.map((location, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => {
                          const newLocations = [...editingBackground.location_palette];
                          newLocations[index] = e.target.value;
                          setEditingBackground({...editingBackground, location_palette: newLocations});
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => {
                          const newLocations = editingBackground.location_palette.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, location_palette: newLocations});
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingBackground({
                        ...editingBackground,
                        location_palette: [...editingBackground.location_palette, '']
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Location
                  </button>
                </div>
              ) : (
                <ul className="text-sm text-gray-700 space-y-1">
                  {background.location_palette.map((location, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {location}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="font-medium text-gray-800 mb-2">👥 NPCs</h5>
              {isEditing && editingBackground ? (
                <div className="space-y-2">
                  {editingBackground.npc_roster_skeleton.map((npc, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={npc}
                        onChange={(e) => {
                          const newNpcs = [...editingBackground.npc_roster_skeleton];
                          newNpcs[index] = e.target.value;
                          setEditingBackground({...editingBackground, npc_roster_skeleton: newNpcs});
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => {
                          const newNpcs = editingBackground.npc_roster_skeleton.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, npc_roster_skeleton: newNpcs});
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingBackground({
                        ...editingBackground,
                        npc_roster_skeleton: [...editingBackground.npc_roster_skeleton, '']
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add NPC
                  </button>
                </div>
              ) : (
                <ul className="text-sm text-gray-700 space-y-1">
                  {background.npc_roster_skeleton.map((npc, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {npc}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="font-medium text-gray-800 mb-2">🎨 Motifs</h5>
              {isEditing && editingBackground ? (
                <div className="space-y-2">
                  {editingBackground.motifs.map((motif, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={motif}
                        onChange={(e) => {
                          const newMotifs = [...editingBackground.motifs];
                          newMotifs[index] = e.target.value;
                          setEditingBackground({...editingBackground, motifs: newMotifs});
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => {
                          const newMotifs = editingBackground.motifs.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, motifs: newMotifs});
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingBackground({
                        ...editingBackground,
                        motifs: [...editingBackground.motifs, '']
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Motif
                  </button>
                </div>
              ) : (
                <ul className="text-sm text-gray-700 space-y-1">
                  {background.motifs.map((motif, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {motif}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="font-medium text-gray-800 mb-2">🚫 Do Nots</h5>
              {isEditing && editingBackground ? (
                <div className="space-y-2">
                  {editingBackground.doNots.map((doNot, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={doNot}
                        onChange={(e) => {
                          const newDoNots = [...editingBackground.doNots];
                          newDoNots[index] = e.target.value;
                          setEditingBackground({...editingBackground, doNots: newDoNots});
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => {
                          const newDoNots = editingBackground.doNots.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, doNots: newDoNots});
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingBackground({
                        ...editingBackground,
                        doNots: [...editingBackground.doNots, '']
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Do Not
                  </button>
                </div>
              ) : (
                <ul className="text-sm text-gray-700 space-y-1">
                  {background.doNots.map((doNot, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {doNot}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="font-medium text-gray-800 mb-2">🎮 Playstyle Implications</h5>
              {isEditing && editingBackground ? (
                <div className="space-y-2">
                  {editingBackground.playstyle_implications.map((implication, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={implication}
                        onChange={(e) => {
                          const newImplications = [...editingBackground.playstyle_implications];
                          newImplications[index] = e.target.value;
                          setEditingBackground({...editingBackground, playstyle_implications: newImplications});
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => {
                          const newImplications = editingBackground.playstyle_implications.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, playstyle_implications: newImplications});
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingBackground({
                        ...editingBackground,
                        playstyle_implications: [...editingBackground.playstyle_implications, '']
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Playstyle Implication
                  </button>
                </div>
              ) : (
                <ul className="text-sm text-gray-700 space-y-1">
                  {background.playstyle_implications.map((implication, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {implication}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}