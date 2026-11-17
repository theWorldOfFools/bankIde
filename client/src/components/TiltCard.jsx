import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';

export default function TiltCard({
  children,
  className = '',
  intensity = 7,
  lift = 5,
  ...props
}) {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 260, damping: 24, mass: 0.6 });
  const smoothY = useSpring(pointerY, { stiffness: 260, damping: 24, mass: 0.6 });
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [intensity, -intensity]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-intensity, intensity]);

  function handlePointerMove(event) {
    if (reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function resetTilt() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      whileHover={reducedMotion ? undefined : { y: -lift }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      style={reducedMotion ? undefined : {
        rotateX,
        rotateY,
        transformPerspective: 1000,
        transformStyle: 'preserve-3d',
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
