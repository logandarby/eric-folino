import { useState, useEffect } from 'react';

const preloadImage = (src: string, onProgress: () => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      onProgress();
      resolve();
    };
    img.onerror = () => reject();
  });
};

export const useImagePreloader = (imageSources: string[]) => {
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let loadedCount = 0;
    const totalImages = imageSources.length;

    const handleProgress = () => {
      loadedCount++;
      setProgress(loadedCount / totalImages);
    };

    const loadImages = async () => {
      try {
        // Reset progress when starting a new load
        setProgress(0);
        loadedCount = 0;

        await Promise.all(
          imageSources.map((src) => preloadImage(src, handleProgress))
        );
        setImagesLoaded(true);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to load images')
        );
      }
    };

    loadImages();

    // Cleanup function to handle component unmounting
    return () => {
      loadedCount = 0;
      setProgress(0);
    };
  }, [imageSources]);

  return { imagesLoaded, error, progress };
};
