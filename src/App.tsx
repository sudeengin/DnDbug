import { useState } from 'react';
import AppLayout from "./components/AppLayout";
import { ToastProvider } from "./components/ui/toast";
import type { Project } from './types/macro-chain';

export default function App() {
  const [project, setProject] = useState<Project | null>(null);

  return (
    <ToastProvider>
      <AppLayout 
        project={project} 
        onProjectChange={setProject}
      />
    </ToastProvider>
  );
}