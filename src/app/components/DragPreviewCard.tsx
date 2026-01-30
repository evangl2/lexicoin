import React from 'react';
import { CardVisual } from '@/app/components/CardVisual';

interface DragPreviewCardProps {
  title: string;
  image?: string;
  width?: number;
  height?: number;
  scale?: number;
  difficultyLevel?: string;
  partOfSpeech?: string;
  durability?: number;
  systemLanguage?: string;
  learningLanguage?: string;
  layoutMode?: 'default' | 'compact';
  persona?: any;
}

export const DragPreviewCard: React.FC<DragPreviewCardProps> = ({
  title,
  width = 250,
  height = 350,
  scale = 1,
  difficultyLevel = "A1",
  partOfSpeech = "n.",
  durability = 100,
  systemLanguage = "ENGLISH",
  learningLanguage = "ENGLISH",
  layoutMode = 'default',
  persona,
}) => {
  return (
    <div
      style={{
        width,
        height,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
      className="relative select-none pointer-events-none"
    >
      <CardVisual
        title={title}
        difficultyLevel={difficultyLevel}
        partOfSpeech={partOfSpeech}
        durability={durability}
        learningLanguage={learningLanguage}
        systemLanguage={systemLanguage}
        layoutMode={layoutMode}
        persona={persona}
        // Force front face visible
        frontOpacity={1}
        backOpacity={0}
        flipScaleX={1}
        // Disable interactions
        isActive={false}
        isOver={false}
        frontPointerEvents="none"
        backPointerEvents="none"
      />
    </div>
  );
};
