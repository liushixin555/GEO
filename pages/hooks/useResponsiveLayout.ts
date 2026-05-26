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

  return { collapsed, setCollapsed, isMobile };
}
