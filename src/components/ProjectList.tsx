import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  Button,
  Tabs,
  Tab,
  Badge,
} from "@heroui/react";
import { getJSON } from '../lib/api';
import logger from '@/utils/logger';
import {
  Plus,
  Upload,
  Check,
  Lock,
  Circle,
  ArrowLeft,
} from 'lucide-react';
import CharactersPage from './pages/CharactersPage';
import CharacterSheetPage from './pages/CharacterSheetPage';
import BackgroundPage from './pages/BackgroundPage';
import MacroChainPage from './pages/MacroChainPage';
import ScenesPage from './pages/ScenesPage';
import ContextPage from './pages/ContextPage';

const log = logger.ui;

interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectListProps {
  onProjectSelected: (project: Project) => void;
  onCreateNew: () => void;
  autoSelectProject?: boolean;
}

export default function ProjectList({ onProjectSelected, onCreateNew, autoSelectProject = false }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [context, setContext] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProjects();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Auto-select first project if autoSelectProject is true
  useEffect(() => {
    if (autoSelectProject && projects.length > 0) {
      const firstProject = projects[0];
      log.info('Auto-selecting first project:', firstProject);
      onProjectSelected(firstProject);
    }
  }, [projects, autoSelectProject, onProjectSelected]);

  const loadProjects = async (retryCount = 0) => {
    try {
      setLoading(true);
      log.info(`Loading projects from /api/projects... (attempt ${retryCount + 1})`);
      const response = await getJSON<{ ok: boolean; data: Project[] }>('/api/projects');
      log.info('Projects response:', response);
      if (response.ok) {
        setProjects(response.data);
        log.info('Projects loaded successfully:', response.data);
      }
    } catch (error) {
      log.error('Error loading projects:', error);
      if (retryCount < 2) {
        log.info(`Retrying in 1 second... (attempt ${retryCount + 1})`);
        setTimeout(() => loadProjects(retryCount + 1), 1000);
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Main container styling with solid background and generous padding
  const containerClass = "min-h-screen bg-[#151420] pt-10 pb-16 px-3 sm:px-6 md:px-8";

  // Tab configuration with status indicators
  const tabs = [
    { key: 'overview', label: 'Overview', status: 'active' },
    { key: 'background', label: 'Background', status: 'complete' },
    { key: 'characters', label: 'Characters', status: 'locked' },
    { key: 'character-sheet', label: 'Character Sheet', status: 'locked' },
    { key: 'macro-chain', label: 'Macro Chain', status: 'complete' },
    { key: 'scenes', label: 'Scenes', status: 'locked' },
    { key: 'context', label: 'Context', status: 'locked' },
    { key: 'export', label: 'Export', status: 'locked' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <Check className="w-3 h-3 text-green-500" />;
      case 'active':
        return <Circle className="w-3 h-3 text-yellow-500" />;
      case 'locked':
      default:
        return <Lock className="w-3 h-3 text-gray-500" />;
    }
  };

  const renderTabContent = (tabKey: string) => {
    console.log('Rendering tab content for:', tabKey);
    switch (tabKey) {
      case 'overview':
        return (
          <div>
            {/* Project Overview Section */}
            <div className="mb-8">
              <h2 className="text-[20px] leading-[28px] font-semibold text-[#E6EAF2] mb-2">
                Project Overview
              </h2>
              <p className="text-[14px] leading-[22px] text-[#A4AEC0] mb-6">
                Track your story development progress and manage your session.
              </p>

              {/* Progress Card */}
              <Card className="bg-[#151A22] border border-[#2A3340] rounded-[16px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                <CardBody className="p-0">
                  <div className="space-y-4">
                    {/* Background Step */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="text-[16px] leading-[24px] font-medium text-[#E6EAF2]">Background</span>
                      </div>
                      <Badge color="success" variant="flat" className="text-xs">
                        Complete
                      </Badge>
                    </div>

                    {/* Macro Chain Step */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="text-[16px] leading-[24px] font-medium text-[#E6EAF2]">Macro Chain</span>
                      </div>
                      <Badge color="success" variant="flat" className="text-xs">
                        Complete
                      </Badge>
                    </div>

                    {/* Scene Details Step */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Circle className="w-5 h-5 text-gray-500" />
                        <span className="text-[16px] leading-[24px] font-medium text-[#E6EAF2]">Scene Details</span>
                      </div>
                      <Badge color="default" variant="flat" className="text-xs">
                        Locked
                      </Badge>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Session Information Section */}
            <div className="mb-8">
              <Card className="bg-[#151A22] border border-[#2A3340] rounded-[16px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                <CardBody className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Session ID */}
                    <div>
                      <label className="text-[12px] leading-[18px] text-[#A4AEC0] uppercase tracking-wide font-medium">
                        Session ID
                      </label>
                      <p className="text-[14px] leading-[22px] text-[#E6EAF2] font-mono mt-1">
                        {projects[0]?.id || 'loading...'}
                      </p>
                    </div>

                    {/* Created Date */}
                    <div>
                      <label className="text-[12px] leading-[18px] text-[#A4AEC0] uppercase tracking-wide font-medium">
                        Created Date
                      </label>
                      <p className="text-[14px] leading-[22px] text-[#E6EAF2] mt-1">
                        {projects[0]?.createdAt ? formatDate(projects[0].createdAt) : '10/25/2025'}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        );
      case 'background':
        return projects[0]?.id ? (
          <BackgroundPage 
            sessionId={projects[0].id}
            context={context}
            onContextUpdate={setContext}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-[#A4AEC0]">No session available</p>
          </div>
        );
      case 'characters':
        return projects[0]?.id ? (
          <CharactersPage 
            sessionId={projects[0].id}
            context={context}
            onContextUpdate={setContext}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-[#A4AEC0]">No session available</p>
          </div>
        );
      case 'character-sheet':
        return projects[0]?.id ? (
          <CharacterSheetPage 
            sessionId={projects[0].id}
            context={context}
            onContextUpdate={setContext}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-[#A4AEC0]">No session available</p>
          </div>
        );
      case 'macro-chain':
        return projects[0]?.id ? (
          <MacroChainPage 
            sessionId={projects[0].id}
            context={context}
            onContextUpdate={setContext}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-[#A4AEC0]">No session available</p>
          </div>
        );
      case 'scenes':
        return projects[0]?.id ? (
          <ScenesPage 
            sessionId={projects[0].id}
            context={context}
            onContextUpdate={setContext}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-[#A4AEC0]">No session available</p>
          </div>
        );
      case 'context':
        return projects[0]?.id ? (
          <ContextPage 
            sessionId={projects[0].id}
            context={context}
            onContextUpdate={setContext}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-[#A4AEC0]">No session available</p>
          </div>
        );
      case 'export':
        return (
          <div>
            <h2 className="text-[20px] leading-[28px] font-semibold text-[#E6EAF2] mb-4">
              Export
            </h2>
            <Card className="bg-[#151A22] border border-[#2A3340] rounded-[16px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
              <CardBody>
                <div className="text-center py-8">
                  <p className="text-[#A4AEC0] mb-4">Export functionality is coming soon</p>
                  <Badge color="default" variant="flat" className="text-xs">
                    Under Development
                  </Badge>
                </div>
              </CardBody>
            </Card>
          </div>
        );
      default:
        return <div>Unknown tab</div>;
    }
  };

  return (
    <div className={containerClass}>
      <div className="max-w-[1440px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[28px] leading-[36px] font-semibold text-[#E6EAF2]">Onur's Hivemind</h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-[12px] leading-[18px] text-[#A4AEC0] font-mono">
                Session ID: {projects[0]?.id || 'loading...'}
              </p>
              <Badge color="success" variant="flat" className="text-xs">
                Active
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="bordered"
              radius="md"
              startContent={<Upload className="w-4 h-4" />}
              className="rounded-[12px] border-[#2A3340] text-[#E6EAF2] hover:bg-[#1A1F2A] focus:ring-2 focus:ring-[rgba(255,255,255,0.15)]"
            >
              Import
            </Button>
            <Button
              color="primary"
              variant="solid"
              radius="md"
              startContent={<Plus className="w-4 h-4" />}
              onClick={onCreateNew}
              className="rounded-[12px] text-[#0B0F10] bg-[#FFB703] hover:bg-[#E6A502] active:bg-[#CC9402] font-medium focus:ring-2 focus:ring-[rgba(255,255,255,0.15)]"
            >
              Create Project
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => {
              console.log('Tab changed to:', key);
              setSelectedTab(key as string);
            }}
            variant="underlined"
            classNames={{
              base: "w-full",
              tabList: "gap-6 w-full relative rounded-none p-0 border-b border-[#2A3340]",
              cursor: "w-full bg-[#FFB703]",
              tab: "max-w-fit px-0 h-12",
              tabContent: "group-data-[selected=true]:text-[#FFB703] text-[#A4AEC0] group-data-[selected=true]:font-semibold",
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.key}
                title={
                  <div className="flex items-center gap-2">
                    {getStatusIcon(tab.status)}
                    <span>{tab.label}</span>
                  </div>
                }
              >
                {/* Tab Content */}
                <div className="mt-6">
                  {renderTabContent(selectedTab)}
                </div>
              </Tab>
            ))}
          </Tabs>
          </div>

      </div>
    </div>
  );
}