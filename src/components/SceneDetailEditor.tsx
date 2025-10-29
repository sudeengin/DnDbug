import { useState, useEffect } from 'react';
import { postJSON } from '../lib/api';
import type { MacroScene, SceneDetail, GenerateDetailRequest, EffectiveContext, ApplyEditRequest, ApplyEditResponse, AffectedScene, PropagateRequest, PropagateResponse } from '../types/macro-chain';
import logger from '@/utils/logger';
import { Button } from './ui/button';

const log = logger.scene;

interface SceneDetailEditorProps {
  sessionId?: string;
  macroScene: MacroScene;
  previousSceneDetails: SceneDetail[];
  onSceneDetailGenerated: (sceneDetail: SceneDetail) => void;
  background?: any;
  existingDetail?: SceneDetail | null;
  readOnly?: boolean;
}

export default function SceneDetailEditor({ 
  sessionId,
  macroScene, 
  previousSceneDetails, 
  onSceneDetailGenerated,
  background,
  existingDetail,
  readOnly = false
}: SceneDetailEditorProps) {
  const [sceneDetail, setSceneDetail] = useState<SceneDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [affectedScenes, setAffectedScenes] = useState<AffectedScene[]>([]);
  const [deltaSummary, setDeltaSummary] = useState<string>('');
  const [showAffectedScenes, setShowAffectedScenes] = useState(false);
  const [editingSceneDetail, setEditingSceneDetail] = useState<SceneDetail | null>(null);

  // Initialize with existing detail if provided
  useEffect(() => {
    if (existingDetail) {
      setSceneDetail(existingDetail);
    }
  }, [existingDetail]);

  const generateSceneDetail = async () => {
    try {
      setError(null);
      setLoading(true);

      // Create effective context from previous scenes
      const effectiveContext = createEffectiveContext(previousSceneDetails);
      
      log.info('Generating scene detail with context:', {
        sceneId: macroScene.id,
        macroScene,
        effectiveContext,
        previousSceneDetails
      });

      const request: GenerateDetailRequest = {
        sceneId: macroScene.id,
        macroScene,
        effectiveContext,
        sessionId
      };

      log.info('Sending request:', request);

      const response = await postJSON<{ ok: boolean; data: SceneDetail }>('/api/generate_detail', request);

      log.info('Received response:', response);

      if (!response.ok) {
        throw new Error('Failed to generate scene detail');
      }

      setSceneDetail(response.data);
      onSceneDetailGenerated(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      log.error('Error generating scene detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const createEffectiveContext = (previousDetails: SceneDetail[]): EffectiveContext => {
    const effectiveContext: EffectiveContext = {
      keyEvents: [],
      revealedInfo: [],
      stateChanges: {},
      npcRelationships: {},
      environmentalState: {},
      plotThreads: [],
      playerDecisions: []
    };

    // Process only the last 2 scenes to avoid context overflow
    const recentDetails = previousDetails.slice(-2);

    recentDetails.forEach(detail => {
      if (detail.contextOut) {
        // Merge key events
        if (detail.contextOut.keyEvents && Array.isArray(detail.contextOut.keyEvents)) {
          effectiveContext.keyEvents.push(...detail.contextOut.keyEvents);
        }

        // Merge revealed info
        if (detail.contextOut.revealedInfo && Array.isArray(detail.contextOut.revealedInfo)) {
          effectiveContext.revealedInfo.push(...detail.contextOut.revealedInfo);
        }

        // Merge state changes (later scenes override earlier ones)
        if (detail.contextOut.stateChanges && typeof detail.contextOut.stateChanges === 'object') {
          Object.assign(effectiveContext.stateChanges, detail.contextOut.stateChanges);
        }

        // Merge NPC relationships
        if (detail.contextOut.npcRelationships && typeof detail.contextOut.npcRelationships === 'object') {
          Object.assign(effectiveContext.npcRelationships, detail.contextOut.npcRelationships);
        }

        // Merge environmental state
        if (detail.contextOut.environmentalState && typeof detail.contextOut.environmentalState === 'object') {
          Object.assign(effectiveContext.environmentalState, detail.contextOut.environmentalState);
        }

        // Merge plot threads
        if (detail.contextOut.plotThreads && Array.isArray(detail.contextOut.plotThreads)) {
          effectiveContext.plotThreads.push(...detail.contextOut.plotThreads);
        }

        // Merge player decisions
        if (detail.contextOut.playerDecisions && Array.isArray(detail.contextOut.playerDecisions)) {
          effectiveContext.playerDecisions.push(...detail.contextOut.playerDecisions);
        }
      }
    });

    return effectiveContext;
  };

  const analyzeEditDelta = async (oldDetail: SceneDetail, newDetail: SceneDetail) => {
    try {
      setError(null);
      setLoading(true);

      const request: ApplyEditRequest = {
        sceneId: macroScene.id,
        oldDetail,
        newDetail
      };

      log.info('Analyzing edit delta:', request);

      const response = await postJSON<ApplyEditResponse>('/api/apply_edit', request);

      if (!response.ok) {
        throw new Error('Failed to analyze edit delta');
      }

      const { delta, affectedScenes: newAffectedScenes } = response.data;

      setDeltaSummary(delta.summary);
      setAffectedScenes(newAffectedScenes);
      setShowAffectedScenes(newAffectedScenes.length > 0);

      log.info('Edit delta analysis result:', {
        delta,
        affectedScenes: newAffectedScenes
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      log.error('Error analyzing edit delta:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    if (sceneDetail) {
      setEditingSceneDetail(JSON.parse(JSON.stringify(sceneDetail))); // Deep copy
    }
  };

  const saveEdit = async () => {
    if (editingSceneDetail && sceneDetail) {
      await analyzeEditDelta(sceneDetail, editingSceneDetail);
      setSceneDetail(editingSceneDetail);
      setEditingSceneDetail(null);
    }
  };

  const cancelEdit = () => {
    setEditingSceneDetail(null);
  };

  const hasContext = previousSceneDetails.length > 0;
  const contextCount = previousSceneDetails.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Scene Content Generator
            </h3>
            {background && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                BACKGROUND
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            Generate detailed scene content with context awareness from previous scenes
          </p>
          {readOnly && (
            <div className="mt-2 flex items-center text-sm text-amber-600">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Scene is locked - no edits allowed
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {sceneDetail && !editingSceneDetail && (
            <Button
              onClick={startEditing}
              disabled={readOnly}
              variant="secondary"
              size="sm"
            >
              {readOnly ? 'Scene Locked' : 'Edit Scene'}
            </Button>
          )}
          {editingSceneDetail && (
            <>
              <Button
                onClick={saveEdit}
                disabled={loading || readOnly}
                variant="primary"
                size="sm"
              >
                {loading ? 'Analyzing...' : readOnly ? 'Scene Locked' : 'Save Changes'}
              </Button>
              <Button
                onClick={cancelEdit}
                disabled={readOnly}
                variant="secondary"
                size="sm"
              >
                {readOnly ? 'Scene Locked' : 'Cancel'}
              </Button>
            </>
          )}
          {sceneDetail && (
            <Button
              onClick={() => setShowJson(!showJson)}
              variant="secondary"
              size="sm"
            >
              {showJson ? 'Hide JSON' : 'Show JSON'}
            </Button>
          )}
          <Button
            onClick={generateSceneDetail}
            disabled={loading || readOnly}
            variant="primary"
            size="sm"
          >
            {loading ? 'Generating...' : readOnly ? 'Scene Locked' : 'Generate Scene Content'}
          </Button>
        </div>
      </div>

      {/* Context Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Context Information</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>
            <strong>Scene:</strong> {macroScene.title}
          </div>
          <div>
            <strong>Objective:</strong> {macroScene.objective}
          </div>
          <div>
            <strong>Previous Scenes:</strong> {contextCount} scene{contextCount !== 1 ? 's' : ''} 
            {hasContext ? ' (context will be applied)' : ' (no context - first scene)'}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Affected Scenes Panel */}
      {showAffectedScenes && affectedScenes.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-orange-900">Etkilenen Sahneler</h4>
            <button
              onClick={() => setShowAffectedScenes(false)}
              className="text-orange-600 hover:text-orange-800 text-sm"
            >
              ✕
            </button>
          </div>
          
          {deltaSummary && (
            <div className="mb-3 p-2 bg-orange-100 rounded text-sm text-orange-800">
              <strong>Değişiklik Özeti:</strong> {deltaSummary}
            </div>
          )}
          
          <div className="space-y-2">
            {affectedScenes.map((scene, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{scene.sceneId}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    scene.severity === 'hard' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {scene.severity === 'hard' ? 'Büyük Etki' : 'Küçük Etki'}
                  </span>
                </div>
                <div className="text-xs text-gray-600">{scene.reason}</div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 text-xs text-orange-700">
            <strong>Öneri:</strong> Etkilenen sahneler yeniden üretilmeli. Büyük etki sahneleri öncelikli olarak yeniden oluşturulmalı.
          </div>
        </div>
      )}

      {/* Scene Detail Display */}
      {sceneDetail && (
        <div className="space-y-4">
          {!showJson ? (
            editingSceneDetail ? (
              // Edit Mode
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-yellow-900 mb-3">Edit Mode</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={editingSceneDetail.title}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          title: e.target.value
                        })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Objective</label>
                      <input
                        type="text"
                        value={editingSceneDetail.objective}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          objective: e.target.value
                        })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Narrative Core - Goal</label>
                      <input
                        type="text"
                        value={editingSceneDetail.narrativeCore?.goal || ''}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          narrativeCore: {
                            ...editingSceneDetail.narrativeCore,
                            goal: e.target.value
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Narrative Core - Conflict</label>
                      <input
                        type="text"
                        value={editingSceneDetail.narrativeCore?.conflict || ''}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          narrativeCore: {
                            ...editingSceneDetail.narrativeCore,
                            conflict: e.target.value
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Narrative Core - Revelation</label>
                      <input
                        type="text"
                        value={editingSceneDetail.narrativeCore?.revelation || ''}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          narrativeCore: {
                            ...editingSceneDetail.narrativeCore,
                            revelation: e.target.value
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Narrative Core - Transition</label>
                      <input
                        type="text"
                        value={editingSceneDetail.narrativeCore?.transition || ''}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          narrativeCore: {
                            ...editingSceneDetail.narrativeCore,
                            transition: e.target.value
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                      <textarea
                        value={editingSceneDetail.dynamicElements?.environment || ''}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          dynamicElements: {
                            ...editingSceneDetail.dynamicElements,
                            environment: e.target.value
                          }
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Key Events (one per line)</label>
                      <textarea
                        value={editingSceneDetail.keyEvents?.join('\n') || ''}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          keyEvents: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Revealed Info (one per line)</label>
                      <textarea
                        value={editingSceneDetail.revealedInfo?.join('\n') || ''}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          revealedInfo: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Epic Intro</label>
                      <textarea
                        value={editingSceneDetail.epicIntro || ''}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          epicIntro: e.target.value
                        })}
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Setting</label>
                      <input
                        type="text"
                        value={editingSceneDetail.setting || ''}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          setting: e.target.value
                        })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Atmosphere</label>
                      <input
                        type="text"
                        value={editingSceneDetail.atmosphere || ''}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          atmosphere: e.target.value
                        })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Beats (one per line)</label>
                      <textarea
                        value={editingSceneDetail.beats?.join('\n') || ''}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          beats: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rewards (one per line)</label>
                      <textarea
                        value={editingSceneDetail.rewards?.join('\n') || ''}
                        onChange={(e) => setEditingSceneDetail({
                          ...editingSceneDetail,
                          rewards: e.target.value.split('\n').filter(line => line.trim())
                        })}
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Scene Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div><strong>Title:</strong> {sceneDetail.title}</div>
                  <div><strong>Objective:</strong> {sceneDetail.objective}</div>
                  {sceneDetail.sceneType && (
                    <div><strong>Scene Type:</strong> {sceneDetail.sceneType}</div>
                  )}
                  {sceneDetail.sequence && (
                    <div><strong>Sequence:</strong> {sceneDetail.sequence}</div>
                  )}
                </div>
              </div>

              {/* Narrative Core */}
              {sceneDetail.narrativeCore && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Narrative Core</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div><strong>Goal:</strong> {sceneDetail.narrativeCore.goal}</div>
                    <div><strong>Conflict:</strong> {sceneDetail.narrativeCore.conflict}</div>
                    <div><strong>Revelation:</strong> {sceneDetail.narrativeCore.revelation}</div>
                    <div><strong>Transition:</strong> {sceneDetail.narrativeCore.transition}</div>
                  </div>
                </div>
              )}

              {/* Dynamic Elements */}
              {sceneDetail.dynamicElements && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Dynamic Elements</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {sceneDetail.dynamicElements.environment && (
                      <div><strong>Environment:</strong> {sceneDetail.dynamicElements.environment}</div>
                    )}
                    {sceneDetail.dynamicElements.challenge && (
                      <div>
                        <strong>Challenge:</strong>
                        <div className="ml-4 mt-1 space-y-1">
                          <div><strong>Type:</strong> {sceneDetail.dynamicElements.challenge.type}</div>
                          {sceneDetail.dynamicElements.challenge.dc && (
                            <div><strong>DC:</strong> {sceneDetail.dynamicElements.challenge.dc}</div>
                          )}
                          {sceneDetail.dynamicElements.challenge.failureConsequence && (
                            <div><strong>Failure Consequence:</strong> {sceneDetail.dynamicElements.challenge.failureConsequence}</div>
                          )}
                        </div>
                      </div>
                    )}
                    {sceneDetail.dynamicElements.revealedInfo && sceneDetail.dynamicElements.revealedInfo.length > 0 && (
                      <div>
                        <strong>Revealed Info:</strong>
                        <ul className="mt-1 space-y-1">
                          {sceneDetail.dynamicElements.revealedInfo.map((info, index) => (
                            <li key={index} className="text-gray-700">• {info}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* NPC Profiles */}
              {sceneDetail.dynamicElements?.npcProfiles && sceneDetail.dynamicElements.npcProfiles.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">NPC Profiles</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {sceneDetail.dynamicElements.npcProfiles.map((npc, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="font-semibold text-gray-900 mb-2">{npc.name}</div>
                        <div className="space-y-1 text-sm">
                          {npc.motivation && (
                            <div><strong>Motivation:</strong> {npc.motivation}</div>
                          )}
                          {npc.personality && (
                            <div><strong>Personality:</strong> {npc.personality}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GM Narrative */}
              {sceneDetail.gmNarrative && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">GM Narrative</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{sceneDetail.gmNarrative}</p>
                  </div>
                </div>
              )}

              {/* Key Events */}
              {sceneDetail.keyEvents && sceneDetail.keyEvents.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Key Events</h4>
                  <ul className="bg-gray-50 rounded-lg p-4 space-y-1">
                    {sceneDetail.keyEvents.map((event, index) => (
                      <li key={index} className="text-gray-700">• {event}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Revealed Info */}
              {sceneDetail.revealedInfo && sceneDetail.revealedInfo.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Revealed Information</h4>
                  <ul className="bg-gray-50 rounded-lg p-4 space-y-1">
                    {sceneDetail.revealedInfo.map((info, index) => (
                      <li key={index} className="text-gray-700">• {info}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Opening State and Trigger */}
              {sceneDetail.openingStateAndTrigger && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Opening State and Trigger</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div><strong>State:</strong> {sceneDetail.openingStateAndTrigger.state}</div>
                    <div><strong>Trigger:</strong> {sceneDetail.openingStateAndTrigger.trigger}</div>
                  </div>
                </div>
              )}

              {/* Environment and Sensory */}
              {sceneDetail.environmentAndSensory && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Environment and Sensory Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {sceneDetail.environmentAndSensory.visual && sceneDetail.environmentAndSensory.visual.length > 0 && (
                      <div>
                        <strong>Visual:</strong>
                        <ul className="mt-1 space-y-1">
                          {sceneDetail.environmentAndSensory.visual.map((item, index) => (
                            <li key={index} className="text-gray-700">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sceneDetail.environmentAndSensory.auditory && sceneDetail.environmentAndSensory.auditory.length > 0 && (
                      <div>
                        <strong>Auditory:</strong>
                        <ul className="mt-1 space-y-1">
                          {sceneDetail.environmentAndSensory.auditory.map((item, index) => (
                            <li key={index} className="text-gray-700">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sceneDetail.environmentAndSensory.olfactory && sceneDetail.environmentAndSensory.olfactory.length > 0 && (
                      <div>
                        <strong>Olfactory:</strong>
                        <ul className="mt-1 space-y-1">
                          {sceneDetail.environmentAndSensory.olfactory.map((item, index) => (
                            <li key={index} className="text-gray-700">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sceneDetail.environmentAndSensory.tactile_or_thermal && sceneDetail.environmentAndSensory.tactile_or_thermal.length > 0 && (
                      <div>
                        <strong>Tactile/Thermal:</strong>
                        <ul className="mt-1 space-y-1">
                          {sceneDetail.environmentAndSensory.tactile_or_thermal.map((item, index) => (
                            <li key={index} className="text-gray-700">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sceneDetail.environmentAndSensory.other && sceneDetail.environmentAndSensory.other.length > 0 && (
                      <div>
                        <strong>Other:</strong>
                        <ul className="mt-1 space-y-1">
                          {sceneDetail.environmentAndSensory.other.map((item, index) => (
                            <li key={index} className="text-gray-700">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Beats */}
              {sceneDetail.beats && sceneDetail.beats.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Scene Beats</h4>
                  <ul className="bg-gray-50 rounded-lg p-4 space-y-1">
                    {sceneDetail.beats.map((beat, index) => (
                      <li key={index} className="text-gray-700">• {beat}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Checks */}
              {sceneDetail.checks && sceneDetail.checks.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Skill Checks</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {sceneDetail.checks.map((check, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-gray-900">{check.check_label}</span>
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {check.type === 'skill' ? 'Skill' : 'Save'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div><strong>When:</strong> {check.when}</div>
                          {check.dnd_skill && (
                            <div><strong>D&D Skill:</strong> {check.dnd_skill}</div>
                          )}
                          {check.dc && (
                            <div><strong>DC:</strong> {check.dc}</div>
                          )}
                          <div><strong>Success:</strong> {check.on_success}</div>
                          <div><strong>Failure:</strong> {check.on_fail}</div>
                          {check.advantage_hints && check.advantage_hints.length > 0 && (
                            <div>
                              <strong>Advantage Hints:</strong>
                              <ul className="mt-1 space-y-1">
                                {check.advantage_hints.map((hint, hintIndex) => (
                                  <li key={hintIndex} className="text-gray-600">• {hint}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clues and Foreshadowing */}
              {sceneDetail.cluesAndForeshadowing && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Clues and Foreshadowing</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {sceneDetail.cluesAndForeshadowing.clues && sceneDetail.cluesAndForeshadowing.clues.length > 0 && (
                      <div>
                        <strong>Clues:</strong>
                        <ul className="mt-1 space-y-1">
                          {sceneDetail.cluesAndForeshadowing.clues.map((clue, index) => (
                            <li key={index} className="text-gray-700">• {clue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sceneDetail.cluesAndForeshadowing.foreshadowing && sceneDetail.cluesAndForeshadowing.foreshadowing.length > 0 && (
                      <div>
                        <strong>Foreshadowing:</strong>
                        <ul className="mt-1 space-y-1">
                          {sceneDetail.cluesAndForeshadowing.foreshadowing.map((item, index) => (
                            <li key={index} className="text-gray-700">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* NPC Mini Cards */}
              {sceneDetail.npcMiniCards && sceneDetail.npcMiniCards.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">NPCs</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {sceneDetail.npcMiniCards.map((npc, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="font-semibold text-gray-900 mb-2">{npc.name}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>Role:</strong> {npc.role}</div>
                          <div><strong>Demeanor:</strong> {npc.demeanor}</div>
                          <div><strong>Quirk:</strong> {npc.quirk}</div>
                          <div><strong>Goal:</strong> {npc.goal}</div>
                          <div className="col-span-2"><strong>Secret:</strong> {npc.secret}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Combat Probability and Balance */}
              {sceneDetail.combatProbabilityAndBalance && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Combat Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <strong>Likelihood:</strong>
                      <span className={`px-2 py-1 text-xs rounded ${
                        sceneDetail.combatProbabilityAndBalance.likelihood === 'high' 
                          ? 'bg-red-100 text-red-800'
                          : sceneDetail.combatProbabilityAndBalance.likelihood === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {sceneDetail.combatProbabilityAndBalance.likelihood}
                      </span>
                    </div>
                    {sceneDetail.combatProbabilityAndBalance.enemies && sceneDetail.combatProbabilityAndBalance.enemies.length > 0 && (
                      <div>
                        <strong>Enemies:</strong>
                        <ul className="mt-1 space-y-1">
                          {sceneDetail.combatProbabilityAndBalance.enemies.map((enemy, index) => (
                            <li key={index} className="text-gray-700">• {enemy}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div><strong>Balance Notes:</strong> {sceneDetail.combatProbabilityAndBalance.balance_notes}</div>
                    {sceneDetail.combatProbabilityAndBalance.escape_or_alt_paths && sceneDetail.combatProbabilityAndBalance.escape_or_alt_paths.length > 0 && (
                      <div>
                        <strong>Escape/Alternative Paths:</strong>
                        <ul className="mt-1 space-y-1">
                          {sceneDetail.combatProbabilityAndBalance.escape_or_alt_paths.map((path, index) => (
                            <li key={index} className="text-gray-700">• {path}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Exit Conditions and Transition */}
              {sceneDetail.exitConditionsAndTransition && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Exit Conditions and Transition</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {sceneDetail.exitConditionsAndTransition.exit_conditions && sceneDetail.exitConditionsAndTransition.exit_conditions.length > 0 && (
                      <div>
                        <strong>Exit Conditions:</strong>
                        <ul className="mt-1 space-y-1">
                          {sceneDetail.exitConditionsAndTransition.exit_conditions.map((condition, index) => (
                            <li key={index} className="text-gray-700">• {condition}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div><strong>Transition to Next:</strong> {sceneDetail.exitConditionsAndTransition.transition_to_next}</div>
                  </div>
                </div>
              )}

              {/* Rewards */}
              {sceneDetail.rewards && sceneDetail.rewards.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Rewards</h4>
                  <ul className="bg-gray-50 rounded-lg p-4 space-y-1">
                    {sceneDetail.rewards.map((reward, index) => (
                      <li key={index} className="text-gray-700">• {reward}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* State Changes */}
              {sceneDetail.stateChanges && Object.keys(sceneDetail.stateChanges).length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">State Changes</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(sceneDetail.stateChanges, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Context Out */}
              {(sceneDetail.contextOut || sceneDetail.dynamicElements?.contextOut) && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Context Output</h4>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="space-y-3">
                      {(sceneDetail.contextOut?.keyEvents || sceneDetail.dynamicElements?.contextOut?.story_facts || sceneDetail.dynamicElements?.contextOut?.characterMoments) && (
                        <div>
                          <strong className="text-blue-900">Key Events:</strong>
                          <ul className="mt-1 space-y-1">
                            {(sceneDetail.contextOut?.keyEvents || []).map((event, index) => (
                              <li key={index} className="text-blue-800 text-sm">• {event}</li>
                            ))}
                            {(sceneDetail.dynamicElements?.contextOut?.story_facts || []).map((event, index) => (
                              <li key={`story_${index}`} className="text-blue-800 text-sm">• {event}</li>
                            ))}
                            {(sceneDetail.dynamicElements?.contextOut?.characterMoments || []).map((event, index) => (
                              <li key={`char_${index}`} className="text-blue-800 text-sm">• {event}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {sceneDetail.contextOut?.revealedInfo && sceneDetail.contextOut.revealedInfo.length > 0 && (
                        <div>
                          <strong className="text-blue-900">Revealed Information:</strong>
                          <ul className="mt-1 space-y-1">
                            {sceneDetail.contextOut.revealedInfo.map((info, index) => (
                              <li key={index} className="text-blue-800 text-sm">• {info}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(sceneDetail.contextOut?.stateChanges && Object.keys(sceneDetail.contextOut.stateChanges).length > 0) || (sceneDetail.dynamicElements?.contextOut?.world_state && Object.keys(sceneDetail.dynamicElements.contextOut.world_state).length > 0) && (
                        <div>
                          <strong className="text-blue-900">State Changes:</strong>
                          <pre className="mt-1 text-sm text-blue-800 whitespace-pre-wrap">
                            {JSON.stringify({...sceneDetail.contextOut?.stateChanges, ...sceneDetail.dynamicElements?.contextOut?.world_state}, null, 2)}
                          </pre>
                        </div>
                      )}
                      {sceneDetail.contextOut?.npcRelationships && Object.keys(sceneDetail.contextOut.npcRelationships).length > 0 && (
                        <div>
                          <strong className="text-blue-900">NPC Relationships:</strong>
                          <div className="mt-1 space-y-2">
                            {Object.entries(sceneDetail.contextOut.npcRelationships).map(([npcName, relationship]) => (
                              <div key={npcName} className="text-blue-800 text-sm">
                                <strong>{npcName}:</strong> Trust {relationship.trust_level}/10, {relationship.attitude} attitude
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(sceneDetail.contextOut?.environmentalState && Object.keys(sceneDetail.contextOut.environmentalState).length > 0) || (sceneDetail.dynamicElements?.contextOut?.world_seeds && Object.keys(sceneDetail.dynamicElements.contextOut.world_seeds).length > 0) && (
                        <div>
                          <strong className="text-blue-900">Environmental State:</strong>
                          <pre className="mt-1 text-sm text-blue-800 whitespace-pre-wrap">
                            {JSON.stringify({...sceneDetail.contextOut?.environmentalState, ...sceneDetail.dynamicElements?.contextOut?.world_seeds}, null, 2)}
                          </pre>
                        </div>
                      )}
                      {sceneDetail.contextOut?.plotThreads && sceneDetail.contextOut.plotThreads.length > 0 && (
                        <div>
                          <strong className="text-blue-900">Plot Threads:</strong>
                          <ul className="mt-1 space-y-1">
                            {sceneDetail.contextOut.plotThreads.map((thread, index) => (
                              <li key={index} className="text-blue-800 text-sm">• {thread.title}: {thread.description}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {sceneDetail.contextOut?.playerDecisions && sceneDetail.contextOut.playerDecisions.length > 0 && (
                        <div>
                          <strong className="text-blue-900">Player Decisions:</strong>
                          <ul className="mt-1 space-y-1">
                            {sceneDetail.contextOut.playerDecisions.map((decision, index) => (
                              <li key={index} className="text-blue-800 text-sm">• {decision.choice}: {decision.context}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </div>
            )
          ) : (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">JSON Output</h4>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-green-400 text-sm whitespace-pre-wrap">
                  {JSON.stringify(sceneDetail, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {!sceneDetail && !loading && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Scene Content Generated</h3>
          <p className="text-gray-600">
            Click "Generate Scene Content" to create detailed scene content with context awareness.
          </p>
        </div>
      )}
    </div>
  );
}
