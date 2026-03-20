import { CompactCardVisual } from '@/app/components/ui/card/CompactCardVisual';
import { CardVisual } from '@/app/components/ui/card/CardVisual';
import { useMotionValue } from 'motion/react';

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
  // New props for robust preview
  cardMode?: 'repository' | 'icon' | 'word';
  visualPayload?: string;
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
  cardMode, // Optional: if provided, overrides layoutMode to be 'compact' and uses specific sub-mode
  visualPayload,
  persona,
}) => {
  const commonProps = {
    learningData: {
      word: title || '',
      pronunciation: '',
      pos: partOfSpeech as any,
      level: difficultyLevel as any,
      definition: '',
      flavorContents: []
    },
    systemData: {
      word: title || '',
      pronunciation: '',
      pos: partOfSpeech as any,
      level: difficultyLevel as any,
      definition: '',
      flavorContents: []
    },
    senseInfo: {
      ontology: 'OBJECT' as any,
      frequency: 50,
      fingerprint: { items: [] },
      personas: [],
      durability: durability
    },
    visual: {
      status: 'idle' as const,
      payload: visualPayload || '' // Use passed payload
    },
    learningLanguage: learningLanguage as any,
    systemLanguage: systemLanguage as any,
    persona: persona
  };

  // Explicitly disable physics/glare
  const zero = useMotionValue(0);

  // Determine effective mode
  const effectiveLayoutMode = cardMode ? 'compact' : layoutMode;

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
      {effectiveLayoutMode === 'compact' ? (
        <CompactCardVisual
          mode={cardMode || 'repository'} // Default to repository if cardMode not specified but layout is compact
          learningData={commonProps.learningData}
          senseInfo={commonProps.senseInfo as any}
          visual={commonProps.visual as any}
          persona={commonProps.persona}
        />
      ) : (
        <CardVisual
          {...commonProps}
          isActive={false}
          isOver={false}
          frontOpacity={1}
          backOpacity={0}
          flipScaleX={1}
          // Force disable physics
          smoothXVelocity={zero}
          smoothYVelocity={zero}
          displayRotateY={zero}
        />
      )}
    </div>
  );
};
