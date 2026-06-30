/**
 * Tokens de animação compartilhados.
 * iOS spring: cubic-bezier com leve overshoot, duração ~280ms.
 */

export const SPRING_IOS = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

export const SPRING_FIRM = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 36,
  mass: 0.7,
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 26,
  mass: 0.9,
};

export const EASE_IOS = [0.32, 0.72, 0, 1] as const;
export const EASE_OUT  = [0.22, 1, 0.36, 1] as const;
