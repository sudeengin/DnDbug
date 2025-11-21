import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle2, Lock, ChevronRight, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Edit, Trash2 } from 'lucide-react';
import type { Character } from '../types/macro-chain';

interface CharactersTableProps {
  characters: Character[];
  isLocked: boolean;
  onEditCharacter: (character: Character) => void;
  onDeleteCharacter?: (character: Character) => void;
  getCharacterStatusBadge?: (character: Character) => { label: string; variant: 'default' | 'outline'; className: string };
  onViewCharacter?: (character: Character) => void;
  hasCharacterSheet?: (characterId: string) => boolean;
}

export default function CharactersTable({ 
  characters, 
  isLocked, 
  onEditCharacter, 
  onDeleteCharacter, 
  getCharacterStatusBadge, 
  onViewCharacter,
  hasCharacterSheet,
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

  const alignmentPillClass = 'text-xs text-gray-300 border border-gray-600 bg-transparent';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-200">Character Roster</h3>
        <Badge variant={isLocked ? 'upToDate' : 'outline'}>
          {isLocked ? 'Locked' : 'Draft'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {characters.map((character) => (
          <Card key={character.id} className="hover:shadow-md transition-shadow bg-[#151A22] border-[#2A3340]">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-semibold text-gray-200">
                        {character.name}
                      </CardTitle>
                      {/* Character sheet indicator */}
                      {hasCharacterSheet?.(character.id) && (
                        <div 
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-900/20 text-blue-300 border border-blue-700/40"
                          title="Character Sheet Created"
                        >
                          <FileText className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    {/* Minimal status indicator */}
                    <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
                      {isLocked ? (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          <span>Locked</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Draft</span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Summary line - Core identity: Race, Class, Role */}
                  <div className="text-sm text-gray-400">
                    {[
                      character.race,
                      character.class,
                      character.role
                    ].filter(Boolean).join(' • ')}
                  </div>
                </div>
                
                {/* Top-right icons aligned */}
                <div className="flex items-center justify-end gap-2 ml-2" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Badges - Complementary information (not Race, Class, or Role) */}
              <div className="flex flex-wrap gap-1">
                {([
                  character.alignment,
                  character.subrace,
                  character.deity
                ].filter(Boolean) as string[]).slice(0, 2).map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs text-gray-300 border-gray-600 bg-transparent">{tag}</Badge>
                ))}
              </div>

              {/* Actions aligned bottom-right */}
              <div className="flex items-center justify-end gap-2 pt-2">
                {onViewCharacter && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onViewCharacter(character)}
                    className="h-8 px-2"
                    title="View Character"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                {!isLocked && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEditCharacter(character)}
                    className="h-8 px-2"
                    title="Edit Character"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {!isLocked && onDeleteCharacter && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeleteCharacter(character)}
                    className="h-8 px-2"
                    title="Delete Character"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {characters.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-200 mb-1">No Characters Generated</h3>
          <p className="text-gray-400">Generate characters to get started with your campaign.</p>
        </div>
      )}
    </div>
  );
}
