import React, { useEffect, useState, useRef, useCallback } from "react";

// Lista de imágenes de quesos (puedes añadir/quitar según tus necesidades)
const CHEESE_IMAGES = [
  "/note-logos/64/burgos-full.png",
  "/note-logos/64/burgos-wedge.png",
  "/note-logos/64/cabrales-full.png",
  "/note-logos/64/cabrales-wedge.png",
  "/note-logos/64/emmental-full.png",
  "/note-logos/64/emmental-wedge.png",
  "/note-logos/64/parmigiano-reggiano-full.png",
  "/note-logos/64/parmigiano-reggiano-wedge.png",
  "/note-logos/64/tresviso-full.png",
  "/note-logos/64/tresviso-wedge.png",
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

interface CheeseRainProps {
  count?: number;
  minSize?: number;
  maxSize?: number;
  minDuration?: number;
  maxDuration?: number;
  minDelay?: number;
  maxDelay?: number;
}

const CheeseRain: React.FC<CheeseRainProps> = ({
  count = 30,
  minSize = 32,
  maxSize = 64,
  minDuration = 2,
  maxDuration = 5,
  minDelay = 0,
  maxDelay = 2,
}) => {
  const [cheeses, setCheeses] = useState<any[]>([]);
  const [active, setActive] = useState(false);
  const finishedCount = useRef(0);

  const triggerRain = useCallback(() => {
    setActive(true);
    finishedCount.current = 0;
    setCheeses(
      Array.from({ length: count }, (_, i) => ({
        id: i + "-" + Date.now(),
        left: randomBetween(0, 95) + "vw",
        delay: randomBetween(minDelay, maxDelay) + "s",
        duration: randomBetween(minDuration, maxDuration) + "s",
        rotate: randomBetween(-180, 180),
        size: randomBetween(minSize, maxSize),
        img: CHEESE_IMAGES[Math.floor(Math.random() * CHEESE_IMAGES.length)],
      })),
    );
  }, [count, minDelay, maxDelay, minDuration, maxDuration, minSize, maxSize]);

  const triggerRef = useRef(triggerRain);
  triggerRef.current = triggerRain;

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = (window as any).vimMode;
    if (vm?.registerSequence) {
      // Register via VimMode — prevents H/S/etc. from firing mid-sequence
      vm.registerSequence("cheese", {
        run: () => triggerRef.current(),
        hidden: true,
        insertMode: true,
        timeout: 500,
      });
      return () => vm.unregister("c");
    }

    // Fallback: own listener (if VimMode is not available)
    let buffer = "";
    const onKeyDown = (e: KeyboardEvent) => {
      buffer += e.key.toLowerCase();
      if (buffer.length > 6) buffer = buffer.slice(-6);
      if (buffer === "cheese") {
        triggerRef.current();
        buffer = "";
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  // Cuando todas las imágenes terminan su animación, desactiva el efecto
  const handleAnimationEnd = () => {
    finishedCount.current += 1;
    if (finishedCount.current >= cheeses.length) {
      setActive(false);
      setCheeses([]);
    }
  };

  if (!active) return null;
  return (
    <div
      style={{
        pointerEvents: "none",
        position: "fixed",
        inset: 0,
        zIndex: 9999,
      }}
    >
      {cheeses.map((c) => (
        <img
          key={c.id}
          src={c.img}
          alt="cheese"
          style={{
            position: "absolute",
            left: c.left,
            top: "-80px",
            width: c.size + "px",
            height: c.size + "px",
            transform: `rotate(${c.rotate}deg)`,
            animation: `cheese-fall ${c.duration} linear ${c.delay} forwards`,
          }}
          onAnimationEnd={handleAnimationEnd}
        />
      ))}
      <style>{`
        @keyframes cheese-fall {
          to {
            top: 100vh;
            transform: rotate(720deg);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default CheeseRain;
