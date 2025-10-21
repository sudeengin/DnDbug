import React, { useState, useEffect } from 'react';
import type { SessionContext, Blueprint, PlayerHook, WorldSeed, StylePreferences, StoryConcept } from '../types/macro-chain';
import { analyzeConceptContextConflicts, type ConflictAnalysis } from '../utils/conflict-detection';
import logger from '@/utils/logger';

const log = logger.context;

interface ContextPanelProps {
  sessionId: string;
  onContextUpdate?: (context: SessionContext | null) => void;
  onConflictAnalysis?: (analysis: ConflictAnalysis) => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ sessionId, onContextUpdate, onConflictAnalysis }) => {
  const [context, setContext] = useState<SessionContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newData, setNewData] = useState<any>({});
  const [conflictAnalysis, setConflictAnalysis] = useState<ConflictAnalysis | null>(null);

  // Load context on mount
  useEffect(() => {
    loadContext();
  }, [sessionId]);

  // Analyze conflicts when context changes
  useEffect(() => {
    if (context) {
      const analysis = analyzeConceptContextConflicts('', context);
      setConflictAnalysis(analysis);
      onConflictAnalysis?.(analysis);
    } else {
      setConflictAnalysis(null);
    }
  }, [context, onConflictAnalysis]);

  const loadContext = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/context/get?sessionId=${sessionId}`);
      const result = await response.json();
      if (result.ok) {
        setContext(result.data);
        onContextUpdate?.(result.data);
      }
    } catch (error) {
      log.error('Failed to load context:', error);
    } finally {
      setLoading(false);
    }
  };

  const appendToContext = async (blockType: string, data: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/context/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, blockType, data })
      });
      const result = await response.json();
      if (result.ok) {
        setContext(result.data);
        onContextUpdate?.(result.data);
        setEditing(null);
        setNewData({});
      }
    } catch (error) {
      log.error('Failed to append context:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearContext = async () => {
    if (!confirm('Are you sure you want to clear all context?')) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/context/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (response.ok) {
        setContext(null);
        onContextUpdate?.(null);
      }
    } catch (error) {
      log.error('Failed to clear context:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (blockType: string) => {
    setEditing(blockType);
    setNewData({});
  };

  const cancelEditing = () => {
    setEditing(null);
    setNewData({});
  };

  const saveEdit = () => {
    if (editing && Object.keys(newData).length > 0) {
      appendToContext(editing, newData);
    }
  };

  const renderBlueprint = (blueprint: Blueprint) => (
    <div className="bg-blue-50 p-3 rounded-lg">
      <h4 className="font-semibold text-blue-800 mb-2">Blueprint</h4>
      {blueprint.theme && <p><strong>Theme:</strong> {blueprint.theme}</p>}
      {blueprint.core_idea && <p><strong>Core Idea:</strong> {blueprint.core_idea}</p>}
      {blueprint.tone && <p><strong>Tone:</strong> {blueprint.tone}</p>}
      {blueprint.pacing && <p><strong>Pacing:</strong> {blueprint.pacing}</p>}
      {blueprint.setting && <p><strong>Setting:</strong> {blueprint.setting}</p>}
      {blueprint.hooks && blueprint.hooks.length > 0 && (
        <div>
          <strong>Hooks:</strong>
          <ul className="list-disc list-inside ml-2">
            {blueprint.hooks.map((hook, i) => <li key={i}>{hook}</li>)}
          </ul>
        </div>
      )}
    </div>
  );

  const renderPlayerHooks = (hooks: PlayerHook[]) => (
    <div className="bg-green-50 p-3 rounded-lg">
      <h4 className="font-semibold text-green-800 mb-2">Player Hooks</h4>
      {hooks.map((hook, i) => (
        <div key={i} className="mb-2 p-2 bg-white rounded">
          <p><strong>{hook.name}</strong> ({hook.class})</p>
          <p className="text-sm text-gray-600">{hook.motivation}</p>
          {hook.ties.length > 0 && (
            <p className="text-sm text-gray-500">Ties: {hook.ties.join(', ')}</p>
          )}
        </div>
      ))}
    </div>
  );

  const renderWorldSeeds = (seeds: WorldSeed) => (
    <div className="bg-purple-50 p-3 rounded-lg">
      <h4 className="font-semibold text-purple-800 mb-2">World Seeds</h4>
      {seeds.factions && seeds.factions.length > 0 && (
        <div className="mb-2">
          <strong>Factions:</strong>
          <ul className="list-disc list-inside ml-2">
            {seeds.factions.map((faction, i) => <li key={i}>{faction}</li>)}
          </ul>
        </div>
      )}
      {seeds.locations && seeds.locations.length > 0 && (
        <div className="mb-2">
          <strong>Locations:</strong>
          <ul className="list-disc list-inside ml-2">
            {seeds.locations.map((location, i) => <li key={i}>{location}</li>)}
          </ul>
        </div>
      )}
      {seeds.constraints && seeds.constraints.length > 0 && (
        <div>
          <strong>Constraints:</strong>
          <ul className="list-disc list-inside ml-2">
            {seeds.constraints.map((constraint, i) => <li key={i}>{constraint}</li>)}
          </ul>
        </div>
      )}
    </div>
  );

  const renderStylePrefs = (prefs: StylePreferences) => (
    <div className="bg-orange-50 p-3 rounded-lg">
      <h4 className="font-semibold text-orange-800 mb-2">Style Preferences</h4>
      {prefs.language && <p><strong>Language:</strong> {prefs.language}</p>}
      {prefs.tone && <p><strong>Tone:</strong> {prefs.tone}</p>}
      {prefs.pacingHints && prefs.pacingHints.length > 0 && (
        <div className="mb-2">
          <strong>Pacing Hints:</strong>
          <ul className="list-disc list-inside ml-2">
            {prefs.pacingHints.map((hint, i) => <li key={i}>{hint}</li>)}
          </ul>
        </div>
      )}
      {prefs.doNots && prefs.doNots.length > 0 && (
        <div>
          <strong>Do Nots:</strong>
          <ul className="list-disc list-inside ml-2">
            {prefs.doNots.map((doNot, i) => <li key={i}>{doNot}</li>)}
          </ul>
        </div>
      )}
    </div>
  );

  const toggleStoryConceptLock = async () => {
    if (!context) return;
    
    const isCurrentlyLocked = context.locks?.story_concept || false;
    
    try {
      const response = await fetch('/api/context/lock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          blockType: 'story_concept',
          locked: !isCurrentlyLocked
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.ok) {
          setContext(result.data);
          onContextUpdate?.(result.data);
        }
      }
    } catch (error) {
      log.error('Failed to toggle story concept lock:', error);
    }
  };

  const renderStoryConcept = (storyConcept: StoryConcept) => {
    const isLocked = context?.locks?.story_concept || false;
    
    return (
      <div className="bg-cyan-50 p-3 rounded-lg border-l-4 border-cyan-400">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-cyan-800">Story Concept</h4>
          <button
            onClick={toggleStoryConceptLock}
            className={`px-2 py-1 text-xs rounded ${
              isLocked 
                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            title={isLocked ? 'Unlock story concept' : 'Lock story concept'}
          >
            {isLocked ? '🔒 Locked' : '🔓 Unlocked'}
          </button>
        </div>
        
        <div className="mb-2">
          <strong>Concept:</strong>
          <p className="text-sm text-gray-700 mt-1 p-2 bg-white rounded border">
            {storyConcept.concept}
          </p>
        </div>
        
        {storyConcept.meta && (
          <div className="mb-2">
            <strong className="text-sm text-gray-600">Meta Information:</strong>
            <div className="text-sm ml-2 mt-1">
              {storyConcept.meta.gameType && <p><strong>Game Type:</strong> {storyConcept.meta.gameType}</p>}
              {storyConcept.meta.players && <p><strong>Players:</strong> {storyConcept.meta.players}</p>}
              {storyConcept.meta.level && <p><strong>Level:</strong> {storyConcept.meta.level}</p>}
              {storyConcept.meta.playstyle && (
                <div>
                  <strong>Playstyle:</strong>
                  <ul className="list-disc list-inside ml-2">
                    {storyConcept.meta.playstyle.roleplayPct && <li>Roleplay: {storyConcept.meta.playstyle.roleplayPct}%</li>}
                    {storyConcept.meta.playstyle.combatPct && <li>Combat: {storyConcept.meta.playstyle.combatPct}%</li>}
                    {storyConcept.meta.playstyle.improv !== undefined && <li>Improv: {storyConcept.meta.playstyle.improv ? 'Yes' : 'No'}</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-2">
          Created: {new Date(storyConcept.timestamp).toLocaleString()}
          {isLocked && <span className="ml-2 text-green-600">• Locked</span>}
        </div>
      </div>
    );
  };

  const renderStoryFacts = (facts: any[]) => (
    <div className="bg-indigo-50 p-3 rounded-lg">
      <h4 className="font-semibold text-indigo-800 mb-2">Story Facts</h4>
      {facts.map((fact, i) => (
        <div key={i} className="mb-3 p-2 bg-white rounded border-l-4 border-indigo-400">
          <div className="text-sm font-medium text-indigo-700 mb-1">
            Scene: {fact.sceneTitle || fact.fromScene}
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {new Date(fact.timestamp).toLocaleString()}
          </div>
          
          {fact.keyEvents && fact.keyEvents.length > 0 && (
            <div className="mb-2">
              <strong className="text-xs text-gray-600">Key Events:</strong>
              <ul className="list-disc list-inside ml-2 text-sm">
                {fact.keyEvents.map((event: string, idx: number) => <li key={idx}>{event}</li>)}
              </ul>
            </div>
          )}
          
          {fact.revealedInfo && fact.revealedInfo.length > 0 && (
            <div className="mb-2">
              <strong className="text-xs text-gray-600">Revealed Info:</strong>
              <ul className="list-disc list-inside ml-2 text-sm">
                {fact.revealedInfo.map((info: string, idx: number) => <li key={idx}>{info}</li>)}
              </ul>
            </div>
          )}
          
          {fact.stateChanges && Object.keys(fact.stateChanges).length > 0 && (
            <div className="mb-2">
              <strong className="text-xs text-gray-600">State Changes:</strong>
              <div className="text-sm ml-2">
                {JSON.stringify(fact.stateChanges, null, 2)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderEditForm = () => {
    if (!editing) return null;

    return (
      <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
        <h4 className="font-semibold mb-3">Add {editing.replace('_', ' ')}</h4>
        
        {editing === 'blueprint' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Theme"
              className="w-full p-2 border rounded"
              value={newData.theme || ''}
              onChange={(e) => setNewData({...newData, theme: e.target.value})}
            />
            <textarea
              placeholder="Core Idea"
              className="w-full p-2 border rounded"
              value={newData.core_idea || ''}
              onChange={(e) => setNewData({...newData, core_idea: e.target.value})}
            />
            <input
              type="text"
              placeholder="Tone"
              className="w-full p-2 border rounded"
              value={newData.tone || ''}
              onChange={(e) => setNewData({...newData, tone: e.target.value})}
            />
            <input
              type="text"
              placeholder="Setting"
              className="w-full p-2 border rounded"
              value={newData.setting || ''}
              onChange={(e) => setNewData({...newData, setting: e.target.value})}
            />
          </div>
        )}

        {editing === 'player_hooks' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Character Name"
              className="w-full p-2 border rounded"
              value={newData.name || ''}
              onChange={(e) => setNewData({...newData, name: e.target.value})}
            />
            <input
              type="text"
              placeholder="Class"
              className="w-full p-2 border rounded"
              value={newData.class || ''}
              onChange={(e) => setNewData({...newData, class: e.target.value})}
            />
            <textarea
              placeholder="Motivation"
              className="w-full p-2 border rounded"
              value={newData.motivation || ''}
              onChange={(e) => setNewData({...newData, motivation: e.target.value})}
            />
            <input
              type="text"
              placeholder="Ties (comma-separated)"
              className="w-full p-2 border rounded"
              value={newData.ties || ''}
              onChange={(e) => setNewData({...newData, ties: e.target.value.split(',').map(t => t.trim())})}
            />
          </div>
        )}

        {editing === 'world_seeds' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Factions (comma-separated)"
              className="w-full p-2 border rounded"
              value={newData.factions || ''}
              onChange={(e) => setNewData({...newData, factions: e.target.value.split(',').map(f => f.trim())})}
            />
            <input
              type="text"
              placeholder="Locations (comma-separated)"
              className="w-full p-2 border rounded"
              value={newData.locations || ''}
              onChange={(e) => setNewData({...newData, locations: e.target.value.split(',').map(l => l.trim())})}
            />
            <input
              type="text"
              placeholder="Constraints (comma-separated)"
              className="w-full p-2 border rounded"
              value={newData.constraints || ''}
              onChange={(e) => setNewData({...newData, constraints: e.target.value.split(',').map(c => c.trim())})}
            />
          </div>
        )}

        {editing === 'style_prefs' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Language"
              className="w-full p-2 border rounded"
              value={newData.language || ''}
              onChange={(e) => setNewData({...newData, language: e.target.value})}
            />
            <input
              type="text"
              placeholder="Tone"
              className="w-full p-2 border rounded"
              value={newData.tone || ''}
              onChange={(e) => setNewData({...newData, tone: e.target.value})}
            />
            <input
              type="text"
              placeholder="Pacing Hints (comma-separated)"
              className="w-full p-2 border rounded"
              value={newData.pacingHints || ''}
              onChange={(e) => setNewData({...newData, pacingHints: e.target.value.split(',').map(p => p.trim())})}
            />
            <input
              type="text"
              placeholder="Do Nots (comma-separated)"
              className="w-full p-2 border rounded"
              value={newData.doNots || ''}
              onChange={(e) => setNewData({...newData, doNots: e.target.value.split(',').map(d => d.trim())})}
            />
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button
            onClick={saveEdit}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={cancelEditing}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  if (loading && !context) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="animate-pulse">Loading context...</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Session Context</h3>
        <div className="flex gap-2">
          <button
            onClick={loadContext}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            onClick={clearContext}
            disabled={loading}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {context && (
        <div className="space-y-4">
          {context.blocks.story_concept && renderStoryConcept(context.blocks.story_concept)}
          {context.blocks.blueprint && renderBlueprint(context.blocks.blueprint)}
          {context.blocks.player_hooks && context.blocks.player_hooks.length > 0 && 
            renderPlayerHooks(context.blocks.player_hooks)}
          {context.blocks.world_seeds && renderWorldSeeds(context.blocks.world_seeds)}
          {context.blocks.style_prefs && renderStylePrefs(context.blocks.style_prefs)}
          {context.blocks.story_facts && context.blocks.story_facts.length > 0 && 
            renderStoryFacts(context.blocks.story_facts)}
          
          <div className="text-sm text-gray-500">
            Version: {context.version} | Updated: {new Date(context.updatedAt).toLocaleString()}
          </div>
        </div>
      )}

      {!context && (
        <div className="text-gray-500 text-center py-4">
          No context data available for this session.
        </div>
      )}

      {conflictAnalysis && conflictAnalysis.hasConflicts && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Context Conflicts Detected</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Some context blocks may have conflicting information:</p>
                <ul className="list-disc list-inside mt-1">
                  {conflictAnalysis.warnings.map((warning, index) => (
                    <li key={index}>
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        warning.severity === 'high' ? 'bg-red-500' : 
                        warning.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></span>
                      {warning.message}
                    </li>
                  ))}
                </ul>
                {conflictAnalysis.suggestions.length > 0 && (
                  <div className="mt-2">
                    <strong>Suggestions:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {conflictAnalysis.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <h4 className="font-semibold mb-2">Add Context</h4>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => startEditing('blueprint')}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
          >
            Blueprint
          </button>
          <button
            onClick={() => startEditing('player_hooks')}
            className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
          >
            Player Hooks
          </button>
          <button
            onClick={() => startEditing('world_seeds')}
            className="px-3 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
          >
            World Seeds
          </button>
          <button
            onClick={() => startEditing('style_prefs')}
            className="px-3 py-1 bg-orange-100 text-orange-800 rounded hover:bg-orange-200"
          >
            Style Prefs
          </button>
        </div>
        
        {renderEditForm()}
      </div>
    </div>
  );
};
