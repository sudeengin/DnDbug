import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
} from "@heroui/react";
import { X } from 'lucide-react';
import { postJSON } from '../lib/api';
import logger from '@/utils/logger';

const log = logger.ui;

interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectCreateProps {
  onProjectCreated: (project: Project) => void;
  onCancel?: () => void;
}

export default function ProjectCreate({ onProjectCreated, onCancel }: ProjectCreateProps) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC key support to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Project title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await postJSON<{ ok: boolean; data: Project }>('/api/projects', {
        title: title.trim()
      });

      if (response.ok) {
        onProjectCreated(response.data);
        setTitle('');
      } else {
        setError('Failed to create project');
      }
    } catch (error) {
      log.error('Error creating project:', error);
      setError(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e13] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-lg w-full bg-[#151A22] border border-[#2A3340] rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] mx-auto">
        <CardHeader className="flex flex-row items-start justify-between px-10 pt-10 pb-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-white">
              Create New Project
            </h2>
            <p className="text-sm text-gray-400">
              Start a new D&D campaign or story project
            </p>
          </div>
          {onCancel && (
            <Button
              isIconOnly
              variant="light"
              onPress={onCancel}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </CardHeader>
        
        <CardBody className="px-10 pb-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-200">
                Project Title
              </label>
              <Input
                id="title"
                name="title"
                type="text"
                required
                autoFocus
                placeholder="e.g., Curse of Strahd Campaign"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                radius="lg"
                classNames={{
                  base: "w-full",
                  input: "text-white placeholder:text-gray-400",
                  inputWrapper: "bg-[#1f2733] border-transparent hover:bg-[#1f2733] focus-within:bg-[#1f2733] group-data-[focus=true]:bg-[#1f2733]",
                }}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !title.trim()}
              className="w-full bg-[#000000] hover:bg-[#1a1a1a] text-[#ef6646] font-semibold disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
              radius="lg"
              size="lg"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
