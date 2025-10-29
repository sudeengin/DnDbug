import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Breadcrumbs,
  BreadcrumbItem,
  Skeleton,
} from "@heroui/react";
import { getJSON, deleteJSON } from '../lib/api';
import logger from '@/utils/logger';
import {
  Plus,
  Upload,
  Search,
  Grid3x3,
  List,
  MoreVertical,
  Folder,
} from 'lucide-react';

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
}

export default function ProjectList({ onProjectSelected, onCreateNew }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('recent');
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProjects();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const loadProjects = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      log.info(`Loading projects from /api/projects... (attempt ${retryCount + 1})`);
      const response = await getJSON<{ ok: boolean; data: Project[] }>('/api/projects');
      log.info('Projects response:', response);
      if (response.ok) {
        setProjects(response.data);
        log.info('Projects loaded successfully:', response.data);
      } else {
        setError('Failed to load projects');
      }
    } catch (error) {
      log.error('Error loading projects:', error);
      if (retryCount < 2) {
        log.info(`Retrying in 1 second... (attempt ${retryCount + 1})`);
        setTimeout(() => loadProjects(retryCount + 1), 1000);
        return;
      }
      setError(error instanceof Error ? error.message : 'Failed to load projects');
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

  const handleDeleteClick = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    onDeleteOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    
    try {
      setDeletingProjectId(projectToDelete);
      setError(null);
      
      const response = await deleteJSON<{ ok: boolean; data: any }>(`/api/projects/${projectToDelete}`);
      
      if (response.ok) {
        setProjects(prevProjects => prevProjects.filter(p => p.id !== projectToDelete));
        log.info('Project deleted successfully:', response.data);
      } else {
        setError('Failed to delete project');
      }
    } catch (error) {
      log.error('Error deleting project:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete project');
    } finally {
      setDeletingProjectId(null);
      setProjectToDelete(null);
      onDeleteClose();
    }
  };

  const handleDeleteCancel = () => {
    setProjectToDelete(null);
    onDeleteClose();
  };

  // Filter and sort projects
  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'recent':
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  // Main container styling with solid background and generous padding
  const containerClass = "min-h-screen bg-[#151420] pt-10 pb-16 px-3 sm:px-6 md:px-8";

  return (
    <div className={containerClass}>
      <div className="max-w-[1440px] mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumbs className="mb-2 text-[#A4AEC0]" size="sm">
          <BreadcrumbItem>Home</BreadcrumbItem>
          <BreadcrumbItem>Projects</BreadcrumbItem>
        </Breadcrumbs>

        {/* Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[28px] leading-[36px] font-semibold text-[#E6EAF2]">Your Projects</h1>
            <p className="text-[14px] leading-[22px] text-[#A4AEC0] mt-1">
              Select an existing project or create a new one
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="bordered"
              radius="md"
              startContent={<Upload className="w-4 h-4" />}
              className="rounded-[12px] border-[#2A3340] text-[#E6EAF2] hover:bg-[#1A1F2A] focus:ring-2 focus:ring-[rgba(255,183,3,0.55)]"
            >
              Import
            </Button>
            <Button
              color="primary"
              variant="solid"
              radius="md"
              startContent={<Plus className="w-4 h-4" />}
              onClick={onCreateNew}
              className="rounded-[12px] text-[#0B0F10] bg-[#FFB703] hover:bg-[#E6A502] active:bg-[#CC9402] font-medium focus:ring-2 focus:ring-[rgba(255,183,3,0.55)]"
            >
              Create Project
            </Button>
          </div>
        </div>

        {/* Utility Bar */}
        <div className="flex flex-wrap gap-2 items-center mb-8">
          <Input
            size="md"
            radius="md"
            variant="bordered"
            startContent={<Search className="w-4 h-4 text-[#7B8698]" />}
            placeholder="Search projects…"
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-[12px] bg-[#151A22] border border-[#2A3340] text-[#E6EAF2] placeholder-[#7B8698] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)]"
            classNames={{
              input: "px-4 py-2 text-[#E6EAF2] focus:outline-none bg-[#151A22]",
              inputWrapper: "bg-[#151A22] rounded-[12px] border-[#2A3340] hover:border-[#2A3340] data-[hover=true]:border-[#2A3340] focus-within:outline-none focus-within:ring-2 focus-within:ring-[rgba(255,255,255,0.15)] focus-within:border-[#2A3340]",
            }}
          />
          <Select
            size="md"
            radius="md"
            variant="bordered"
            selectedKeys={[sortBy]}
            onSelectionChange={(keys) => setSortBy(Array.from(keys)[0] as string)}
            aria-label="Sort projects by"
            className="min-w-[200px] rounded-[12px] bg-[#151A22] border border-[#2A3340] text-[#E6EAF2] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.15)]"
            classNames={{
              trigger: "bg-[#151A22] rounded-[12px] border-[#2A3340] px-4 py-2 text-[#E6EAF2] hover:border-[#2A3340] data-[hover=true]:border-[#2A3340] focus-within:outline-none focus-within:ring-2 focus-within:ring-[rgba(255,255,255,0.15)] focus-within:border-[#2A3340]",
              value: "text-[#E6EAF2]",
            }}
          >
            <SelectItem key="recent" className="text-[#E6EAF2]">Recently Updated</SelectItem>
            <SelectItem key="name" className="text-[#E6EAF2]">Name A–Z</SelectItem>
            <SelectItem key="created" className="text-[#E6EAF2]">Created Date</SelectItem>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button
              variant="bordered"
              isIconOnly
              aria-label="Grid view"
              radius="md"
              className="rounded-[12px] border-[#2A3340] text-[#A4AEC0] hover:bg-[#1A1F2A] focus:ring-2 focus:ring-[rgba(255,183,3,0.55)]"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant="bordered"
              isIconOnly
              aria-label="List view"
              radius="md"
              className="rounded-[12px] border-[#2A3340] text-[#A4AEC0] hover:bg-[#1A1F2A] focus:ring-2 focus:ring-[rgba(255,183,3,0.55)]"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 bg-[#151A22] border border-[#EF4444] rounded-[16px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-2 text-[#EF4444]">
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-[#151A22] border border-[#2A3340] rounded-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 rounded-lg" />
                </CardHeader>
                <CardBody>
                  <Skeleton className="h-4 w-full rounded-lg mb-2" />
                  <Skeleton className="h-4 w-2/3 rounded-lg" />
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sortedProjects.length === 0 && (
          <Card className="bg-[#151A22] border border-[#2A3340] rounded-[16px] max-w-md mx-auto text-center min-h-[200px] shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
            <CardBody className="items-center gap-4 p-8">
              <Folder className="w-12 h-12 text-[#7B8698]" />
              <h3 className="text-[18px] leading-[26px] font-medium text-[#E6EAF2]">No projects yet</h3>
              <p className="text-[14px] leading-[22px] text-[#A4AEC0]">
                {searchQuery ? 'No projects match your search' : 'Create your first project to get started.'}
              </p>
              {!searchQuery && (
                <Button
                  color="primary"
                  variant="solid"
                  radius="md"
                  onClick={onCreateNew}
                  startContent={<Plus className="w-4 h-4" />}
                  className="rounded-[12px] mt-4 text-[#0B0F10] bg-[#FFB703] hover:bg-[#E6A502] active:bg-[#CC9402] font-medium focus:ring-2 focus:ring-[rgba(255,183,3,0.55)]"
                >
                  Create Project
                </Button>
              )}
            </CardBody>
          </Card>
        )}

        {/* Project Grid */}
        {!loading && sortedProjects.length > 0 && (
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedProjects.map((project) => (
              <Card
                key={project.id}
                className="bg-[#151A22] border border-[#2A3340] rounded-[16px] text-[#E6EAF2] shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.55)] hover:border-[#2A3340]/80 transition-all duration-200 cursor-pointer group"
                onClick={() => onProjectSelected(project)}
              >
                <CardHeader className="flex justify-between items-start pb-2 p-6">
                  <h3 className="text-[18px] leading-[26px] font-medium text-[#E6EAF2] flex-1 pr-2">
                    {project.title}
                  </h3>
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        aria-label="Project menu"
                        className="text-[#A4AEC0] hover:text-[#E6EAF2] hover:bg-[#1A1F2A] min-w-6 h-6 focus:ring-2 focus:ring-[rgba(255,183,3,0.55)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                      aria-label="Project actions"
                      onAction={(key) => {
                        if (key === 'delete') {
                          handleDeleteClick(project.id, { stopPropagation: () => {} } as any);
                        } else if (key === 'open') {
                          onProjectSelected(project);
                        }
                      }}
                      classNames={{
                        base: "!bg-[#151A22] !opacity-100 !border !border-[#2A3340] !shadow-[0_8px_24px_rgba(0,0,0,0.45)] rounded-[12px] p-2",
                      }}
                    >
                      <DropdownItem key="open">Open</DropdownItem>
                      <DropdownItem key="rename">Rename</DropdownItem>
                      <DropdownItem key="duplicate">Duplicate</DropdownItem>
                      <DropdownItem key="archive">Archive</DropdownItem>
                      <DropdownItem key="delete" className="text-danger" color="danger">
                        Delete
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </CardHeader>
                <CardBody className="pt-0 pb-2 px-6">
                  <div className="text-[#7B8698] text-[12px] leading-[18px] space-y-1">
                    <div>Created: {formatDate(project.createdAt)}</div>
                    <div>Updated: {formatDate(project.updatedAt)}</div>
                  </div>
                </CardBody>
                <CardFooter className="pt-2 justify-end px-6 pb-6">
                  <Button
                    variant="light"
                    size="sm"
                    radius="md"
                    className="rounded-[12px] text-[#E6EAF2] hover:bg-[#1A1F2A] focus:ring-2 focus:ring-[rgba(255,183,3,0.55)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onProjectSelected(project);
                    }}
                  >
                    Open
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteOpen}
          onClose={handleDeleteCancel}
          radius="lg"
          classNames={{
            base: "bg-[#151A22] border border-[#2A3340] rounded-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.45)]",
            header: "border-b border-[#2A3340]",
            footer: "border-t border-[#2A3340]",
          }}
        >
          <ModalContent>
            <ModalHeader className="text-[#E6EAF2]">Delete Project</ModalHeader>
            <ModalBody>
              <p className="text-[#A4AEC0] text-sm">
                Are you sure you want to delete this project? This action cannot be undone.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="bordered"
                radius="md"
                onPress={handleDeleteCancel}
                disabled={!!deletingProjectId}
                className="rounded-[12px] border-[#2A3340] text-[#E6EAF2] hover:bg-[#1A1F2A] focus:ring-2 focus:ring-[rgba(255,183,3,0.55)]"
              >
                Cancel
              </Button>
              <Button
                color="danger"
                variant="solid"
                radius="md"
                onPress={handleDeleteConfirm}
                disabled={!!deletingProjectId}
                isLoading={!!deletingProjectId}
                className="rounded-[12px] bg-[#EF4444] hover:bg-[#DC2626] text-white font-medium focus:ring-2 focus:ring-[rgba(255,183,3,0.55)]"
              >
                {deletingProjectId ? 'Deleting...' : 'Delete'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
