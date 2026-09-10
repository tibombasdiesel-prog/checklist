import { useState, useEffect } from 'react';
import type { ChecklistWithPhotos } from '../../shared/checklist-types';

export function useChecklists() {
  const [checklists, setChecklists] = useState<ChecklistWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklists = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/checklists', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch checklists');
      }

      const data = await response.json();
      setChecklists(data.checklists);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, []);

  return { checklists, loading, error, refetch: fetchChecklists };
}

export function useChecklist(id: number) {
  const [checklist, setChecklist] = useState<ChecklistWithPhotos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklist = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/checklists/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch checklist');
      }

      const data = await response.json();
      setChecklist(data.checklist);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchChecklist();
    }
  }, [id]);

  return { checklist, loading, error, refetch: fetchChecklist };
}
