import { useState, useEffect } from 'react';

type UseWindowDimensionsType = {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isBigScreen: boolean;
};

const getWindowDimensions = (window: Window): UseWindowDimensionsType => {
  const { innerWidth: width, innerHeight: height } = window;
  let isMobile = false;
  let isTablet = false;
  let isBigScreen = false;

  if (width < 768) {
    isMobile = true;
  }
  if (width >= 768 && width < 1024) {
    isTablet = true;
  }
  if (width >= 1024) {
    isBigScreen = true;
  }

  return {
    width,
    height,
    isMobile,
    isTablet,
    isBigScreen
  };
};

const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState<UseWindowDimensionsType>({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isBigScreen: false
  });

  useEffect(() => {
    if (!window) return;
    if (windowDimensions.width === 0) {
      setWindowDimensions(getWindowDimensions(window));
    }

    function handleResize() {
      setWindowDimensions(getWindowDimensions(window));
    }

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
};

export default useWindowDimensions;
