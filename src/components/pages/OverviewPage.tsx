import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { getJSON } from '../../lib/api';
import type { Project, SessionContext } from '../../types/macro-chain';
import logger from '@/utils/logger';

const log = logger.ui;

interface OverviewPageProps {
  sessionId: string;
  project: Project;
  context: SessionContext | null;
  onContextUpdate: (context: SessionContext | null) => void;
}

export default function OverviewPage({ sessionId, project, context, onContextUpdate }: OverviewPageProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId && !context) {
      fetchContext();
    }
  }, [sessionId]);

  const fetchContext = async () => {
    try {
      setLoading(true);
      const response = await getJSON<{ ok: boolean; data: SessionContext | null }>(`/api/context/get?sessionId=${sessionId}`);
      if (response.ok && response.data) {
        onContextUpdate(response.data);
      }
    } catch (error) {
      log.error('Failed to fetch context:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressSteps = () => {
    const steps = [
      { id: 'background', label: 'Background', completed: !!context?.blocks.background, locked: context?.locks?.background },
      { id: 'macro-chain', label: 'Macro Chain', completed: !!context?.blocks.custom?.macroChain },
      { id: 'scenes', label: 'Scene Details', completed: false }, // Will be determined by scene count
    ];
    return steps;
  };

  const steps = getProgressSteps();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Overview</h2>
        <p className="text-gray-600">Track your story development progress and manage your session.</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress</h3>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step.completed 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {step.completed ? '✓' : index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{step.label}</span>
                  {step.locked && (
                    <Badge variant="upToDate" className="text-xs">Locked</Badge>
                  )}
                  {step.completed && !step.locked && (
                    <Badge variant="generated" className="text-xs">Complete</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col items-start space-y-2"
            onClick={() => window.location.hash = '#tab=background'}
          >
            <span className="font-medium">Generate Background</span>
            <span className="text-sm text-gray-500">Create story foundation</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col items-start space-y-2"
            onClick={() => window.location.hash = '#tab=macro-chain'}
          >
            <span className="font-medium">Plan Macro Chain</span>
            <span className="text-sm text-gray-500">Design scene sequence</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col items-start space-y-2"
            onClick={() => window.location.hash = '#tab=scenes'}
          >
            <span className="font-medium">Detail Scenes</span>
            <span className="text-sm text-gray-500">Add scene specifics</span>
          </Button>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Session ID</label>
            <p className="text-sm text-gray-900 font-mono">{sessionId}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Created</label>
            <p className="text-sm text-gray-900">{new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Last Updated</label>
            <p className="text-sm text-gray-900">{new Date(project.updatedAt).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Context Version</label>
            <p className="text-sm text-gray-900">{context?.version || 'N/A'}</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading context...</span>
          </div>
        </div>
      )}
    </div>
  );
}
