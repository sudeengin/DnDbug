import { useState, useEffect } from 'react';
import { postJSON, getJSON } from '../lib/api';
import type { GenerateBackgroundRequest, GenerateBackgroundResponse, BackgroundData, SessionContext } from '../types/macro-chain';
import logger from '@/utils/logger';
import { Lock, Unlock } from 'lucide-react';

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
      {/* Story Concept & Background Generator Card */}
      <div className="bg-[#151A22] border border-[#2A3340] rounded-[16px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
        <h2 className="text-[20px] leading-[28px] font-semibold text-[#F0F4F8] mb-2">Story Concept & Background Generator</h2>
        <p className="text-[14px] leading-[22px] text-[#A9B4C4] mb-6">
          Enter your story concept below. You can generate a background for context-aware generation, or directly generate a macro chain.
        </p>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="storyConcept" className="block text-[14px] leading-[20px] font-medium text-[#F0F4F8] mb-2">
              Story Concept
              {storyConcept && !isGenerating && !loading && (
                <span className="ml-2 text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full border border-green-500/30">
                  Loaded from context
                </span>
              )}
            </label>
            <textarea
              id="storyConcept"
              value={storyConcept}
              onChange={(e) => setStoryConcept(e.target.value)}
              placeholder="Enter your story concept here..."
              className={`w-full px-4 py-2 bg-[#1E1D2A] border border-[#2A3340] rounded-[12px] text-[#F0F4F8] placeholder-[#A9B4C4] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)] focus:border-[#2A3340] transition-all duration-200 ${
                storyConcept && !isGenerating && !loading 
                  ? 'border-green-500/50 bg-green-500/5' 
                  : ''
              }`}
              rows={4}
              disabled={isGenerating || loading}
            />
            {storyConcept && !isGenerating && !loading && (
              <p className="mt-2 text-xs text-green-400">
                Story concept loaded from context. To modify, clear and re-enter.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="numberOfPlayers" className="block text-[14px] leading-[20px] font-medium text-[#F0F4F8] mb-2">
              Number of Players
            </label>
            <input
              type="number"
              id="numberOfPlayers"
              min="1"
              max="6"
              value={numberOfPlayers}
              onChange={(e) => setNumberOfPlayers(parseInt(e.target.value) || 4)}
              placeholder="4"
              className="w-full px-4 py-2 bg-[#1E1D2A] border border-[#2A3340] rounded-[12px] text-[#F0F4F8] placeholder-[#A9B4C4] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)] focus:border-[#2A3340] transition-all duration-200"
              disabled={isGenerating || loading}
            />
            <p className="mt-2 text-xs text-[#A9B4C4] opacity-75">How many players will participate? (3–6 recommended)</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGenerateBackground}
              disabled={isGenerating || loading || !storyConcept.trim() || isLocked}
              className="px-6 py-2 bg-[#3B82F6] text-white rounded-[12px] font-semibold hover:bg-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              {isGenerating ? 'Generating...' : 'Generate Background'}
            </button>
            
            <button
              onClick={handleGenerateChain}
              disabled={loading || !storyConcept.trim()}
              className="px-6 py-2 bg-[#10B981] text-white rounded-[12px] font-semibold hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-[rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              Generate Chain
            </button>
            
            {background && (
              <button
                onClick={handleClear}
                className="px-6 py-2 bg-[#374151] text-white rounded-[12px] font-semibold hover:bg-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[rgba(55,65,81,0.3)] transition-all duration-200 shadow-sm"
              >
                Clear
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-[12px] p-4">
              <div className="text-sm text-red-300">{error}</div>
            </div>
          )}
        </div>
      </div>

      {background && (
        <div className="bg-[#151A22] border border-[#2A3340] rounded-[16px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[20px] leading-[28px] font-semibold text-[#F0F4F8]">Generated Story Background</h3>
            <div className="flex items-center space-x-3">
              {!isEditing && (
                <>
                  <button
                    onClick={() => lockBackground(!isLocked)}
                    disabled={loading}
                    className={`px-3 py-1 text-sm font-medium rounded-[12px] flex items-center gap-2 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLocked
                        ? 'bg-[#374151] text-white border border-[#4B5563] hover:shadow-[0_2px_6px_rgba(0,0,0,0.2)]'
                        : 'bg-[#16a34a] text-white border border-[#15803d] hover:shadow-[0_2px_6px_rgba(0,0,0,0.2)]'
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Locked</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Unlocked</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={startEditing}
                    disabled={isLocked}
                    className="px-4 py-2 text-sm bg-[#374151] text-[#F0F4F8] rounded-[12px] hover:bg-[#4B5563] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
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
                    className="px-4 py-2 text-sm bg-[#10B981] text-white rounded-[12px] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    {isGenerating ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-sm bg-[#374151] text-[#F0F4F8] rounded-[12px] hover:bg-[#4B5563] transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Background Premise */}
          <div className="mb-6">
            <h4 className="text-[16px] leading-[24px] font-medium text-[#F0F4F8] mb-3">Premise</h4>
            <div className="bg-[#1D1E29] border border-[#2A3340] rounded-[12px] p-4">
              {isEditing && editingBackground ? (
                <textarea
                  value={editingBackground.premise}
                  onChange={(e) => setEditingBackground({...editingBackground, premise: e.target.value})}
                  className="w-full p-3 border border-[#2A3340] rounded-[8px] text-[#F0F4F8] bg-[#151420] placeholder-[#A9B4C4] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)] leading-relaxed resize-none"
                  rows={3}
                />
              ) : (
                <p className="text-[#F0F4F8] leading-relaxed">{background.premise}</p>
              )}
            </div>
          </div>

          {/* Background Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="text-[16px] leading-[24px] font-semibold text-[#F0F4F8] mb-3">
                Tone Rules
              </h5>
              {isEditing && editingBackground ? (
                <div className="space-y-3">
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
                        className="flex-1 px-3 py-2 border border-[#2A3340] rounded-[8px] text-[#F0F4F8] bg-[#1D1E29] placeholder-[#A9B4C4] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)] text-sm"
                      />
                      <button
                        onClick={() => {
                          const newRules = editingBackground.tone_rules.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, tone_rules: newRules});
                        }}
                        className="text-red-400 hover:text-red-300 text-sm p-1 rounded hover:bg-red-500/10 transition-colors"
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
                    className="text-sm text-[#3B82F6] hover:text-[#2563EB] px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                  >
                    + Add Tone Rule
                  </button>
                </div>
              ) : (
                <ul className="text-[14px] leading-[22px] text-[#F0F4F8] space-y-2">
                  {background.tone_rules.map((rule, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-[#A9B4C4] mr-3 mt-1">•</span>
                      <span className="leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="text-[16px] leading-[24px] font-semibold text-[#F0F4F8] mb-3">
                Stakes
              </h5>
              {isEditing && editingBackground ? (
                <div className="space-y-3">
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
                        className="flex-1 px-3 py-2 border border-[#2A3340] rounded-[8px] text-[#F0F4F8] bg-[#1D1E29] placeholder-[#A9B4C4] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)] text-sm"
                      />
                      <button
                        onClick={() => {
                          const newStakes = editingBackground.stakes.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, stakes: newStakes});
                        }}
                        className="text-red-400 hover:text-red-300 text-sm p-1 rounded hover:bg-red-500/10 transition-colors"
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
                    className="text-sm text-[#3B82F6] hover:text-[#2563EB] px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                  >
                    + Add Stake
                  </button>
                </div>
              ) : (
                <ul className="text-[14px] leading-[22px] text-[#F0F4F8] space-y-2">
                  {background.stakes.map((stake, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-[#A9B4C4] mr-3 mt-1">•</span>
                      <span className="leading-relaxed">{stake}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="text-[16px] leading-[24px] font-semibold text-[#F0F4F8] mb-3">
                Mysteries
              </h5>
              {isEditing && editingBackground ? (
                <div className="space-y-3">
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
                        className="flex-1 px-3 py-2 border border-[#2A3340] rounded-[8px] text-[#F0F4F8] bg-[#1D1E29] placeholder-[#A9B4C4] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)] text-sm"
                      />
                      <button
                        onClick={() => {
                          const newMysteries = editingBackground.mysteries.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, mysteries: newMysteries});
                        }}
                        className="text-red-400 hover:text-red-300 text-sm p-1 rounded hover:bg-red-500/10 transition-colors"
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
                    className="text-sm text-[#3B82F6] hover:text-[#2563EB] px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                  >
                    + Add Mystery
                  </button>
                </div>
              ) : (
                <ul className="text-[14px] leading-[22px] text-[#F0F4F8] space-y-2">
                  {background.mysteries.map((mystery, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-[#A9B4C4] mr-3 mt-1">•</span>
                      <span className="leading-relaxed">{mystery}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="text-[16px] leading-[24px] font-semibold text-[#F0F4F8] mb-3">
                Factions
              </h5>
              {isEditing && editingBackground ? (
                <div className="space-y-3">
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
                        className="flex-1 px-3 py-2 border border-[#2A3340] rounded-[8px] text-[#F0F4F8] bg-[#1D1E29] placeholder-[#A9B4C4] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)] text-sm"
                      />
                      <button
                        onClick={() => {
                          const newFactions = editingBackground.factions.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, factions: newFactions});
                        }}
                        className="text-red-400 hover:text-red-300 text-sm p-1 rounded hover:bg-red-500/10 transition-colors"
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
                    className="text-sm text-[#3B82F6] hover:text-[#2563EB] px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                  >
                    + Add Faction
                  </button>
                </div>
              ) : (
                <ul className="text-[14px] leading-[22px] text-[#F0F4F8] space-y-2">
                  {background.factions.map((faction, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-[#A9B4C4] mr-3 mt-1">•</span>
                      <span className="leading-relaxed">{faction}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="text-[16px] leading-[24px] font-semibold text-[#F0F4F8] mb-3">
                Locations
              </h5>
              {isEditing && editingBackground ? (
                <div className="space-y-3">
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
                        className="flex-1 px-3 py-2 border border-[#2A3340] rounded-[8px] text-[#F0F4F8] bg-[#1D1E29] placeholder-[#A9B4C4] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)] text-sm"
                      />
                      <button
                        onClick={() => {
                          const newLocations = editingBackground.location_palette.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, location_palette: newLocations});
                        }}
                        className="text-red-400 hover:text-red-300 text-sm p-1 rounded hover:bg-red-500/10 transition-colors"
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
                    className="text-sm text-[#3B82F6] hover:text-[#2563EB] px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                  >
                    + Add Location
                  </button>
                </div>
              ) : (
                <ul className="text-[14px] leading-[22px] text-[#F0F4F8] space-y-2">
                  {background.location_palette.map((location, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-[#A9B4C4] mr-3 mt-1">•</span>
                      <span className="leading-relaxed">{location}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="text-[16px] leading-[24px] font-semibold text-[#F0F4F8] mb-3">
                NPCs
              </h5>
              {isEditing && editingBackground ? (
                <div className="space-y-3">
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
                        className="flex-1 px-3 py-2 border border-[#2A3340] rounded-[8px] text-[#F0F4F8] bg-[#1D1E29] placeholder-[#A9B4C4] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)] text-sm"
                      />
                      <button
                        onClick={() => {
                          const newNpcs = editingBackground.npc_roster_skeleton.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, npc_roster_skeleton: newNpcs});
                        }}
                        className="text-red-400 hover:text-red-300 text-sm p-1 rounded hover:bg-red-500/10 transition-colors"
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
                    className="text-sm text-[#3B82F6] hover:text-[#2563EB] px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                  >
                    + Add NPC
                  </button>
                </div>
              ) : (
                <ul className="text-[14px] leading-[22px] text-[#F0F4F8] space-y-2">
                  {background.npc_roster_skeleton.map((npc, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-[#A9B4C4] mr-3 mt-1">•</span>
                      <span className="leading-relaxed">{npc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="text-[16px] leading-[24px] font-semibold text-[#F0F4F8] mb-3">
                Motifs
              </h5>
              {isEditing && editingBackground ? (
                <div className="space-y-3">
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
                        className="flex-1 px-3 py-2 border border-[#2A3340] rounded-[8px] text-[#F0F4F8] bg-[#1D1E29] placeholder-[#A9B4C4] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)] text-sm"
                      />
                      <button
                        onClick={() => {
                          const newMotifs = editingBackground.motifs.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, motifs: newMotifs});
                        }}
                        className="text-red-400 hover:text-red-300 text-sm p-1 rounded hover:bg-red-500/10 transition-colors"
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
                    className="text-sm text-[#3B82F6] hover:text-[#2563EB] px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                  >
                    + Add Motif
                  </button>
                </div>
              ) : (
                <ul className="text-[14px] leading-[22px] text-[#F0F4F8] space-y-2">
                  {background.motifs.map((motif, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-[#A9B4C4] mr-3 mt-1">•</span>
                      <span className="leading-relaxed">{motif}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="text-[16px] leading-[24px] font-semibold text-[#F0F4F8] mb-3">
                Do Nots
              </h5>
              {isEditing && editingBackground ? (
                <div className="space-y-3">
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
                        className="flex-1 px-3 py-2 border border-[#2A3340] rounded-[8px] text-[#F0F4F8] bg-[#1D1E29] placeholder-[#A9B4C4] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)] text-sm"
                      />
                      <button
                        onClick={() => {
                          const newDoNots = editingBackground.doNots.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, doNots: newDoNots});
                        }}
                        className="text-red-400 hover:text-red-300 text-sm p-1 rounded hover:bg-red-500/10 transition-colors"
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
                    className="text-sm text-[#3B82F6] hover:text-[#2563EB] px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                  >
                    + Add Do Not
                  </button>
                </div>
              ) : (
                <ul className="text-[14px] leading-[22px] text-[#F0F4F8] space-y-2">
                  {background.doNots.map((doNot, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-[#A9B4C4] mr-3 mt-1">•</span>
                      <span className="leading-relaxed">{doNot}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="text-[16px] leading-[24px] font-semibold text-[#F0F4F8] mb-3">
                Playstyle Implications
              </h5>
              {isEditing && editingBackground ? (
                <div className="space-y-3">
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
                        className="flex-1 px-3 py-2 border border-[#2A3340] rounded-[8px] text-[#F0F4F8] bg-[#1D1E29] placeholder-[#A9B4C4] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)] text-sm"
                      />
                      <button
                        onClick={() => {
                          const newImplications = editingBackground.playstyle_implications.filter((_, i) => i !== index);
                          setEditingBackground({...editingBackground, playstyle_implications: newImplications});
                        }}
                        className="text-red-400 hover:text-red-300 text-sm p-1 rounded hover:bg-red-500/10 transition-colors"
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
                    className="text-sm text-[#3B82F6] hover:text-[#2563EB] px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                  >
                    + Add Playstyle Implication
                  </button>
                </div>
              ) : (
                <ul className="text-[14px] leading-[22px] text-[#F0F4F8] space-y-2">
                  {background.playstyle_implications.map((implication, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-[#A9B4C4] mr-3 mt-1">•</span>
                      <span className="leading-relaxed">{implication}</span>
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