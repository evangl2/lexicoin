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
        learningData={{
          word: title || '',
          pronunciation: '',
          pos: partOfSpeech as any,
          level: difficultyLevel as any,
          definition: '',
          flavorContents: []
        }}
        systemData={{
          word: title || '',
          pronunciation: '',
          pos: partOfSpeech as any,
          level: difficultyLevel as any,
          definition: '',
          flavorContents: []
        }}
        senseInfo={{
          ontology: 'OBJECT',
          frequency: 50,
          fingerprint: { items: [] },
          personas: [],
          durability: durability
        }}
        visual={{
          status: 'idle',
          payload: ''
        }}
        learningLanguage={learningLanguage as any}
        systemLanguage={systemLanguage as any}
        layoutMode={layoutMode}
        persona={persona}
        // Force front face visible
        frontOpacity={1}
        backOpacity={0}
        flipScaleX={1}
        // Disable interactions
        isActive={false}
        isOver={false}
      />
    </div>
  );
};
