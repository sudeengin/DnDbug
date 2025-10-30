import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ArrowLeft, Upload, Plus } from 'lucide-react';
import { getSessionIdFromUrl, getTabFromUrl, navigateToProjectCreate, navigateToTab } from '../lib/router';
import { getJSON } from '../lib/api';
import OverviewPage from './pages/OverviewPage';
import BackgroundPage from './pages/BackgroundPage';
import CharactersPage from './pages/CharactersPage';
import CharacterSheetPage from './pages/CharacterSheetPage';
import MacroChainPage from './pages/MacroChainPage';
import ScenesPage from './pages/ScenesPage';
import ContextPage from './pages/ContextPage';
import ProjectCreate from './ProjectCreate';
import ProjectList from './ProjectList';
import type { Project, SessionContext } from '../types/macro-chain';
import logger from '@/utils/logger';

const log = logger.ui;

interface AppLayoutProps {
  project?: Project | null;
  onProjectChange?: (project: Project | null) => void;
}

export default function AppLayout({ project, onProjectChange }: AppLayoutProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [context, setContext] = useState<SessionContext | null>(null);
  const [showProjectCreate, setShowProjectCreate] = useState(false);

  // Initialize from URL
  useEffect(() => {
    const urlSessionId = getSessionIdFromUrl();
    const urlTab = getTabFromUrl();
    
    log.info('AppLayout sessionId from URL:', urlSessionId);
    
    if (urlSessionId) {
      // If we have a URL sessionId but no project, fetch it
      if (!project) {
        log.info('Fetching project from URL sessionId:', urlSessionId);
        getJSON<{ ok: boolean; data: Project }>(`/api/projects/${urlSessionId}`)
          .then(response => {
            if (response.ok && response.data) {
              log.info('Project fetched from URL:', response.data);
              onProjectChange?.(response.data);
              setSessionId(urlSessionId);
              setActiveTab(urlTab);
            } else {
              log.error('Failed to fetch project from URL sessionId');
            }
          })
          .catch(error => {
            log.error('Error fetching project from URL:', error);
          });
      } else {
        // Project already exists, just update sessionId and tab
        setSessionId(urlSessionId);
        setActiveTab(urlTab);
      }
    }
  }, []);

  // Update sessionId when project changes
  useEffect(() => {
    if (project) {
      setSessionId(project.id);
    }
  }, [project]);

  const handleProjectCreated = (createdProject: Project) => {
    onProjectChange?.(createdProject);
    setSessionId(createdProject.id);
    setShowProjectCreate(false);
    navigateToTab(createdProject.id, 'overview');
  };

  const handleProjectSelected = useCallback((selectedProject: Project) => {
    onProjectChange?.(selectedProject);
    setSessionId(selectedProject.id);
    navigateToTab(selectedProject.id, 'overview');
  }, [onProjectChange]);

  const handleCreateNew = () => {
    setShowProjectCreate(true);
  };

  const handleTabChange = (value: string) => {
    if (!sessionId) return;
    setActiveTab(value);
    navigateToTab(sessionId, value);
  };

  const handleSwitchProject = () => {
    onProjectChange?.(null);
    setSessionId(null);
    setContext(null);
    setShowProjectCreate(false);
    navigateToProjectCreate();
  };

  // Show project selection/creation if no project exists
  if (!project || !sessionId) {
    if (showProjectCreate) {
      return <ProjectCreate onProjectCreated={handleProjectCreated} />;
    }
    return <ProjectList onProjectSelected={handleProjectSelected} onCreateNew={handleCreateNew} />;
  }

  const getSessionStatus = () => {
    if (!context) return { label: 'Active', active: true };
    
    const hasBackground = !!context.blocks.background;
    const isBackgroundLocked = context.locks?.background;
    const hasChain = !!context.blocks.custom?.macroChain;
    
    if (!hasBackground) return { label: 'Active', active: true };
    if (!isBackgroundLocked) return { label: 'Active', active: true };
    if (!hasChain) return { label: 'Active', spectrum: true };
    return { label: 'Active', active: true };
  };

  const sessionStatus = getSessionStatus();

  // Helper function to determine tab status dot color
  // Returns: 'green' | 'yellow' | 'gray' | null
  const getTabStatus = (tabId: string): 'green' | 'yellow' | 'gray' | null => {
    if (!context) return null;

    switch (tabId) {
      case 'overview':
        // Overview always shows no dot (or could be green if project exists)
        return null;
      
      case 'background':
        const hasBackground = !!context.blocks?.background;
        const isBackgroundLocked = !!context.locks?.background;
        if (hasBackground && isBackgroundLocked) return 'green';
        if (hasBackground) return 'yellow';
        return null;
      
      case 'characters':
        const hasCharacters = !!context.blocks?.characters;
        const isCharactersLocked = !!context.locks?.characters || !!context.blocks?.characters?.locked;
        if (hasCharacters && isCharactersLocked) return 'green';
        if (hasCharacters) return 'yellow';
        return null;
      
      case 'character-sheet':
        // Character sheet uses same logic as characters
        const hasCharSheet = !!context.blocks?.characters;
        const isCharSheetLocked = !!context.locks?.characters || !!context.blocks?.characters?.locked;
        if (hasCharSheet && isCharSheetLocked) return 'green';
        if (hasCharSheet) return 'yellow';
        return null;
      
      case 'macro-chain':
        const macroChain = context.blocks?.custom?.macroChain;
        const hasMacroChain = !!macroChain;
        const isMacroChainLocked = macroChain?.status === 'Locked';
        if (hasMacroChain && isMacroChainLocked) return 'green';
        if (hasMacroChain) return 'yellow';
        return null;
      
      case 'scenes':
        const hasSceneDetails = context.sceneDetails && Object.keys(context.sceneDetails).length > 0;
        const hasLockedScene = hasSceneDetails && Object.values(context.sceneDetails || {}).some(
          (detail: any) => detail.status === 'Locked'
        );
        if (hasSceneDetails && hasLockedScene) return 'green';
        if (hasSceneDetails) return 'yellow';
        return null;
      
      case 'context':
        // Context tab doesn't need status indicator
        return null;
      
      default:
        return null;
    }
  };

  // Helper component to render status dot
  const StatusDot = ({ tabId }: { tabId: string }) => {
    const status = getTabStatus(tabId);
    if (!status) return null;

    const colorClasses = {
      green: 'bg-[#22C55E]',
      yellow: 'bg-[#FACC15]',
      gray: 'bg-[#6B7280]'
    };

    return (
      <span className={`w-2 h-2 rounded-full ${colorClasses[status]}`} />
    );
  };

  return (
    <div className="min-h-screen bg-[#151420]">
      {/* Header Section */}
      <div className="border-b border-[#2A3340] px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-[#EDEDED] mb-1">Onur's Hivemind</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-[#B0B0B0] font-mono">Session ID: {sessionId}</span>
                <div className="flex items-center gap-2">
                  <svg className="w-2 h-2" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="4" cy="4" r="4" fill="#10B981"/>
                  </svg>
                  <span className="text-sm text-[#B0B0B0]">Active</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSwitchProject}
              variant="secondary"
              size="sm"
              className="flex items-center gap-1.5"
              type="button"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span>All Projects</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-[12px]"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="rounded-[12px] font-medium"
              onClick={handleCreateNew}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="border-b border-[#2A3340]">
            <TabsList className="h-auto p-0 bg-transparent gap-2">
              <TabsTrigger 
                value="overview" 
                className="px-4 py-2 rounded-[8px] data-[state=active]:bg-[rgba(255,255,255,0.05)] data-[state=active]:text-[#7c63e5] data-[state=active]:font-semibold data-[state=active]:border-b-[1px] data-[state=active]:border-[#7c63e5] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <StatusDot tabId="overview" />
                  <span>Overview</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="background" 
                className="px-4 py-2 rounded-[8px] data-[state=active]:bg-[rgba(255,255,255,0.05)] data-[state=active]:text-[#7c63e5] data-[state=active]:font-semibold data-[state=active]:border-b-[1px] data-[state=active]:border-[#7c63e5] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <StatusDot tabId="background" />
                  <span>Background</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="characters" 
                className="px-4 py-2 rounded-[8px] data-[state=active]:bg-[rgba(255,255,255,0.05)] data-[state=active]:text-[#7c63e5] data-[state=active]:font-semibold data-[state=active]:border-b-[1px] data-[state=active]:border-[#7c63e5] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <StatusDot tabId="characters" />
                  <span>Characters</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="character-sheet" 
                className="px-4 py-2 rounded-[8px] data-[state=active]:bg-[rgba(255,255,255,0.05)] data-[state=active]:text-[#7c63e5] data-[state=active]:font-semibold data-[state=active]:border-b-[1px] data-[state=active]:border-[#7c63e5] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <StatusDot tabId="character-sheet" />
                  <span>Character Sheet</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="macro-chain" 
                className="px-4 py-2 rounded-[8px] data-[state=active]:bg-[rgba(255,255,255,0.05)] data-[state=active]:text-[#7c63e5] data-[state=active]:font-semibold data-[state=active]:border-b-[1px] data-[state=active]:border-[#7c63e5] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <StatusDot tabId="macro-chain" />
                  <span>Macro Chain</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="scenes" 
                className="px-4 py-2 rounded-[8px] data-[state=active]:bg-[rgba(255,255,255,0.05)] data-[state=active]:text-[#7c63e5] data-[state=active]:font-semibold data-[state=active]:border-b-[1px] data-[state=active]:border-[#7c63e5] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <StatusDot tabId="scenes" />
                  <span>Scenes</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="context" 
                className="px-4 py-2 rounded-[8px] data-[state=active]:bg-[rgba(255,255,255,0.05)] data-[state=active]:text-[#7c63e5] data-[state=active]:font-semibold data-[state=active]:border-b-[1px] data-[state=active]:border-[#7c63e5] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <StatusDot tabId="context" />
                  <span>Context</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="export" 
                className="px-4 py-2 rounded-[8px] text-[rgba(255,255,255,0.6)] opacity-50 cursor-not-allowed" 
                disabled
              >
                <span>Export</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-0 pt-6">
            <OverviewPage 
              sessionId={sessionId} 
              project={project}
              context={context}
              onContextUpdate={setContext}
            />
          </TabsContent>

          <TabsContent value="background" className="p-0 pt-6">
            <BackgroundPage 
              sessionId={sessionId}
              context={context}
              onContextUpdate={setContext}
            />
          </TabsContent>

          <TabsContent value="characters" className="p-0 pt-6">
            <CharactersPage 
              sessionId={sessionId}
              context={context}
              onContextUpdate={setContext}
            />
          </TabsContent>

          <TabsContent value="character-sheet" className="p-0 pt-6">
            <CharacterSheetPage 
              sessionId={sessionId}
              context={context}
              onContextUpdate={setContext}
            />
          </TabsContent>

          <TabsContent value="macro-chain" className="p-0 pt-6">
            <MacroChainPage 
              sessionId={sessionId}
              context={context}
              onContextUpdate={setContext}
            />
          </TabsContent>

          <TabsContent value="scenes" className="p-0 pt-6">
            <ScenesPage 
              sessionId={sessionId}
              context={context}
              onContextUpdate={setContext}
            />
          </TabsContent>

          <TabsContent value="context" className="p-0 pt-6">
            <ContextPage 
              sessionId={sessionId}
              context={context}
              onContextUpdate={setContext}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
