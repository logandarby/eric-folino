import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  progress: number;
  isVisible: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  isVisible,
}) => {
  const percentage = Math.round(progress * 100);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-black flex items-center justify-center px-8 z-50 backdrop-blur-2xl"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <div className="text-yellow-50 text-center">
            <h2 className="text-2xl font-display mb-4">
              Loading Experience...
            </h2>
            <div className="h-4 bg-black overflow-hidden border-2 border-yellow-50">
              <motion.div
                className="h-full bg-yellow-50 transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-courier">{percentage}%</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
