import { useState, useEffect, useRef } from 'react';
import { LAYOUT } from '../constants/layout';

export function useResponsiveLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setIsMobile(window.innerWidth <= LAYOUT.MOBILE_BREAKPOINT);

    const handleResize = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsMobile(window.innerWidth <= LAYOUT.MOBILE_BREAKPOINT);
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    setCollapsed(prev => (isMobile && !prev) ? true : prev);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || collapsed) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && e.target instanceof HTMLElement && !e.target.closest('.ant-modal, .ant-dropdown, .ant-select')) {
        setCollapsed(true);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, collapsed]);

  return { collapsed, setCollapsed, isMobile };
}
