import { useState, useCallback, useEffect } from 'react';

export function useCollapsedSections(storageKey: string) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setCollapsed(JSON.parse(stored));
      }
    } catch {
      // Ignore storage errors
    }
  }, [storageKey]);

  // Save to localStorage when collapsed changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(collapsed));
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, collapsed]);

  const toggle = useCallback((sectionId: string) => {
    setCollapsed(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  const isCollapsed = useCallback((sectionId: string) => {
    return collapsed[sectionId] ?? false;
  }, [collapsed]);

  return { collapsed, toggle, isCollapsed };
}
