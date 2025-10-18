import React, { useState } from 'react';
import type { GenerateChainRequest, Playstyle } from '../types/macro-chain';

interface StoryConceptFormProps {
  onSubmit: (data: GenerateChainRequest) => void;
  loading: boolean;
}

export default function StoryConceptForm({ onSubmit, loading }: StoryConceptFormProps) {
  const [concept, setConcept] = useState('');
  const [gameType, setGameType] = useState('');
  const [players, setPlayers] = useState('');
  const [level, setLevel] = useState('');
  const [playstyle, setPlaystyle] = useState<Playstyle>({
    roleplayPct: undefined,
    combatPct: undefined,
    improv: undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!concept.trim()) {
      return;
    }

    const meta = {
      gameType: gameType.trim() || undefined,
      players: players.trim() || undefined,
      level: level.trim() || undefined,
      playstyle: Object.values(playstyle).some(v => v !== undefined) ? playstyle : undefined,
    };

    onSubmit({
      concept: concept.trim(),
      meta: Object.values(meta).some(v => v !== undefined) ? meta : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Story Concept</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Story Concept */}
          <div>
            <label htmlFor="concept" className="block text-sm font-medium text-gray-700 mb-2">
              Story Concept *
            </label>
            <textarea
              id="concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Describe your story concept, setting, and main conflict..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              required
              disabled={loading}
            />
          </div>

          {/* Optional Meta Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="gameType" className="block text-sm font-medium text-gray-700 mb-2">
                Game Type
              </label>
              <input
                type="text"
                id="gameType"
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
                placeholder="e.g., one-shot, campaign, mini-series"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="players" className="block text-sm font-medium text-gray-700 mb-2">
                Players
              </label>
              <input
                type="text"
                id="players"
                value={players}
                onChange={(e) => setPlayers(e.target.value)}
                placeholder="e.g., 3-4 players, level 1-3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                Level
              </label>
              <input
                type="text"
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="e.g., beginner, intermediate, advanced"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Playstyle
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="improv"
                    checked={playstyle.improv || false}
                    onChange={(e) => setPlaystyle(prev => ({ ...prev, improv: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <label htmlFor="improv" className="text-sm text-gray-700">
                    Improv-heavy
                  </label>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label htmlFor="roleplayPct" className="block text-xs text-gray-600 mb-1">
                      Roleplay %
                    </label>
                    <input
                      type="number"
                      id="roleplayPct"
                      min="0"
                      max="100"
                      value={playstyle.roleplayPct || ''}
                      onChange={(e) => setPlaystyle(prev => ({ 
                        ...prev, 
                        roleplayPct: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label htmlFor="combatPct" className="block text-xs text-gray-600 mb-1">
                      Combat %
                    </label>
                    <input
                      type="number"
                      id="combatPct"
                      min="0"
                      max="100"
                      value={playstyle.combatPct || ''}
                      onChange={(e) => setPlaystyle(prev => ({ 
                        ...prev, 
                        combatPct: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !concept.trim()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating Macro Chain...</span>
              </>
            ) : (
              <span>Generate Macro Chain</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
