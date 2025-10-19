import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getSessionIdFromUrl, getTabFromUrl, navigateToProjectCreate, navigateToTab } from '../lib/router';
import OverviewPage from './pages/OverviewPage';
import BackgroundPage from './pages/BackgroundPage';
import MacroChainPage from './pages/MacroChainPage';
import ScenesPage from './pages/ScenesPage';
import ContextPage from './pages/ContextPage';
import ProjectCreate from './ProjectCreate';
import ProjectList from './ProjectList';
import type { Project, SessionContext } from '../types/macro-chain';

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
    
    if (urlSessionId) {
      setSessionId(urlSessionId);
      setActiveTab(urlTab);
    } else if (!project) {
      // No sessionId and no project - show project selection
      return;
    }
  }, [project]);

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

  const handleProjectSelected = (selectedProject: Project) => {
    onProjectChange?.(selectedProject);
    setSessionId(selectedProject.id);
    navigateToTab(selectedProject.id, 'overview');
  };

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

  const getPhaseBadge = () => {
    if (!context) return { label: 'Setup', variant: 'secondary' as const };
    
    const hasBackground = !!context.blocks.background;
    const isBackgroundLocked = context.locks?.background;
    const hasChain = !!context.blocks.custom?.macroChain;
    
    if (!hasBackground) return { label: 'Setup', variant: 'secondary' as const };
    if (!isBackgroundLocked) return { label: 'Background', variant: 'outline' as const };
    if (!hasChain) return { label: 'Planning', variant: 'outline' as const };
    return { label: 'Active', variant: 'upToDate' as const };
  };

  const phase = getPhaseBadge();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {sessionId}
                </Badge>
                <Badge variant={phase.variant}>
                  {phase.label}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwitchProject}
            >
              Switch Project
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="border-b border-gray-200 bg-white">
            <TabsList className="h-auto p-0 bg-transparent">
              <TabsTrigger value="overview" className="px-6 py-4">
                <div className="flex items-center space-x-2">
                  <span>Overview</span>
                  <div className="w-2 h-2 rounded-full bg-gray-300" title="Overview tab" />
                </div>
              </TabsTrigger>
              <TabsTrigger value="background" className="px-6 py-4">
                <div className="flex items-center space-x-2">
                  <span>Background</span>
                  {context?.blocks.background ? (
                    context?.locks?.background ? (
                      <div className="w-2 h-2 rounded-full bg-green-500" title="Background locked (finalized)" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-yellow-400" title="Background draft (not locked)" />
                    )
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300" title="Background empty (no data yet)" />
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="macro-chain" className="px-6 py-4">
                <div className="flex items-center space-x-2">
                  <span>Macro Chain</span>
                  {(() => {
                    const macroChain = context?.blocks.custom?.macroChain;
                    console.log('AppLayout: Macro chain status:', macroChain?.status);
                    console.log('AppLayout: Full macro chain:', macroChain);
                    
                    if (macroChain) {
                      if (macroChain.status === 'Locked') {
                        return <div className="w-2 h-2 rounded-full bg-green-500" title="Macro chain locked (finalized)" />;
                      } else {
                        return <div className="w-2 h-2 rounded-full bg-yellow-400" title="Macro chain draft (not locked)" />;
                      }
                    } else {
                      return <div className="w-2 h-2 rounded-full bg-gray-300" title="Macro chain empty (no data yet)" />;
                    }
                  })()}
                </div>
              </TabsTrigger>
              <TabsTrigger value="scenes" className="px-6 py-4">
                <div className="flex items-center space-x-2">
                  <span>Scenes</span>
                  {context?.blocks.story_facts && context.blocks.story_facts.length > 0 ? (
                    <div className="w-2 h-2 rounded-full bg-yellow-400" title="Scenes generated" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300" title="No scenes yet" />
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="context" className="px-6 py-4">
                <div className="flex items-center space-x-2">
                  <span>Context</span>
                  <div className="w-2 h-2 rounded-full bg-gray-300" title="Context view (data from other tabs)" />
                </div>
              </TabsTrigger>
              <TabsTrigger value="export" className="px-6 py-4" disabled>
                <div className="flex items-center space-x-2">
                  <span>Export</span>
                  <div className="w-2 h-2 rounded-full bg-gray-300" title="Export disabled" />
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-6">
            <OverviewPage 
              sessionId={sessionId} 
              project={project}
              context={context}
              onContextUpdate={setContext}
            />
          </TabsContent>

          <TabsContent value="background" className="p-6">
            <BackgroundPage 
              sessionId={sessionId}
              context={context}
              onContextUpdate={setContext}
            />
          </TabsContent>

          <TabsContent value="macro-chain" className="p-6">
            <MacroChainPage 
              sessionId={sessionId}
              context={context}
              onContextUpdate={setContext}
            />
          </TabsContent>

          <TabsContent value="scenes" className="p-6">
            <ScenesPage 
              sessionId={sessionId}
              context={context}
              onContextUpdate={setContext}
            />
          </TabsContent>

          <TabsContent value="context" className="p-6">
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
