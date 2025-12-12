import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  showNav?: boolean;
  header?: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  showNav = true,
  header,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "min-h-screen bg-background",
        showNav && "pb-20",
        className
      )}
    >
      {header && (
        <header className="sticky top-0 z-40 glass border-b border-border safe-top">
          {header}
        </header>
      )}
      <main className="px-4 py-4">
        {children}
      </main>
    </motion.div>
  );
};
