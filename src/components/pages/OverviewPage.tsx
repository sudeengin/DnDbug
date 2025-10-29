import { useState, useEffect } from 'react';
import { getJSON } from '../../lib/api';
import type { Project, SessionContext } from '../../types/macro-chain';
import logger from '@/utils/logger';
import { Check, Lock } from 'lucide-react';

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
    const hasBackground = !!context?.blocks.background;
    const isBackgroundLocked = !!context?.locks?.background;
    const hasMacroChain = !!context?.blocks.custom?.macroChain;
    const macroChain = context?.blocks.custom?.macroChain;
    const hasScenes = macroChain?.scenes && macroChain.scenes.length > 0;
    const hasSceneDetails = context?.sceneDetails && Object.keys(context.sceneDetails).length > 0;

    return [
      { 
        id: 'background', 
        label: 'Background', 
        completed: hasBackground, 
        locked: isBackgroundLocked 
      },
      { 
        id: 'macro-chain', 
        label: 'Macro Chain', 
        completed: hasMacroChain,
        locked: macroChain?.status === 'Locked'
      },
      { 
        id: 'scenes', 
        label: 'Scene Details', 
        completed: hasSceneDetails,
        locked: hasSceneDetails && Object.values(context?.sceneDetails || {}).some((detail: any) => detail.status === 'Locked')
      },
    ];
  };

  const steps = getProgressSteps();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Project Overview Card */}
      <div className="bg-[#151A22] rounded-[16px] border border-[#2A3340] p-6">
        <div className="flex flex-col gap-4">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center justify-between">
              <span className="text-[#EDEDED] font-medium">{step.label}</span>
              <div className="flex items-center gap-2">
                {step.locked ? (
                  <>
                    <Lock className="w-4 h-4 text-[#B0B0B0]" />
                    <span className="text-[#B0B0B0] text-sm">Locked</span>
                  </>
                ) : step.completed ? (
                  <>
                    <Check className="w-4 h-4 text-[#10B981]" />
                    <span className="text-[#10B981] text-sm">Complete</span>
                  </>
                ) : (
                  <span className="text-[#B0B0B0] text-sm">Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session Metadata Card */}
      <div className="bg-[#151A22] border border-[#2A3340] rounded-[16px] p-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-[#B0B0B0] block mb-1">Session ID</label>
            <p className="text-sm text-[#EDEDED] font-mono">{sessionId}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-[#B0B0B0] block mb-1">Created Date</label>
            <p className="text-sm text-[#EDEDED]">{formatDate(project.createdAt)}</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#FFB703]"></div>
            <span className="text-sm text-[#B0B0B0]">Loading context...</span>
          </div>
        </div>
      )}
    </div>
  );
}
