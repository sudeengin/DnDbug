import type { TelemetryEvent } from '../types/macro-chain';

class TelemetryService {
  private events: TelemetryEvent[] = [];
  private isEnabled: boolean = true;

  constructor() {
    // In a real implementation, you might want to check for user consent
    // or environment settings to determine if telemetry should be enabled
    this.isEnabled = import.meta.env.PROD || 
                     localStorage.getItem('telemetry_enabled') === 'true';
  }

  track(event: Omit<TelemetryEvent, 'timestamp'>) {
    if (!this.isEnabled) return;

    const telemetryEvent: TelemetryEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(telemetryEvent);

    // In a real implementation, you would send this to your analytics service
    console.log('Telemetry Event:', telemetryEvent);

    // Store in localStorage for persistence (in a real app, you'd send to a server)
    try {
      const stored = localStorage.getItem('telemetry_events');
      const existingEvents = stored ? JSON.parse(stored) : [];
      existingEvents.push(telemetryEvent);
      
      // Keep only last 100 events to avoid storage bloat
      const recentEvents = existingEvents.slice(-100);
      localStorage.setItem('telemetry_events', JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('Failed to store telemetry event:', error);
    }
  }

  trackGenerateChain(chainId: string, sceneCount: number, metadata?: Record<string, unknown>) {
    this.track({
      type: 'generate_chain',
      chainId,
      metadata: {
        sceneCount,
        ...metadata,
      },
    });
  }

  trackUpdateChain(chainId: string, editCount: number, metadata?: Record<string, unknown>) {
    this.track({
      type: 'update_chain',
      chainId,
      metadata: {
        editCount,
        ...metadata,
      },
    });
  }

  trackReorderScene(chainId: string, sceneId: string, fromOrder: number, toOrder: number) {
    this.track({
      type: 'reorder_scene',
      chainId,
      sceneId,
      metadata: {
        fromOrder,
        toOrder,
      },
    });
  }

  trackEditScene(chainId: string, sceneId: string, field: 'title' | 'objective', metadata?: Record<string, unknown>) {
    this.track({
      type: 'edit_scene',
      chainId,
      sceneId,
      metadata: {
        field,
        ...metadata,
      },
    });
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  getEventsByType(type: TelemetryEvent['type']): TelemetryEvent[] {
    return this.events.filter(event => event.type === type);
  }

  getEventsByChain(chainId: string): TelemetryEvent[] {
    return this.events.filter(event => event.chainId === chainId);
  }

  clearEvents() {
    this.events = [];
    localStorage.removeItem('telemetry_events');
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('telemetry_enabled', enabled.toString());
  }

  isTelemetryEnabled(): boolean {
    return this.isEnabled;
  }

  // Load events from localStorage on initialization
  loadStoredEvents() {
    try {
      const stored = localStorage.getItem('telemetry_events');
      if (stored) {
        const storedEvents = JSON.parse(stored);
        this.events = storedEvents;
      }
    } catch (error) {
      console.warn('Failed to load stored telemetry events:', error);
    }
  }

  // Export events for analytics (in a real implementation, you'd send to a server)
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  // Get analytics summary
  getAnalyticsSummary() {
    const events = this.events;
    const generateEvents = this.getEventsByType('generate_chain');
    const updateEvents = this.getEventsByType('update_chain');
    const reorderEvents = this.getEventsByType('reorder_scene');
    const editEvents = this.getEventsByType('edit_scene');

    return {
      totalEvents: events.length,
      generateChainCount: generateEvents.length,
      updateChainCount: updateEvents.length,
      reorderSceneCount: reorderEvents.length,
      editSceneCount: editEvents.length,
      uniqueChains: new Set(events.map(e => e.chainId).filter(Boolean)).size,
      averageScenesPerChain: generateEvents.length > 0 
        ? generateEvents.reduce((sum, e) => sum + (e.metadata?.sceneCount as number || 0), 0) / generateEvents.length 
        : 0,
    };
  }
}

// Create a singleton instance
export const telemetry = new TelemetryService();

// Load stored events on initialization
telemetry.loadStoredEvents();
