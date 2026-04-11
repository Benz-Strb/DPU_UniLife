type Listener = () => void;
const listeners: Record<string, Listener[]> = {};

export const tabRefreshEmitter = {
  on: (tab: string, fn: Listener) => {
    if (!listeners[tab]) listeners[tab] = [];
    listeners[tab].push(fn);
  },
  off: (tab: string, fn: Listener) => {
    listeners[tab] = (listeners[tab] || []).filter((l) => l !== fn);
  },
  emit: (tab: string) => {
    (listeners[tab] || []).forEach((fn) => fn());
  },
};
