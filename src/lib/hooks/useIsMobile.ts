import { useState, useEffect } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      // Check both width and touch capability for better detection
      const isMobileWidth = window.innerWidth < 768;

      // Check for touch capability - most mobile devices are touch-enabled
      const isTouchDevice =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).msMaxTouchPoints > 0;

      // Check for mobile user agent as backup detection method
      const isMobileUserAgent =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      // Consider it mobile if width is small or both touch and user agent suggest mobile
      setIsMobile(isMobileWidth || (isTouchDevice && isMobileUserAgent));
    };

    // Initial check
    checkIfMobile();

    // Add event listener for resize
    window.addEventListener("resize", checkIfMobile);

    // Add event listener for orientation change (specific to mobile)
    window.addEventListener("orientationchange", checkIfMobile);

    // Cleanup
    return () => {
      window.removeEventListener("resize", checkIfMobile);
      window.removeEventListener("orientationchange", checkIfMobile);
    };
  }, []);

  return isMobile;
}

// Additional hook for detecting specific mobile screen sizes
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    isXs: false, // < 480px
    isSm: false, // 480-640px
    isMd: false, // 640-768px
    isLg: false, // 768-1024px
    isXl: false, // 1024+
    orientation:
      typeof window !== "undefined"
        ? window.innerWidth > window.innerHeight
          ? "landscape"
          : "portrait"
        : "portrait",
  });

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setScreenSize({
        width,
        height,
        isXs: width < 480,
        isSm: width >= 480 && width < 640,
        isMd: width >= 640 && width < 768,
        isLg: width >= 768 && width < 1024,
        isXl: width >= 1024,
        orientation: width > height ? "landscape" : "portrait",
      });
    };

    // Set on mount
    updateScreenSize();

    // Update on resize and orientation change
    window.addEventListener("resize", updateScreenSize);
    window.addEventListener("orientationchange", updateScreenSize);

    return () => {
      window.removeEventListener("resize", updateScreenSize);
      window.removeEventListener("orientationchange", updateScreenSize);
    };
  }, []);

  return screenSize;
}
