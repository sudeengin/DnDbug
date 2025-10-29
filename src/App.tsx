import { useState, useEffect } from 'react';
import AppLayout from "./components/AppLayout";
import { ToastProvider } from "./components/ui/toast";
import SimpleDebugToggle from "./components/SimpleDebugToggle";
import debug from './lib/simpleDebug';
import type { Project } from './types/macro-chain';

export default function App() {
  const [project, setProject] = useState<Project | null>(null);

  // Initialize debug logging
  useEffect(() => {
    debug.info('app', 'Application initialized', {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      timestamp: Date.now(),
    });
  }, []);

  // Log project changes
  useEffect(() => {
    if (project) {
      debug.info('app', 'Project selected', { project });
    }
  }, [project]);

  // Log route changes
  useEffect(() => {
    const handleRouteChange = () => {
      debug.info('app', 'Route changed', { route: typeof window !== 'undefined' ? window.location.pathname : 'Unknown' });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handleRouteChange);
      return () => window.removeEventListener('popstate', handleRouteChange);
    }
  }, []);

  return (
    <ToastProvider>
      <AppLayout 
        project={project} 
        onProjectChange={setProject}
      />
      <SimpleDebugToggle />
    </ToastProvider>
  );
}