import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { postJSON, getJSON } from '../../lib/api';
import debug from '../../lib/simpleDebug';
import type { Character, CharactersBlock, SessionContext } from '../../types/macro-chain';
import CharactersTable from '../CharactersTable';
import CharacterForm from '../CharacterForm';
import CharacterDetailPage from './CharacterDetailPage';
import { getCharacterIdFromUrl, navigateToCharacter, clearCharacterFromUrl } from '../../lib/router';
import logger from '@/utils/logger';

const log = logger.character;

interface CharactersPageProps {
  sessionId: string;
  context: SessionContext | null;
  onContextUpdate: (context: SessionContext) => void;
}

export default function CharactersPage({ sessionId, context, onContextUpdate }: CharactersPageProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all'>('all');
  const [viewCharacterId, setViewCharacterId] = useState<string | null>(null);

  // Check if background is locked
  const isBackgroundLocked = context?.locks?.background === true;
  const hasBackground = !!context?.blocks?.background;

  // Debug logging for component lifecycle
  useEffect(() => {
    debug.info('CharactersPage', 'Component mounted', { 
      sessionId, 
      isBackgroundLocked,
      hasBackground,
      hasContext: !!context,
      charactersCount: characters.length 
    });

    return () => {
      debug.info('CharactersPage', 'Component unmounted');
    };
  }, []);

  // Debug logging for state changes
  useEffect(() => {
    debug.info('CharactersPage', 'Characters state changed', { 
      charactersCount: characters.length,
      characters: characters.map(c => ({ id: c.id, name: c.name }))
    });
  }, [characters]);

  useEffect(() => {
    debug.info('CharactersPage', 'Loading state changed', { loading });
  }, [loading]);

  useEffect(() => {
    if (error) {
      debug.error('CharactersPage', 'Error state set', { error });
    }
  }, [error]);

  // Load context and characters on mount
  useEffect(() => {
    if (sessionId && !context) {
      fetchContext();
    }
    if (sessionId) {
      loadCharacters();
    }
    const handleHash = () => setViewCharacterId(getCharacterIdFromUrl());
    handleHash();
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', handleHash);
      return () => window.removeEventListener('hashchange', handleHash);
    }
  }, [sessionId]);

  const fetchContext = async () => {
    try {
      const response = await getJSON<{ ok: boolean; data: SessionContext | null }>(`/api/context/get?sessionId=${sessionId}`);
      if (response.ok && response.data) {
        onContextUpdate(response.data);
      }
    } catch (error) {
      log.error('Failed to fetch context:', error);
    }
  };

  const loadCharacters = async () => {
    try {
      const response = await fetch(`/api/characters/list?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.ok) {
        setCharacters(data.list || []);
        setIsLocked(data.locked || false);
      } else {
        setError(data.error || 'Failed to load characters');
      }
    } catch (err) {
      setError('Failed to load characters');
      log.error('Error loading characters:', err);
    }
  };

  const handleGenerateCharacters = async () => {
    debug.info('CharactersPage', 'Generate characters button clicked', { 
      sessionId, 
      isBackgroundLocked,
      charactersCount: characters?.length || 0 
    });

    if (!isBackgroundLocked) {
      const errorMsg = 'Background must be locked before generating characters';
      setError(errorMsg);
      debug.warn('CharactersPage', 'Generate characters blocked', { reason: errorMsg });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      debug.info('CharactersPage', 'Starting character generation', { sessionId });
      const response = await postJSON('/api/characters/generate', { sessionId });
      
      if (response.ok) {
        debug.info('CharactersPage', 'Character generation successful', { 
          charactersGenerated: response.list?.length || 0,
          characters: response.list 
        });
        setCharacters(response.list || []);
        setIsLocked(false);
        // Refresh context
        if (context) {
          const updatedContext = { ...context };
          updatedContext.blocks.characters = {
            list: response.list || [],
            locked: false,
            version: Date.now()
          };
          onContextUpdate(updatedContext);
        }
      } else {
        const errorMsg = response.error || 'Failed to generate characters';
        setError(errorMsg);
        debug.error('CharactersPage', 'Character generation failed', { 
          error: errorMsg, 
          response 
        });
      }
    } catch (err) {
      const errorMsg = 'Failed to generate characters';
      setError(errorMsg);
      log.error('Error generating characters:', err);
      debug.error('CharactersPage', 'Character generation exception', { 
        error: errorMsg, 
        exception: err,
        sessionId 
      });
    } finally {
      setLoading(false);
      debug.info('CharactersPage', 'Character generation completed', { 
        loading: false,
        hasError: !!error 
      });
    }
  };

  const handleLockCharacters = async () => {
    if (!characters || characters.length === 0) {
      setError('No characters to lock');
      return;
    }

    const action = isLocked ? 'unlock' : 'lock';
    const confirmed = typeof window !== 'undefined' ? window.confirm(`Are you sure you want to ${action} all characters?`) : true;
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const nextLocked = !isLocked;
      const response = await postJSON('/api/characters/lock', { sessionId, locked: nextLocked });
      
      if (response.ok) {
        setIsLocked(nextLocked);
        // Refresh context
        if (context) {
          const updatedContext = { ...context };
          if (!updatedContext.blocks) (updatedContext as any).blocks = {};
          if (!(updatedContext as any).blocks.characters) {
            (updatedContext as any).blocks.characters = { list: characters, locked: nextLocked, version: Date.now() } as any;
          } else {
            (updatedContext as any).blocks.characters.locked = nextLocked;
            (updatedContext as any).blocks.characters.lockedAt = (response as any).lockedAt;
          }
          if (!updatedContext.locks) {
            (updatedContext as any).locks = {};
          }
          (updatedContext as any).locks.characters = nextLocked;
          onContextUpdate(updatedContext);
        }
      } else {
        setError(response.error || `Failed to ${action} characters`);
      }
    } catch (err) {
      setError(`Failed to ${isLocked ? 'unlock' : 'lock'} characters`);
      log.error('Error updating characters lock:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setShowForm(true);
  };

  const handleViewCharacter = (character: Character) => {
    if (!sessionId) return;
    navigateToCharacter(sessionId, character.id);
    setViewCharacterId(character.id);
  };

  const handleBackToList = () => {
    if (!sessionId) return;
    clearCharacterFromUrl(sessionId);
    setViewCharacterId(null);
  };

  const handleSaveCharacter = async (updatedCharacter: Character) => {
    try {
      const response = await postJSON('/api/characters/upsert', {
        sessionId,
        character: updatedCharacter
      });
      
      if (response.ok) {
        setCharacters(response.list);
        setShowForm(false);
        setEditingCharacter(null);
        // Refresh context
        if (context) {
          const updatedContext = { ...context };
          if (updatedContext.blocks.characters) {
            updatedContext.blocks.characters.list = response.list;
            updatedContext.blocks.characters.version = Date.now();
          }
          onContextUpdate(updatedContext);
        }
      } else {
        setError(response.error || 'Failed to save character');
      }
    } catch (err) {
      setError('Failed to save character');
      log.error('Error saving character:', err);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCharacter(null);
  };

  const getStatusBadge = () => {
    if (!hasBackground) {
      return { label: 'No Background', variant: 'secondary' as const };
    }
    if (!isBackgroundLocked) {
      return { label: 'Background Not Locked', variant: 'outline' as const };
    }
    if (!characters || characters.length === 0) {
      return { label: 'No Characters', variant: 'secondary' as const };
    }
    if (isLocked) {
      return { label: 'Locked', variant: 'upToDate' as const };
    }
    return { label: 'Draft', variant: 'outline' as const };
  };

  // Filter characters (only 'all')
  const getFilteredCharacters = () => characters;

  // Per-card status toggling removed. Edits are saved via form; lock is global.

  const handleDeleteCharacter = async (character: Character) => {
    try {
      const response = await postJSON('/api/characters/delete', {
        sessionId,
        characterId: character.id
      });
      
      if (response.ok) {
        setCharacters(prev => prev.filter(char => char.id !== character.id));
        log.info('Character deleted:', character.name);
      } else {
        setError('Failed to delete character');
      }
    } catch (err) {
      setError('Failed to delete character');
      log.error('Error deleting character:', err);
    }
  };

  // Character badge reflects only global lock state
  const getCharacterStatusBadge = (_character: Character) => {
    return isLocked
      ? { label: 'Locked', variant: 'default' as const, className: 'bg-green-900/20 text-green-300 border border-green-700/40' }
      : { label: 'Draft', variant: 'outline' as const, className: 'bg-yellow-900/20 text-yellow-300 border border-yellow-700/40' };
  };

  const status = getStatusBadge();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-200">Characters</h2>
          <p className="text-gray-400 mt-1">
            Generate and manage playable characters for your campaign
          </p>
        </div>
        <div className="text-sm text-gray-400 flex items-center gap-2">
          {status.label}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#151A22] border-[#2A3340]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300">Background Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
              <span className="text-sm text-gray-400">
                {hasBackground ? (isBackgroundLocked ? 'Locked' : 'Draft') : 'Not Created'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#151A22] border-[#2A3340]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300">Characters Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
              <span className="text-sm text-gray-400">
                {characters && characters.length > 0 ? (isLocked ? 'Locked' : 'Draft') : 'Not Generated'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#151A22] border-[#2A3340]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300">Character Count</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-gray-200">{characters?.length || 0}</span>
            <p className="text-sm text-gray-400">of 3-5 characters</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-300">Error</h3>
              <div className="mt-2 text-sm text-red-200">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        {(!characters || characters.length === 0) && (
          <Button
            onClick={handleGenerateCharacters}
            disabled={!isBackgroundLocked || loading}
            variant="primary"
          >
            {loading ? 'Generating...' : 'Generate Characters'}
          </Button>
        )}
        
        {characters && characters.length > 0 && (
          <Button
            onClick={handleLockCharacters}
            disabled={loading}
            variant="primary"
          >
            {loading ? (isLocked ? 'Unlocking...' : 'Locking...') : (isLocked ? 'Unlock Characters' : 'Lock Characters')}
          </Button>
        )}
      </div>

      {/* Requirements Banner */}
      {!isBackgroundLocked && (!characters || characters.length === 0) && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-300">Background Required</h3>
              <div className="mt-2 text-sm text-yellow-200">
                <p>You must create and lock the Background before generating characters.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Character Detail vs. List */}
      {viewCharacterId ? (
        (() => {
          const character = characters.find(c => c.id === viewCharacterId);
          if (!character) return null;
          return (
            <CharacterDetailPage 
              character={character} 
              onBack={handleBackToList}
              onEdit={() => handleEditCharacter(character)}
            />
          );
        })()
      ) : (characters && characters.length > 0 && (
        <>
          {/* Filter Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium text-gray-200">
                Characters ({getFilteredCharacters().length})
              </h3>
              <Select value={statusFilter} onValueChange={(_value: 'all') => setStatusFilter('all')}>
                <SelectTrigger className="w-32 rounded-[12px] border-[#2A3340] bg-[#0f141b] text-[#E0E0E0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#151A22] border-[#2A3340] text-[#E0E0E0]">
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <CharactersTable
            characters={getFilteredCharacters()}
            isLocked={isLocked}
            onEditCharacter={handleEditCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            getCharacterStatusBadge={getCharacterStatusBadge}
            onViewCharacter={handleViewCharacter}
          />
        </>
      ))}

      {/* Character Form Modal */}
      {showForm && editingCharacter && (
        <CharacterForm
          character={editingCharacter}
          onSave={handleSaveCharacter}
          onClose={handleCloseForm}
          isLocked={isLocked}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
