"use client";

import dynamic from "next/dynamic";
import type { DotLottie } from "@lottiefiles/dotlottie-react";
import { ArrowRight, CalendarDays } from "lucide-react";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ErrorInfo, ReactNode } from "react";

const DotLottieReact = dynamic(
  () =>
    import("@lottiefiles/dotlottie-react").then(
      (module) => module.DotLottieReact
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="startup-intro__static-mark startup-intro__loading-mark"
        aria-hidden="true"
      >
        <CalendarDays size={58} strokeWidth={1.35} />
      </div>
    ),
  }
);

class AnimationErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unable to load the Chronos intro animation.", error, info);
    this.props.onError();
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          className="startup-intro__static-mark startup-intro__loading-mark"
          aria-hidden="true"
        >
          <CalendarDays size={58} strokeWidth={1.35} />
        </div>
      );
    }

    return this.props.children;
  }
}

export default function StartupIntro({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const completed = useRef(false);
  const exitTimer = useRef<number | null>(null);
  const player = useRef<DotLottie | null>(null);

  const finishIntro = useCallback(() => {
    if (completed.current) return;

    completed.current = true;
    setLeaving(true);
    exitTimer.current = window.setTimeout(onComplete, 550);
  }, [onComplete]);

  const handlePlayerRef = useCallback(
    (instance: DotLottie | null) => {
      if (player.current) {
        player.current.removeEventListener("complete", finishIntro);
        player.current.removeEventListener("loadError", finishIntro);
        player.current.removeEventListener("renderError", finishIntro);
      }

      player.current = instance;

      if (instance) {
        instance.addEventListener("complete", finishIntro);
        instance.addEventListener("loadError", finishIntro);
        instance.addEventListener("renderError", finishIntro);
      }
    },
    [finishIntro]
  );

  useEffect(() => {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const updateMotionPreference = () =>
      setReducedMotion(motionPreference.matches);

    updateMotionPreference();
    motionPreference.addEventListener("change", updateMotionPreference);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      motionPreference.removeEventListener("change", updateMotionPreference);
      document.body.style.overflow = previousOverflow;
      if (exitTimer.current !== null) {
        window.clearTimeout(exitTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const watchdog = window.setTimeout(
      finishIntro,
      reducedMotion ? 1600 : 9000
    );

    return () => window.clearTimeout(watchdog);
  }, [finishIntro, reducedMotion]);

  return (
    <div
      className={`startup-intro${leaving ? " startup-intro--leaving" : ""}${
        reducedMotion ? " startup-intro--reduced" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="startup-intro-title"
      aria-describedby="startup-intro-description"
    >
      <div className="startup-intro__architecture" aria-hidden="true">
        <svg
          viewBox="0 0 1440 820"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
        >
          <defs>
            <linearGradient id="intro-stone" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fffdf7" stopOpacity=".88" />
              <stop offset="1" stopColor="#f3e8d7" stopOpacity=".45" />
            </linearGradient>
            <linearGradient id="intro-ground" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fffdf7" stopOpacity=".18" />
              <stop offset="1" stopColor="#e9d8c2" stopOpacity=".58" />
            </linearGradient>
          </defs>
          <path
            d="M0 686 720 590l720 96v134H0Z"
            fill="url(#intro-ground)"
          />
          <path
            d="m250 292 470-166 470 166H250Z"
            fill="url(#intro-stone)"
          />
          <path
            d="m285 298 435-140 435 140H285Z"
            fill="#c7dbe0"
            fillOpacity=".52"
          />
          <path
            d="M228 301h984v28H228zm32 39h920v18H260zm-18 309h956v28H242zm-42 38h1040v20H200z"
            fill="url(#intro-stone)"
          />
          <g
            fill="url(#intro-stone)"
            stroke="#fffdf7"
            strokeOpacity=".38"
            strokeWidth="3"
          >
            <path d="M290 365h115l-14 22v244l14 18H290l14-18V387zm191 0h115l-14 22v244l14 18H481l14-18V387zm191 0h115l-14 22v244l14 18H672l14-18V387zm191 0h115l-14 22v244l14 18H863l14-18V387zm191 0h115l-14 22v244l14 18h-115l14-18V387z" />
          </g>
          <path
            d="M164 724h1112M229 302h982M260 350h920M242 648h956"
            fill="none"
            stroke="#fffdf7"
            strokeOpacity=".68"
            strokeWidth="5"
          />
          <path
            d="M121 775h1198"
            fill="none"
            stroke="#fffdf7"
            strokeOpacity=".34"
            strokeWidth="2"
          />
        </svg>
      </div>

      <header className="startup-intro__masthead" aria-hidden="true">
        <span>CHRONOS</span>
        <span className="startup-intro__masthead-center">
          ACADEMIC SCHEDULING
        </span>
        <span className="startup-intro__status-dot" />
      </header>

      <div className="startup-intro__content">
        <div className="startup-intro__logo" aria-hidden="true">
          <div className="startup-intro__static-mark">
            <CalendarDays size={58} strokeWidth={1.35} />
          </div>
          {!reducedMotion && (
            <AnimationErrorBoundary onError={finishIntro}>
              <DotLottieReact
                src="/chronos-book-loader.lottie"
                autoplay
                loop={false}
                speed={0.9}
                dotLottieRefCallback={handlePlayerRef}
                aria-hidden="true"
              />
            </AnimationErrorBoundary>
          )}
        </div>
        <h1 id="startup-intro-title" className="startup-intro__title">
          Chronos
        </h1>
        <p
          id="startup-intro-description"
          className="startup-intro__description"
        >
          Your classes, organized in rhythm.
        </p>
      </div>

      <button
        type="button"
        className="startup-intro__skip"
        onClick={finishIntro}
        autoFocus
      >
        Skip intro <ArrowRight size={15} />
      </button>
    </div>
  );
}
