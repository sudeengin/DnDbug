import logger from '@/utils/logger';
import { debug } from '@/utils/debug-collector';

const log = logger.api;

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  // Ensure we're using the correct base URL for API calls
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
  
  log.info('Making POST request to:', fullUrl);
  debug.apiCall(url, 'POST', body);
  
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  
  log.info('Response status:', res.status, 'ok:', res.ok);
  
  if (!res.ok) {
    const text = await res.text()
    log.error('Error response:', text);
    debug.apiCall(url, 'POST', body, undefined, { status: res.status, text });
    throw new Error(text || `HTTP ${res.status}`)
  }
  
  const data = await res.json() as T;
  debug.apiCall(url, 'POST', body, data);
  return data;
}

export async function getJSON<T>(url: string): Promise<T> {
  log.info('Making GET request to:', url);
  debug.apiCall(url, 'GET');
  
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  
  log.info('Response status:', res.status, 'ok:', res.ok);
  
  if (!res.ok) {
    const text = await res.text()
    log.error('Error response:', text);
    debug.apiCall(url, 'GET', undefined, undefined, { status: res.status, text });
    throw new Error(text || `HTTP ${res.status}`)
  }
  
  const data = await res.json() as T;
  log.info('Response data:', data);
  debug.apiCall(url, 'GET', undefined, data);
  return data;
}

export async function patchJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function deleteJSON<T>(url: string): Promise<T> {
  log.info('Making DELETE request to:', url);
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// API wrapper functions for specific endpoints
export interface GenerateChainRequest {
  sessionId: string;
  requestId?: string;
}

export interface GenerateChainResponse {
  ok: boolean;
  data: {
    chainId: string;
    scenes: Array<{
      id: string;
      order: number;
      title: string;
      objective: string;
    }>;
    meta?: any;
    createdAt: string;
    updatedAt: string;
  };
}

export async function generateChain(request: GenerateChainRequest): Promise<GenerateChainResponse> {
  return postJSON<GenerateChainResponse>('/api/generate_chain', {
    sessionId: request.sessionId,
    concept: 'Generate macro chain based on locked background',
    meta: { source: 'macroChainTab', requestId: request.requestId }
  });
}

// Scene Lock/Unlock API
export interface LockSceneRequest {
  sessionId: string;
  sceneId: string;
}

export interface LockSceneResponse {
  ok: boolean;
  detail: any; // SceneDetail
}

export interface UnlockSceneRequest {
  sessionId: string;
  sceneId: string;
}

export interface UnlockSceneResponse {
  ok: boolean;
  detail: any; // SceneDetail
  affectedScenes: string[];
}

export async function lockScene(request: LockSceneRequest): Promise<LockSceneResponse> {
  return postJSON<LockSceneResponse>('/api/scene/lock', request);
}

export async function unlockScene(request: UnlockSceneRequest): Promise<UnlockSceneResponse> {
  return postJSON<UnlockSceneResponse>('/api/scene/unlock', request);
}

// Generate Detail API
export interface GenerateDetailRequest {
  sceneId: string;
  macroScene: {
    id: string;
    order: number;
    title: string;
    objective: string;
  };
  effectiveContext: {
    keyEvents: string[];
    revealedInfo: string[];
    stateChanges: Record<string, any>;
    npcRelationships?: Record<string, any>;
    environmentalState?: Record<string, any>;
    plotThreads?: Array<any>;
    playerDecisions?: Array<any>;
  };
  sessionId?: string;
}

export interface GenerateDetailResponse {
  ok: boolean;
  data: any; // SceneDetail
}

export async function generateDetail(request: GenerateDetailRequest): Promise<GenerateDetailResponse> {
  log.info('API generateDetail called with:', {
    sessionId: request.sessionId,
    sceneId: request.sceneId,
    hasSessionId: !!request.sessionId,
    requestKeys: Object.keys(request)
  });
  return postJSON<GenerateDetailResponse>('/api/generate_detail', request);
}

// Generate Next Scene API
export interface GenerateNextSceneRequest {
  sessionId: string;
  previousSceneId: string;
  gmIntent: string;
}

export interface GenerateNextSceneResponse {
  ok: boolean;
  data: {
    id: string;
    sequence: number;
    title: string;
    objective: string;
    status: string;
    meta?: any;
    createdAt: string;
    lastUpdatedAt: string;
    version: number;
  };
}

export async function generateNextScene(request: GenerateNextSceneRequest): Promise<GenerateNextSceneResponse> {
  log.info('API generateNextScene called with:', {
    sessionId: request.sessionId,
    previousSceneId: request.previousSceneId,
    gmIntent: request.gmIntent
  });
  return postJSON<GenerateNextSceneResponse>('/api/generate_next_scene', request);
}

// Scene Update API
export interface UpdateSceneRequest {
  sessionId: string;
  sceneId: string;
  title?: string;
  objective?: string;
}

export interface UpdateSceneResponse {
  ok: boolean;
  data: any; // SceneDetail
}

export async function updateScene(request: UpdateSceneRequest): Promise<UpdateSceneResponse> {
  log.info('API updateScene called with:', {
    sessionId: request.sessionId,
    sceneId: request.sceneId,
    hasTitle: !!request.title,
    hasObjective: !!request.objective
  });
  return postJSON<UpdateSceneResponse>('/api/scene/update', request);
}

// Scene Delete API
export interface DeleteSceneRequest {
  sessionId: string;
  sceneId: string;
}

export interface DeleteSceneResponse {
  ok: boolean;
  deletedSceneId: string;
  reindexedScenes: number;
}

export async function deleteScene(request: DeleteSceneRequest): Promise<DeleteSceneResponse> {
  log.info('API deleteScene called with:', {
    sessionId: request.sessionId,
    sceneId: request.sceneId
  });
  return postJSON<DeleteSceneResponse>('/api/scene/delete', request);
}
