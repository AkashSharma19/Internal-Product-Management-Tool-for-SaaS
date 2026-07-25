import confetti from 'canvas-confetti';
import { playSuccessChime } from './audio';

/**
 * Triggers a vibrant multi-stage celebration confetti burst.
 * Designed for milestone and feature release completions.
 */
export function triggerReleaseConfetti() {
  try {
    playSuccessChime();
    // Initial central burst
    confetti({
      particleCount: 85,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
      disableForReducedMotion: true,
      zIndex: 99999
    });

    // Side cannon bursts for extra delight
    setTimeout(() => {
      confetti({
        particleCount: 45,
        angle: 60,
        spread: 55,
        origin: { x: 0.1, y: 0.7 },
        colors: ['#7c3aed', '#06b6d4', '#10b981'],
        zIndex: 99999
      });
      confetti({
        particleCount: 45,
        angle: 120,
        spread: 55,
        origin: { x: 0.9, y: 0.7 },
        colors: ['#f59e0b', '#ec4899', '#3b82f6'],
        zIndex: 99999
      });
    }, 220);
  } catch (err) {
    console.error('Failed to trigger confetti animation:', err);
  }
}
