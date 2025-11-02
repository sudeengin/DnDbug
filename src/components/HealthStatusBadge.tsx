import { useEffect, useState } from 'react';
import { debug } from '@/lib/simpleDebug';

interface HealthStatus {
  sessionId: string;
  exists: boolean;
  version?: number;
  hasBackground?: boolean;
  hasCharacters?: boolean;
  hasMacroChains?: boolean;
  macroChainCount?: number;
  blocksCount?: number;
  locks?: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
  timestamp: string;
}

interface HealthStatusBadgeProps {
  sessionId: string | null;
  className?: string;
}

export function HealthStatusBadge({ sessionId, className = '' }: HealthStatusBadgeProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setHealth(null);
      return;
    }

    const checkHealth = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/context/health?sessionId=${sessionId}`);
        
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.ok && result.data) {
          setHealth(result.data);
          debug.info('HealthStatusBadge', 'Health check successful', result.data);
        } else {
          throw new Error('Invalid health check response');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        debug.error('HealthStatusBadge', 'Health check error', { error: message });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, [sessionId]);

  if (!sessionId) {
    return null;
  }

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-700/50 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        <span className="text-xs text-slate-300">Checking...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md bg-red-900/30 border border-red-700/50 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <span className="text-xs text-red-300">Error</span>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const isHealthy = health.exists;
  const statusColor = isHealthy ? 'green' : 'gray';
  const bgColor = isHealthy ? 'bg-green-900/30' : 'bg-slate-700/50';
  const borderColor = isHealthy ? 'border-green-700/50' : 'border-slate-600/50';
  const dotColor = isHealthy ? 'bg-green-400' : 'bg-gray-400';
  const textColor = isHealthy ? 'text-green-300' : 'text-slate-400';

  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-md ${bgColor} border ${borderColor} ${className}`}
      title={`Session ${health.exists ? 'exists' : 'does not exist'}\nVersion: ${health.version ?? 'N/A'}\nBlocks: ${health.blocksCount ?? 0}\nLast updated: ${health.updatedAt ? new Date(health.updatedAt).toLocaleString() : 'N/A'}`}
    >
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${textColor}`}>
          {health.exists ? 'Active' : 'Empty'}
        </span>
        {health.exists && health.version !== undefined && (
          <span className="text-xs text-slate-500">v{health.version}</span>
        )}
      </div>
    </div>
  );
}
