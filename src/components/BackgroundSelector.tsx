import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Lock, Info, CheckCircle2, X } from 'lucide-react';
import type { Background } from '../types/srd-2014';
import { theme } from '@/lib/theme';
import { debug } from '@/lib/debugCollector';

interface BackgroundSelectorProps {
  backgrounds: Background[];
  selectedBackground: string | null;
  suggestedBackgrounds?: { name: string; reason: string }[];
  onSelect: (backgroundName: string) => void;
  onLock: () => void;
  isLocked: boolean;
  filterOptions?: {
    races?: string[];
    classes?: string[];
    themes?: string[];
  };
}

export default function BackgroundSelector({
  backgrounds,
  selectedBackground,
  suggestedBackgrounds = [],
  onSelect,
  onLock,
  isLocked,
}: BackgroundSelectorProps) {
  const [detailView, setDetailView] = useState<Background | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const isSuggested = (bgName: string) => 
    suggestedBackgrounds.some(s => s.name === bgName);
  
  const getSuggestion = (bgName: string) => 
    suggestedBackgrounds.find(s => s.name === bgName);

  const filteredBackgrounds = filter === 'all' 
    ? backgrounds 
    : filter === 'suggested'
    ? backgrounds.filter(bg => isSuggested(bg.name))
    : backgrounds;

  return (
    <div className="space-y-4">
      {/* Filter Options */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-400">Filter:</span>
        <Button
          size="sm"
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
          className="h-8"
        >
          All ({backgrounds.length})
        </Button>
        {suggestedBackgrounds.length > 0 && (
          <Button
            size="sm"
            variant={filter === 'suggested' ? 'primary' : 'secondary'}
            onClick={() => setFilter('suggested')}
            className="h-8"
          >
            Suggested ({suggestedBackgrounds.length})
          </Button>
        )}
      </div>

      {/* Compact Grid of Background Cards */}
      <div className="border border-[#2A3340] rounded-xl bg-[#151A22] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredBackgrounds.map(bg => {
          const isSelected = selectedBackground === bg.name;
          const suggested = isSuggested(bg.name);
          const suggestion = getSuggestion(bg.name);

          return (
            <Card
              key={bg.name}
              className={`group relative cursor-pointer transition-all duration-200 hover:scale-[1.02] rounded-xl ${
                isSelected 
                  ? 'bg-[#1C1F2B] border-2 border-[#ef6646] shadow-lg shadow-[#ef6646]/20' 
                  : 'bg-[#151a22] border border-[#2A3340] hover:border-[#ef6646]/50 shadow-md shadow-[rgba(0,0,0,0.25)]'
              }`}
              onClick={() => !isLocked && onSelect(bg.name)}
            >
              <CardContent className="p-0">
                <div className="px-4 pt-4 pb-3 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {bg.name}
                    </h3>
                    {bg.feature?.name && (
                      <p className="text-xs text-gray-400 truncate">
                        {bg.feature.name}
                      </p>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailView(bg);
                      }}
                      className="text-[11px] text-[#ef6646] hover:text-[#ff7a5c] transition-colors underline-offset-2 hover:underline"
                      title="View full details"
                    >
                      See details
                    </button>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  )}
                </div>

                {/* Quick Info */}
                <div className="text-[11px] text-gray-400 space-y-2">
                  {bg.skillProficiencies?.length > 0 && (
                    <div className="truncate">
                      <span className="text-gray-500 font-medium">Skills:</span> {bg.skillProficiencies.join(', ')}
                    </div>
                  )}
                  {bg.feature?.description && (
                    <p className="line-clamp-2 text-gray-500 leading-relaxed">
                      {bg.feature.description.substring(0, 80)}...
                    </p>
                  )}
                </div>

                {/* Suggested Reason */}
                {suggested && suggestion && (
                  <div className="bg-blue-900/20 border border-blue-600/30 rounded-md p-2.5 mt-1">
                    <p className="text-[10px] text-blue-300 line-clamp-2 leading-relaxed">{suggestion.reason}</p>
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      </div>

      {/* Sticky Lock Button */}
      {selectedBackground && !isLocked && (
        <div className="sticky bottom-0 left-0 right-0 z-10 bg-[#151A22]/95 backdrop-blur-sm border-t border-[#2A3340] pt-4 pb-4 mt-4 shadow-lg">
          <div className="flex items-center justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                debug.info('BackgroundSelector', 'Lock button clicked', {
                  selectedBackground,
                  isLocked
                });
                console.log('[BackgroundSelector] Lock button clicked', { selectedBackground, isLocked });
                onLock();
              }}
              className="gap-2 shadow-lg shadow-[#ef6646]/20 hover:shadow-[#ef6646]/40"
            >
              <Lock className="w-4 h-4" />
              Save & Lock Background → Continue to Step 2
            </Button>
          </div>
        </div>
      )}

      {/* Info if no selection made */}
      {!selectedBackground && (
        <div className="flex items-center gap-2 text-sm text-gray-400 bg-[#1C1F2B] border border-[#2A3340] rounded-lg p-3">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>Choose a background to continue to Step 2: Assign Ability Scores</span>
        </div>
      )}

      {/* Detail Modal */}
      {detailView && (
        <div 
          className={theme.modal.overlay}
          onClick={() => setDetailView(null)}
        >
          <div 
            className={`${theme.modal.containerLarge} max-w-3xl`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#2A3340]">
              <div>
                <h2 className="text-2xl font-bold text-white">{detailView.name}</h2>
                {detailView.feature?.name && (
                  <p className="text-sm text-gray-400 mt-1">
                    Feature: <span className="text-[#ef6646]">{detailView.feature.name}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setDetailView(null)}
                className="p-2 hover:bg-[#1C1F2B] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Feature Description */}
              {detailView.feature?.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Feature Description</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {detailView.feature.description}
                  </p>
                </div>
              )}

              {/* Proficiencies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detailView.skillProficiencies?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Skill Proficiencies</h3>
                    <div className="flex flex-wrap gap-2">
                      {detailView.skillProficiencies.map(skill => (
                        <Badge key={skill} variant="outline" className="bg-[#1C1F2B] text-gray-300 border-[#2A3340]">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {detailView.toolProficiencies?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Tool Proficiencies</h3>
                    <div className="flex flex-wrap gap-2">
                      {detailView.toolProficiencies.map(tool => (
                        <Badge key={tool} variant="outline" className="bg-[#1C1F2B] text-gray-300 border-[#2A3340]">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {detailView.languages?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {detailView.languages.map(lang => (
                        <Badge key={lang} variant="outline" className="bg-[#1C1F2B] text-gray-300 border-[#2A3340]">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {detailView.equipment?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Starting Equipment</h3>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {detailView.equipment.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#ef6646] mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Personality Traits */}
              {detailView.personalityTraits?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Suggested Personality Traits</h3>
                  <ul className="text-xs text-gray-400 space-y-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {detailView.personalityTraits.slice(0, 4).map((trait, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-[#1C1F2B] p-2 rounded">
                        <span className="text-[#ef6646] mt-0.5">•</span>
                        <span>{trait}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ideals */}
              {detailView.ideals?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Ideals</h3>
                  <ul className="text-xs text-gray-400 space-y-1">
                    {detailView.ideals.slice(0, 3).map((ideal, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-[#1C1F2B] p-2 rounded">
                        <span className="text-[#ef6646] mt-0.5">•</span>
                        <span>{ideal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#2A3340]">
              <Button
                variant="secondary"
                onClick={() => setDetailView(null)}
              >
                Close
              </Button>
              {!isLocked && (
                <Button
                  variant="primary"
                  onClick={() => {
                    onSelect(detailView.name);
                    setDetailView(null);
                  }}
                  disabled={selectedBackground === detailView.name}
                >
                  {selectedBackground === detailView.name ? 'Selected' : `Select ${detailView.name}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

