import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseSwipeNavigationOptions {
  enabled?: boolean;
  targetPath?: string;
  threshold?: number; // minimum distance in pixels
  onSwipe?: () => void;
}

export function useSwipeNavigation({
  enabled = true,
  targetPath = '/dashboard',
  threshold = 100,
  onSwipe,
}: UseSwipeNavigationOptions = {}) {
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || touchStartX.current === null || touchStartY.current === null) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    
    // Check if swipe is horizontal enough (not diagonal)
    // Swipe right (deltaX > 0) should navigate back
    if (deltaX > threshold && deltaY < 100) {
      if (onSwipe) {
        onSwipe();
      } else {
        navigate(targetPath);
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  }, [enabled, threshold, navigate, targetPath, onSwipe]);

  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchEnd]);
}
