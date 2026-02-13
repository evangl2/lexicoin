import { CompactCardVisual } from '@/app/components/ui/CompactCardVisual';
import { CardVisual } from '@/app/components/ui/CardVisual';
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
      payload: ''
    },
    learningLanguage: learningLanguage as any,
    systemLanguage: systemLanguage as any,
    persona: persona
  };

  // Explicitly disable physics/glare
  const zero = useMotionValue(0);

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
      {layoutMode === 'compact' ? (
        <CompactCardVisual
          {...commonProps}
          visual={commonProps.visual as any}
          width={width}
          height={height}
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
