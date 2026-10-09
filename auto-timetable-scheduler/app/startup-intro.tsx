"use client";

import { ArrowRight, CalendarDays } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function StartupIntro({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const completed = useRef(false);
  const exitTimer = useRef<number | null>(null);

  const finishIntro = useCallback(() => {
    if (completed.current) return;

    completed.current = true;
    setLeaving(true);
    exitTimer.current = window.setTimeout(onComplete, 550);
  }, [onComplete]);

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
          {reducedMotion ? (
            <div className="startup-intro__static-mark">
              <CalendarDays size={58} strokeWidth={1.35} />
            </div>
          ) : (
            <div className="intro-card-deck">
              <div className="intro-card intro-card--final">
                <span className="intro-card__heading">READY TO PLAN</span>
                <span className="intro-card__rule" />
                <CalendarDays className="intro-card__icon" size={25} />
              </div>
              <div className="intro-card intro-card--one">
                <span className="intro-card__heading">YOUR WEEK</span>
                <span className="intro-card__rule" />
                <span className="intro-card__lines">
                  <i />
                  <i />
                  <i />
                </span>
                <CalendarDays className="intro-card__icon" size={25} />
              </div>
              <div className="intro-card intro-card--two">
                <span className="intro-card__heading">IN RHYTHM</span>
                <span className="intro-card__rule" />
                <span className="intro-card__grid">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <CalendarDays className="intro-card__icon" size={25} />
              </div>
              <div
                className="intro-card intro-card--three"
                onAnimationEnd={finishIntro}
              >
                <span className="intro-card__heading">CHRONOS</span>
                <span className="intro-card__rule" />
                <span className="intro-card__lines">
                  <i />
                  <i />
                  <i />
                </span>
                <CalendarDays className="intro-card__icon" size={25} />
              </div>
            </div>
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
