import React, { useCallback } from "react";
import { LogoAnimation } from "./cave/intro";
import pixelMode from "../utils/pixel-mode";

/**
 * Homepage hero wrapper that connects LogoAnimation's interactive mode
 * to the pixel-mode system: when the user clicks through to the fully
 * pixelated state, pixel mode is unlocked and activated.
 */
const HeroLogo: React.FC<{
  width?: number;
  height?: number;
  pixelScale?: number;
  duration?: number;
}> = (props) => {
  const [initialClicks, setInitialClicks] = React.useState(() =>
    pixelMode.isActive() ? 5 : 0,
  );

  React.useEffect(() => {
    const handlePixelModeChange = (e: Event) => {
      const active = (e as CustomEvent<boolean>).detail;
      setInitialClicks(active ? 5 : 0);
    };
    window.addEventListener("pixel-mode-change", handlePixelModeChange);
    return () => {
      window.removeEventListener("pixel-mode-change", handlePixelModeChange);
    };
  }, []);

  const handlePixelModeUnlocked = useCallback(() => {
    pixelMode.unlock();
    pixelMode.activate();
  }, []);

  return (
    <LogoAnimation
      {...props}
      loop={false}
      mode="interactive"
      initialClicks={initialClicks}
      onPixelModeUnlocked={handlePixelModeUnlocked}
    />
  );
};

export default HeroLogo;
