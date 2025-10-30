import { Button } from '../ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import type { Character } from '../../types/macro-chain';

interface CharacterDetailPageProps {
  character: Character;
  onBack: () => void;
  onEdit?: () => void;
}

export default function CharacterDetailPage({ character, onBack, onEdit }: CharacterDetailPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-200">{character.name}</h2>
          <p className="text-gray-400 mt-1">{character.subrace || character.race} • {character.class}</p>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="primary" size="sm" onClick={onEdit} className="gap-2">
              <Pencil className="w-4 h-4" /> Edit Character
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to list
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Personality</h3>
          <p className="text-sm text-gray-400">{character.personality}</p>
        </div>
        <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Motivation</h3>
          <p className="text-sm text-gray-400">{character.motivation}</p>
        </div>
        <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Connection to Story</h3>
          <p className="text-sm text-gray-400">{character.connectionToStory}</p>
        </div>
        <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Voice Tone</h3>
          <p className="text-sm text-gray-400 italic">{character.voiceTone ? `"${character.voiceTone}"` : '-'}</p>
        </div>

        <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Background History</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{character.backgroundHistory}</p>
        </div>

        <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Flaw or Weakness</h3>
          <p className="text-sm text-gray-400">{character.flawOrWeakness}</p>
        </div>
        <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">GM's Reveal</h3>
          <p className="text-sm text-gray-400">{character.gmSecret}</p>
        </div>

        {character.potentialConflict && (
          <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4 md:col-span-2">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Potential Conflict</h3>
            <p className="text-sm text-gray-400">{character.potentialConflict}</p>
          </div>
        )}

        {(character.keyRelationships && character.keyRelationships.length > 0) && (
          <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4 md:col-span-2">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Key Relationships</h3>
            <div className="text-sm text-gray-400 space-y-1">
              {character.keyRelationships.map((rel, idx) => (
                <div key={idx}>• {rel}</div>
              ))}
            </div>
          </div>
        )}

        {(character.equipmentPreferences && character.equipmentPreferences.length > 0) && (
          <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Equipment Preferences</h3>
            <div className="text-sm text-gray-400 space-y-1">
              {character.equipmentPreferences.map((item, idx) => (
                <div key={idx}>• {item}</div>
              ))}
            </div>
          </div>
        )}
        {character.inventoryHint && (
          <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Inventory Head</h3>
            <p className="text-sm text-gray-400">{character.inventoryHint}</p>
          </div>
        )}

        {(character.languages && character.languages.length > 0) && (
          <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Languages</h3>
            <p className="text-sm text-gray-400">{character.languages.join(', ')}</p>
          </div>
        )}
        {character.alignment && (
          <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Alignment</h3>
            <p className="text-sm text-gray-400">{character.alignment}</p>
          </div>
        )}
        {character.deity && (
          <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Deity</h3>
            <p className="text-sm text-gray-400">{character.deity}</p>
          </div>
        )}

        {character.physicalDescription && (
          <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4 md:col-span-2">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Physical Description</h3>
            <p className="text-sm text-gray-400">{character.physicalDescription}</p>
          </div>
        )}

        {(character.age || character.height) && (
          <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Vitals</h3>
            <div className="text-sm text-gray-400 space-y-1">
              {character.age !== undefined && <div>Age: {character.age}</div>}
              {character.height && <div>Height: {character.height}</div>}
              {character.subrace && <div>Subrace: {character.subrace}</div>}
            </div>
          </div>
        )}

        {(character.proficiencies && character.proficiencies.length > 0) && (
          <div className="bg-[#151A22] border border-[#2A3340] rounded-[12px] p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Proficiencies</h3>
            <div className="text-sm text-gray-400 flex flex-wrap gap-2">
              {character.proficiencies.map((prof, idx) => (
                <span key={idx} className="bg-[#1C1F2B] border border-[#2A3340] rounded-full px-2 py-0.5 text-xs">{prof}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


