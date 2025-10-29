import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Edit, Save, Trash2, X } from 'lucide-react';
import type { Character } from '../types/macro-chain';

interface CharactersTableProps {
  characters: Character[];
  isLocked: boolean;
  onEditCharacter: (character: Character) => void;
  onSaveCharacter?: (character: Character) => void;
  onDiscardCharacter?: (character: Character) => void;
  onDeleteCharacter?: (character: Character) => void;
  getCharacterStatusBadge?: (character: Character) => { label: string; variant: 'default' | 'outline'; className: string };
}

export default function CharactersTable({ 
  characters, 
  isLocked, 
  onEditCharacter, 
  onSaveCharacter, 
  onDiscardCharacter, 
  onDeleteCharacter, 
  getCharacterStatusBadge 
}: CharactersTableProps) {
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
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {character.name}
                    </CardTitle>
                    {/* Status Badge */}
                    {getCharacterStatusBadge && (
                      <Badge 
                        variant={getCharacterStatusBadge(character).variant}
                        className={getCharacterStatusBadge(character).className}
                      >
                        {getCharacterStatusBadge(character).label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
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
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-1 ml-2">
                  {!isLocked && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditCharacter(character)}
                      className="h-8 w-8 p-0"
                      title="Edit Character"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Generated character actions */}
                  {(!character.status || character.status === 'generated') && (
                    <>
                      {onSaveCharacter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSaveCharacter(character)}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                          title="Save Character"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      )}
                      {onDiscardCharacter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDiscardCharacter(character)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          title="Discard Character"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                  
                  {/* Saved character actions */}
                  {character.status === 'saved' && onDeleteCharacter && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteCharacter(character)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      title="Delete Character"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Race:</span>
                  <span className="ml-1 text-gray-900">{character.race}</span>
                </div>
                <div>
                  <span className="text-gray-600">Class:</span>
                  <span className="ml-1 text-gray-900">{character.class}</span>
                </div>
                {character.subrace && (
                  <div>
                    <span className="text-gray-600">Subrace:</span>
                    <span className="ml-1 text-gray-900">{character.subrace}</span>
                  </div>
                )}
                {character.deity && (
                  <div>
                    <span className="text-gray-600">Deity:</span>
                    <span className="ml-1 text-gray-900">{character.deity}</span>
                  </div>
                )}
                {character.age && (
                  <div>
                    <span className="text-gray-600">Age:</span>
                    <span className="ml-1 text-gray-900">{character.age} years</span>
                  </div>
                )}
                {character.height && (
                  <div>
                    <span className="text-gray-600">Height:</span>
                    <span className="ml-1 text-gray-900">{character.height}</span>
                  </div>
                )}
                {/* Debug info */}
                {!character.age && (
                  <div className="text-xs text-gray-500 italic">
                    Age: {character.age === undefined ? 'Not defined' : character.age}
                  </div>
                )}
                {!character.height && (
                  <div className="text-xs text-gray-500 italic">
                    Height: {character.height === undefined ? 'Not defined' : character.height}
                  </div>
                )}
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

              {/* Physical Description */}
              {character.physicalDescription && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Physical Description</h4>
                  <p className="text-sm text-gray-600">{character.physicalDescription}</p>
                </div>
              )}

              {/* Languages */}
              {character.languages && character.languages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Languages</h4>
                  <div className="flex flex-wrap gap-1">
                    {character.languages.map((language, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Debug: Show languages even if empty */}
              {(!character.languages || character.languages.length === 0) && (
                <div className="text-xs text-gray-500 italic">
                  Languages: {character.languages ? 'Empty array' : 'Not defined'}
                </div>
              )}

              {/* Equipment Preferences */}
              {character.equipmentPreferences && character.equipmentPreferences.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Equipment Preferences</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {character.equipmentPreferences.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Proficiencies */}
              {character.proficiencies && character.proficiencies.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Proficiencies</h4>
                  <div className="flex flex-wrap gap-1">
                    {character.proficiencies.map((proficiency, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {proficiency}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Debug: Show proficiencies even if empty */}
              {(!character.proficiencies || character.proficiencies.length === 0) && (
                <div className="text-xs text-gray-500 italic">
                  Proficiencies: {character.proficiencies ? 'Empty array' : 'Not defined'}
                </div>
              )}

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
