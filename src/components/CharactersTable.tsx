import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { Character } from '../types/macro-chain';

interface CharactersTableProps {
  characters: Character[];
  isLocked: boolean;
  onEditCharacter: (character: Character) => void;
}

export default function CharactersTable({ characters, isLocked, onEditCharacter }: CharactersTableProps) {
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

  const toggleSecret = (characterId: string) => {
    const newRevealed = new Set(revealedSecrets);
    if (newRevealed.has(characterId)) {
      newRevealed.delete(characterId);
    } else {
      newRevealed.add(characterId);
    }
    setRevealedSecrets(newRevealed);
  };

  const getAlignmentColor = (alignment?: string) => {
    if (!alignment) return 'bg-gray-100 text-gray-800';
    
    const alignmentLower = alignment.toLowerCase();
    if (alignmentLower.includes('good')) return 'bg-green-100 text-green-800';
    if (alignmentLower.includes('evil')) return 'bg-red-100 text-red-800';
    if (alignmentLower.includes('neutral')) return 'bg-yellow-100 text-yellow-800';
    if (alignmentLower.includes('chaotic')) return 'bg-purple-100 text-purple-800';
    if (alignmentLower.includes('lawful')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Character Roster</h3>
        <Badge variant={isLocked ? 'upToDate' : 'outline'}>
          {isLocked ? 'Locked' : 'Draft'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {characters.map((character) => (
          <Card key={character.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {character.name}
                  </CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    {character.class && (
                      <Badge variant="outline" className="text-xs">
                        {character.class}
                      </Badge>
                    )}
                    {character.alignment && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getAlignmentColor(character.alignment)}`}
                      >
                        {character.alignment}
                      </Badge>
                    )}
                  </div>
                </div>
                {!isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditCharacter(character)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Race:</span>
                  <span className="ml-1 text-gray-900">{character.race}</span>
                </div>
                <div>
                  <span className="text-gray-600">Class:</span>
                  <span className="ml-1 text-gray-900">{character.class}</span>
                </div>
              </div>

              {/* Personality */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Personality</h4>
                <p className="text-sm text-gray-600">{character.personality}</p>
              </div>

              {/* Motivation */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Motivation</h4>
                <p className="text-sm text-gray-600">{character.motivation}</p>
              </div>

              {/* Connection to Story */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Story Connection</h4>
                <p className="text-sm text-gray-600">{character.connectionToStory}</p>
              </div>

              {/* Voice Tone */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Voice Tone</h4>
                <p className="text-sm text-gray-600 italic">"{character.voiceTone}"</p>
              </div>

              {/* Inventory Hint */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Inventory Hint</h4>
                <p className="text-sm text-gray-600">{character.inventoryHint}</p>
              </div>

              {/* Motif Alignment */}
              {character.motifAlignment && character.motifAlignment.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Motif Alignment</h4>
                  <div className="flex flex-wrap gap-1">
                    {character.motifAlignment.map((motif, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {motif}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Background History */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Background History</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{character.backgroundHistory}</p>
              </div>

              {/* Key Relationships */}
              {character.keyRelationships && character.keyRelationships.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Key Relationships</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {character.keyRelationships.map((relationship, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        <span>{relationship}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Flaw or Weakness */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Flaw or Weakness</h4>
                <p className="text-sm text-gray-600">{character.flawOrWeakness}</p>
              </div>

              {/* GM Secret */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">GM Secret</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSecret(character.id)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {revealedSecrets.has(character.id) ? 'Hide' : 'Reveal'}
                  </Button>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  {revealedSecrets.has(character.id) ? (
                    <p className="text-sm text-gray-700">{character.gmSecret}</p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Click "Reveal" to see GM secret</p>
                  )}
                </div>
              </div>

              {/* Potential Conflict */}
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Potential Conflict</h4>
                <p className="text-sm text-gray-600">{character.potentialConflict}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {characters.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Characters Generated</h3>
          <p className="text-gray-600">Generate characters to get started with your campaign.</p>
        </div>
      )}
    </div>
  );
}
