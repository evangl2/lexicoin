import { useVelocity, useTransform, useSpring, useMotionValue, MotionValue } from 'motion/react';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';

interface useCardPhysicsParams {
  x: MotionValue<number>;
  y: MotionValue<number>;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  windowWidth: MotionValue<number>;
  windowHeight: MotionValue<number>;
  isExpanded: boolean;
  isFlipped: boolean;
}

/**
 * Hook to manage card physics: velocity-based tilt, mouse parallax, and rotation transforms.
 * Encapsulates the reactive transform chains driven by card movement and user interaction.
 */
export function useCardPhysics({
  x,
  y,
  mouseX,
  mouseY,
  windowWidth,
  windowHeight,
  isExpanded,
  isFlipped,
}: useCardPhysicsParams) {
  // Velocity-based tilt
  const xVelocity = useVelocity(x);
  const yVelocity = useVelocity(y);

  const smoothXVelocity = useSpring(xVelocity, CardPersona.physics.springs.smoothVelocity);
  const smoothYVelocity = useSpring(yVelocity, CardPersona.physics.springs.smoothVelocity);

  const velocityRotateY = useTransform(smoothXVelocity, CardPersona.physics.tilt.velocityRange, CardPersona.physics.tilt.rotateY);
  const rawRotateX = useTransform(smoothYVelocity, CardPersona.physics.tilt.velocityRange, CardPersona.physics.tilt.rotateX);
  const velocityRotateX = useTransform(rawRotateX, (v) => -v);
  const velocityRotateZ = useTransform(smoothXVelocity, [-2000, 2000], CardPersona.physics.tilt.rotateZ);

  // Mouse-based tilt (Inspection mode)
  const mouseSpringX = useSpring(mouseX, CardPersona.physics.springs.mouseTilt);
  const mouseSpringY = useSpring(mouseY, CardPersona.physics.springs.mouseTilt);

  const mouseRotateY = useTransform([mouseSpringX, windowWidth], ([val = 0, w = 0]: number[]) => {
    const center = w / 2;
    return ((val - center) / center) * CardPersona.physics.inspection.tiltFactor;
  });

  const mouseRotateX = useTransform([mouseSpringY, windowHeight], ([val = 0, h = 0]: number[]) => {
    const center = h / 2;
    return ((val - center) / center) * CardPersona.physics.inspection.tiltFactor;
  });

  const zeroRotation = useMotionValue(0);

  // Consolidated display rotations
  const displayRotateX = isFlipped ? zeroRotation : (isExpanded ? mouseRotateX : velocityRotateX);
  const displayRotateY = isFlipped ? zeroRotation : (isExpanded ? mouseRotateY : velocityRotateY);
  const displayRotateZ = isFlipped ? zeroRotation : (isExpanded ? zeroRotation : velocityRotateZ);

  // Parallax offsets
  const bgParallaxX = useTransform(displayRotateY, [-20, 20], [15, -15]);
  const bgParallaxY = useTransform(displayRotateX, [-20, 20], [15, -15]);
  const fgParallaxX = useTransform(displayRotateY, [-20, 20], [-25, 25]);
  const fgParallaxY = useTransform(displayRotateX, [-20, 20], [-25, 25]);

  return {
    velocityRotateX,
    velocityRotateY,
    velocityRotateZ,
    mouseRotateX,
    mouseRotateY,
    displayRotateX,
    displayRotateY,
    displayRotateZ,
    bgParallaxX,
    bgParallaxY,
    fgParallaxX,
    fgParallaxY,
    smoothXVelocity,
    smoothYVelocity,
    zeroRotation,
  };
}
