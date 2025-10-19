// Router utilities for sessionId and tab management

export function getSessionIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('sessionId');
}

export function getTabFromUrl(): string {
  const hash = window.location.hash;
  if (hash.startsWith('#tab=')) {
    return hash.substring(5);
  }
  return 'overview';
}

export function getSceneFromUrl(): number | null {
  const hash = window.location.hash;
  const sceneMatch = hash.match(/#scene=(\d+)/);
  return sceneMatch ? parseInt(sceneMatch[1], 10) : null;
}

export function setUrlParams(sessionId: string, tab?: string, scene?: number) {
  const url = new URL(window.location.href);
  url.searchParams.set('sessionId', sessionId);
  
  if (tab) {
    url.hash = `#tab=${tab}`;
  }
  
  if (scene !== undefined) {
    url.hash = `#tab=${tab || 'scenes'}&scene=${scene}`;
  }
  
  window.history.replaceState({}, '', url.toString());
}

export function navigateToProjectCreate() {
  window.location.href = '/';
}

export function navigateToTab(sessionId: string, tab: string, scene?: number) {
  setUrlParams(sessionId, tab, scene);
}
