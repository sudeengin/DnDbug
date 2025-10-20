import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { postJSON, getJSON } from '../../lib/api';
import type { Character, CharactersBlock, SessionContext } from '../../types/macro-chain';
import CharactersTable from '../CharactersTable';
import CharacterForm from '../CharacterForm';

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
      console.error('Failed to fetch context:', error);
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
      console.error('Error loading characters:', err);
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
      console.error('Error generating characters:', err);
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
      console.error('Error locking characters:', err);
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
      console.error('Error saving character:', err);
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
        <Button
          onClick={handleGenerateCharacters}
          disabled={!isBackgroundLocked || loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Generating...' : 'Generate Characters'}
        </Button>
        
        {characters && characters.length > 0 && !isLocked && (
          <Button
            onClick={handleLockCharacters}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Locking...' : 'Lock Characters'}
          </Button>
        )}
      </div>

      {/* Requirements Banner */}
      {!isBackgroundLocked && (
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
        <CharactersTable
          characters={characters}
          isLocked={isLocked}
          onEditCharacter={handleEditCharacter}
        />
      )}

      {/* Character Form Modal */}
      {showForm && editingCharacter && (
        <CharacterForm
          character={editingCharacter}
          onSave={handleSaveCharacter}
          onClose={handleCloseForm}
          isLocked={isLocked}
        />
      )}
    </div>
  );
}
