import type { ContextOut } from '../types/macro-chain';

interface SceneContextOutProps {
  data: ContextOut | null;
}

export default function SceneContextOut({ data }: SceneContextOutProps) {
  if (!data) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Context Output</h3>
        <p className="text-gray-600">
          Generate scene detail to see context output.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Key Events</h4>
        <div className="bg-gray-50 rounded-lg p-3">
          {data.keyEvents.length > 0 ? (
            <div className="space-y-2">
              {data.keyEvents.map((event, index) => (
                <div key={index} className="flex items-start border-l-4 border-blue-200 pl-3">
                  <span className="text-blue-500 mr-2 font-bold">▶</span>
                  <span className="text-gray-700">{event}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No key events recorded</p>
          )}
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Revealed Information</h4>
        <div className="bg-gray-50 rounded-lg p-3">
          {data.revealedInfo.length > 0 ? (
            <div className="space-y-2">
              {data.revealedInfo.map((info, index) => (
                <div key={index} className="flex items-start border-l-4 border-green-200 pl-3">
                  <span className="text-green-500 mr-2 font-bold">💡</span>
                  <span className="text-gray-700">{info}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No information revealed</p>
          )}
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">State Changes</h4>
        <div className="bg-gray-50 rounded-lg p-3">
          {Object.keys(data.stateChanges).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.stateChanges).map(([key, value]) => (
                <div key={key} className="flex items-start">
                  <span className="font-medium text-gray-800 mr-2">{key}:</span>
                  <span className="text-gray-700">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No state changes recorded</p>
          )}
        </div>
      </div>

      {data.npcRelationships && Object.keys(data.npcRelationships).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">NPC Relationships</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="space-y-3">
              {Object.entries(data.npcRelationships).map(([npcName, relationship]) => (
                <div key={npcName} className="border-l-4 border-blue-200 pl-3">
                  <div className="font-medium text-gray-800">{npcName}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <div>Trust Level: <span className="font-medium">{relationship.trust_level}/10</span></div>
                    <div>Attitude: <span className="font-medium capitalize">{relationship.attitude}</span></div>
                    <div>Last Interaction: <span className="font-medium">{relationship.last_interaction}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.environmentalState && Object.keys(data.environmentalState).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Environmental State</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="space-y-2">
              {Object.entries(data.environmentalState).map(([key, value]) => (
                <div key={key} className="flex items-start">
                  <span className="font-medium text-gray-800 mr-2">{key}:</span>
                  <span className="text-gray-700">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.plotThreads && data.plotThreads.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Plot Threads</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="space-y-3">
              {data.plotThreads.map((thread, index) => (
                <div key={index} className="border-l-4 border-green-200 pl-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-800">{thread.title}</div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      thread.status === 'active' ? 'bg-green-100 text-green-800' :
                      thread.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {thread.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{thread.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.playerDecisions && data.playerDecisions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Player Decisions</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="space-y-3">
              {data.playerDecisions.map((decision, index) => (
                <div key={index} className="border-l-4 border-purple-200 pl-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-800">{decision.choice}</div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      decision.impact_level === 'high' ? 'bg-red-100 text-red-800' :
                      decision.impact_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {decision.impact_level} impact
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{decision.context}</p>
                  {decision.consequences.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-gray-500">Consequences:</span>
                      <div className="text-xs text-gray-600 mt-1">
                        {decision.consequences.map((consequence, idx) => (
                          <span key={idx} className="inline-block bg-gray-200 rounded px-2 py-1 mr-1 mb-1">
                            {consequence}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
