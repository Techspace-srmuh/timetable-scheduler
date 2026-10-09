"use client";

import dynamic from "next/dynamic";
import type { DotLottie } from "@lottiefiles/dotlottie-react";
import { useCallback, useEffect, useRef, useState } from "react";

const DotLottieReact = dynamic(
  () =>
    import("@lottiefiles/dotlottie-react").then(
      (module) => module.DotLottieReact
    ),
  { ssr: false }
);

const REACTIONS = [
  "curious",
  "cheerful",
  "sleepy",
  "surprised",
  "thoughtful",
  "grumpy",
] as const;

type Reaction = (typeof REACTIONS)[number] | null;

export default function SidebarRobot() {
  const lookRef = useRef<HTMLDivElement>(null);
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
  const [reaction, setReaction] = useState<Reaction>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const handleLottieRef = useCallback((instance: DotLottie | null) => {
    setDotLottie(instance);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    const desktopLayout = window.matchMedia("(min-width: 1024px)");
    const updateSidebarVisibility = () =>
      setSidebarVisible(desktopLayout.matches);

    updatePreference();
    updateSidebarVisibility();
    preference.addEventListener("change", updatePreference);
    desktopLayout.addEventListener("change", updateSidebarVisibility);

    return () => {
      preference.removeEventListener("change", updatePreference);
      desktopLayout.removeEventListener("change", updateSidebarVisibility);
    };
  }, []);

  useEffect(() => {
    if (!dotLottie) return;

    if (reducedMotion || !sidebarVisible) {
      dotLottie.pause();
      dotLottie.setFrame(0);
    } else {
      dotLottie.play();
    }
  }, [dotLottie, reducedMotion, sidebarVisible]);

  useEffect(() => {
    if (reducedMotion || !sidebarVisible) return;

    const pointerCapability = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );
    const lookElement = lookRef.current;
    if (!lookElement) return;

    const resetLook = () => {
      lookElement.style.setProperty("--robot-rotate-x", "0deg");
      lookElement.style.setProperty("--robot-rotate-y", "0deg");
      lookElement.style.setProperty("--robot-shift-x", "0px");
      lookElement.style.setProperty("--robot-shift-y", "0px");
    };

    const trackPointer = (event: PointerEvent) => {
      if (!pointerCapability.matches || event.pointerType === "touch") return;

      const horizontal = Math.max(
        -1,
        Math.min(1, (event.clientX / window.innerWidth - 0.5) * 2)
      );
      const vertical = Math.max(
        -1,
        Math.min(1, (event.clientY / window.innerHeight - 0.5) * 2)
      );

      lookElement.style.setProperty(
        "--robot-rotate-y",
        `${horizontal * 7}deg`
      );
      lookElement.style.setProperty(
        "--robot-rotate-x",
        `${vertical * -5}deg`
      );
      lookElement.style.setProperty(
        "--robot-shift-x",
        `${horizontal * 2}px`
      );
      lookElement.style.setProperty(
        "--robot-shift-y",
        `${vertical * 2}px`
      );
    };

    const timers: number[] = [];
    let cancelled = false;

    const scheduleReaction = () => {
      const wait = 8000 + Math.random() * 7000;
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;

          const nextReaction =
            REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
          setReaction(nextReaction);
          timers.push(
            window.setTimeout(
              () => setReaction(null),
              1000 + Math.random() * 400
            )
          );
          scheduleReaction();
        }, wait)
      );
    };

    const syncPointerTracking = () => {
      if (pointerCapability.matches) {
        window.addEventListener("pointermove", trackPointer, {
          passive: true,
        });
      } else {
        window.removeEventListener("pointermove", trackPointer);
      }
      resetLook();
    };

    if (pointerCapability.matches) {
      window.addEventListener("pointermove", trackPointer, { passive: true });
    }
    window.addEventListener("blur", resetLook);
    pointerCapability.addEventListener("change", syncPointerTracking);
    scheduleReaction();

    return () => {
      cancelled = true;
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("blur", resetLook);
      pointerCapability.removeEventListener("change", syncPointerTracking);
      timers.forEach((timer) => window.clearTimeout(timer));
      resetLook();
      setReaction(null);
    };
  }, [reducedMotion, sidebarVisible]);

  return (
    <div className="sidebar-robot-slot" aria-hidden="true">
      <div
        ref={lookRef}
        className="sidebar-robot-look"
        data-reaction={reaction ?? undefined}
      >
        <div className="sidebar-robot-motion">
          <DotLottieReact
            src="/ai-robot-vector-art.lottie"
            autoplay={!reducedMotion && sidebarVisible}
            loop={!reducedMotion && sidebarVisible}
            speed={0.9}
            backgroundColor="transparent"
            layout={{ fit: "contain", align: [0.5, 0.5] }}
            dotLottieRefCallback={handleLottieRef}
            className="sidebar-robot-animation"
          />
        </div>
      </div>
    </div>
  );
}
