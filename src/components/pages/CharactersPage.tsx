import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { postJSON, getJSON } from '../../lib/api';
import type { Character, CharactersBlock, SessionContext } from '../../types/macro-chain';
import CharactersTable from '../CharactersTable';
import CharacterForm from '../CharacterForm';
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'generated' | 'saved'>('all');

  // Check if background is locked
  const isBackgroundLocked = context?.locks?.background === true;
  const hasBackground = !!context?.blocks?.background;

  // Load context and characters on mount
  useEffect(() => {
    if (sessionId && !context) {
      fetchContext();
    }
    if (sessionId) {
      loadCharacters();
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
    if (!isBackgroundLocked) {
      setError('Background must be locked before generating characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await postJSON('/api/characters/generate', { sessionId });
      
      if (response.ok) {
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
        setError(response.error || 'Failed to generate characters');
      }
    } catch (err) {
      setError('Failed to generate characters');
      log.error('Error generating characters:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLockCharacters = async () => {
    if (!characters || characters.length === 0) {
      setError('No characters to lock');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await postJSON('/api/characters/lock', { sessionId, locked: true });
      
      if (response.ok) {
        setIsLocked(true);
        // Refresh context
        if (context) {
          const updatedContext = { ...context };
          if (updatedContext.blocks.characters) {
            updatedContext.blocks.characters.locked = true;
            updatedContext.blocks.characters.lockedAt = response.lockedAt;
          }
          if (!updatedContext.locks) {
            updatedContext.locks = {};
          }
          updatedContext.locks.characters = true;
          onContextUpdate(updatedContext);
        }
      } else {
        setError(response.error || 'Failed to lock characters');
      }
    } catch (err) {
      setError('Failed to lock characters');
      log.error('Error locking characters:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setShowForm(true);
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

  // Filter characters based on status
  const getFilteredCharacters = () => {
    if (statusFilter === 'all') {
      return characters;
    }
    return characters.filter(char => char.status === statusFilter);
  };

  // Handle character status changes
  const handleSaveCharacterStatus = async (character: Character) => {
    try {
      const updatedCharacter = { ...character, status: 'saved' as const };
      const response = await postJSON('/api/characters/upsert', {
        sessionId,
        character: updatedCharacter
      });
      
      if (response.ok) {
        setCharacters(prev => 
          prev.map(char => char.id === character.id ? updatedCharacter : char)
        );
        log.info('Character status updated to saved:', character.name);
      } else {
        setError('Failed to save character status');
      }
    } catch (err) {
      setError('Failed to save character status');
      log.error('Error saving character status:', err);
    }
  };

  const handleDiscardCharacter = async (character: Character) => {
    try {
      const response = await postJSON('/api/characters/delete', {
        sessionId,
        characterId: character.id
      });
      
      if (response.ok) {
        setCharacters(prev => prev.filter(char => char.id !== character.id));
        log.info('Character discarded:', character.name);
      } else {
        setError('Failed to discard character');
      }
    } catch (err) {
      setError('Failed to discard character');
      log.error('Error discarding character:', err);
    }
  };

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

  // Get character status badge
  const getCharacterStatusBadge = (character: Character) => {
    const status = character.status || 'generated';
    if (status === 'saved') {
      return { label: 'Saved', variant: 'default' as const, className: 'bg-green-100 text-green-800' };
    }
    return { label: 'Generated', variant: 'outline' as const, className: 'bg-yellow-100 text-yellow-800' };
  };

  const status = getStatusBadge();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Characters</h2>
          <p className="text-gray-600 mt-1">
            Generate and manage playable characters for your campaign
          </p>
        </div>
        <Badge variant={status.variant}>
          {status.label}
        </Badge>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">Background Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {hasBackground ? (
                isBackgroundLocked ? (
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                )
              ) : (
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              )}
              <span className="text-sm text-gray-600">
                {hasBackground ? (isBackgroundLocked ? 'Locked' : 'Draft') : 'Not Created'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">Characters Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {characters && characters.length > 0 ? (
                isLocked ? (
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                )
              ) : (
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              )}
              <span className="text-sm text-gray-600">
                {characters && characters.length > 0 ? (isLocked ? 'Locked' : 'Draft') : 'Not Generated'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">Character Count</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-gray-900">{characters?.length || 0}</span>
            <p className="text-sm text-gray-600">of 3-5 characters</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
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
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Generating...' : 'Generate Characters'}
          </Button>
        )}
        
        {characters && characters.length > 0 && !isLocked && (
          <Button
            onClick={handleLockCharacters}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Locking...' : 'Lock Characters'}
          </Button>
        )}

        {characters && characters.length > 0 && isLocked && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Characters are locked and ready for play</span>
          </div>
        )}
      </div>

      {/* Requirements Banner */}
      {!isBackgroundLocked && (!characters || characters.length === 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Background Required</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You must create and lock the Background before generating characters.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Characters Table */}
      {characters && characters.length > 0 && (
        <>
          {/* Filter Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium text-gray-900">
                Characters ({getFilteredCharacters().length})
              </h3>
              <Select value={statusFilter} onValueChange={(value: 'all' | 'generated' | 'saved') => setStatusFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="saved">Saved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <CharactersTable
            characters={getFilteredCharacters()}
            isLocked={isLocked}
            onEditCharacter={handleEditCharacter}
            onSaveCharacter={handleSaveCharacterStatus}
            onDiscardCharacter={handleDiscardCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            getCharacterStatusBadge={getCharacterStatusBadge}
          />
        </>
      )}

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
