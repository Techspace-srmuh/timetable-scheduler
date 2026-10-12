"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, RotateCcw } from "lucide-react";

const REVEAL_AT = 5.0;
const VIDEO_URL = "https://thinkingods.com/demos/mako-hero/hero.mp4";

export default function WelcomePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [depth, setDepth] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const reveal = useCallback(() => setRevealed(true), []);
  const restart = useCallback(() => {
    setRevealed(false);
    setDepth(0);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(reveal);
  }, [reveal]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    const watchdog = window.setTimeout(reveal, 9000);
    if (query.matches) {
      const video = videoRef.current;
      if (video) {
        video.currentTime = Math.max(0, (video.duration || REVEAL_AT) - 0.1);
        video.pause();
      }
      reveal();
    } else if (videoRef.current?.readyState >= 2) {
      void videoRef.current.play().catch(reveal);
    }
    return () => {
      query.removeEventListener("change", sync);
      window.clearTimeout(watchdog);
    };
  }, [reveal]);

  const updateVideo = (video: HTMLVideoElement) => {
    setDepth(Math.min(200, Math.round((video.currentTime / REVEAL_AT) * 200)));
    if (video.currentTime >= REVEAL_AT) reveal();
  };

  return (
    <main className={`chronos-welcome${revealed ? " is-revealed" : ""}${reducedMotion ? " is-reduced" : ""}`}>
      <section className={`welcome-hero${revealed ? " is-revealed" : ""}${reducedMotion ? " is-reduced" : ""}`} aria-label="Welcome to Chronos">
        <video ref={videoRef} className="welcome-video" src={VIDEO_URL} muted playsInline preload="auto" onLoadedData={(event) => { try { const video = event.currentTarget; const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1; const context = canvas.getContext("2d"); if (context) { context.drawImage(video, video.videoWidth * 0.03, video.videoHeight * 0.08, video.videoWidth * 0.04, video.videoHeight * 0.04, 0, 0, 1, 1); const [r, g, b] = context.getImageData(0, 0, 1, 1).data; document.documentElement.style.setProperty("--ocean-bg", `rgb(${r}, ${g}, ${b})`); document.documentElement.style.setProperty("--ocean-ghost", `rgb(${Math.min(255,r+9)}, ${Math.min(255,g+13)}, ${Math.min(255,b+18)})`); } } catch { /* Cross-origin video keeps the CSS fallback palette. */ } if (!reducedMotion) void event.currentTarget.play().catch(reveal); }} onTimeUpdate={(event) => updateVideo(event.currentTarget)} onEnded={reveal} onError={reveal} />
        <div className="hero-veil" aria-hidden="true" />
        <div className="hero-word" aria-hidden="true">CHRONOS</div>
        <header className="welcome-nav rv" style={{ "--d": 0 } as React.CSSProperties}>
          <a className="brand" href="#top" aria-label="Chronos home"><span className="brand-fin">◢<i /></span><span>CHRONOS</span></a>
          <nav aria-label="Main navigation"><a href="#log">OVERVIEW</a><a href="#log">PLANNER</a><a href="#log">FEATURES</a><a href="#log">ABOUT</a></nav>
          <a className="nav-login" href="/login">SIGN IN</a>
          <button className="nav-pill" onClick={() => router.push("/dashboard")}>OPEN PLANNER <ArrowUpRight size={13} /></button>
        </header>
        <aside className="depth-gauge" aria-label={`Planning depth ${String(depth).padStart(3,"0")} meters`}><span className="depth-label">DEPTH</span><div className="depth-track"><i style={{ top: `${Math.min(100, depth / 2)}%` }} /></div><span className="depth-number">{String(depth).padStart(3,"0")}m</span></aside>
        <div className="welcome-copy">
          <p className="welcome-eyebrow rv" style={{ "--d": 2 } as React.CSSProperties}>ACADEMIC PLANNING · YOUR WEEK, IN RHYTHM</p>
          <h1 className="rv" style={{ "--d": 3 } as React.CSSProperties}>Make room<br />for <em>what matters.</em></h1>
          <p className="welcome-lede rv" style={{ "--d": 4 } as React.CSSProperties}>A calmer way to bring courses, faculty, rooms and your week into focus. Set your preferences, then build a timetable that works.</p>
          <div className="welcome-actions rv" style={{ "--d": 5 } as React.CSSProperties}><button className="primary-cta" onClick={() => router.push("/dashboard")}>GO TO DASHBOARD <span><ArrowRight size={16} /></span></button><a className="text-link" href="#log">Explore Chronos ↗</a></div>
        </div>
        <div className="welcome-dock" aria-label="Chronos overview">
          {[['thumb-eye.jpg','COURSES','Plan your week'],['thumb-jaw.jpg','PREFERENCES','Make it yours'],['thumb-tail.jpg','TIMETABLE','See it clearly']].map(([image,label,value], index) => <div className="dock-cell rv" style={{ "--d": index + 6 } as React.CSSProperties} key={label}><img src={`https://thinkingods.com/demos/mako-hero/${image}`} alt=""/><div><small>{label}</small><strong>{value}</strong></div></div>)}
          <div className="dock-cell dock-meta rv" style={{ "--d": 9 } as React.CSSProperties}><div><small>CHRONOS · YOUR PLANNING SPACE</small><strong>Focus, in rhythm.</strong></div><button className="replay-pill" onClick={restart}><RotateCcw size={12} /> replay</button></div>
        </div>
      </section>

      <section className="dive-log" id="log">
        <div className="log-heading"><p className="log-kicker"><b>02</b> DIVE LOG — WHY CHRONOS</p><div><h2>Built around your week,<br /><em>ready when you are.</em></h2><p className="log-intro">Chronos brings the moving parts of academic planning into one clear view, so you can spend less time coordinating and more time learning.</p></div></div>
        <div className="log-grid">
          <article className="log-card log-feature"><small>LOG 01 · STRUCTURE</small><h3>Every course<br />in its place.</h3><p>Add course hours, faculty and rooms, then see the pieces come together in one weekly plan.</p><div className="flow-panel"><div className="flow-lines"/><span>YOUR WEEK →</span></div><label>→ A CLEARER VIEW OF THE WHOLE</label></article>
          <article className="log-card"><small>LOG 02 · PREFERENCES</small><h3>A plan that fits.</h3><p>Set availability and preferred class windows before you generate a schedule.</p><label>→ PLAN AROUND YOUR NEEDS</label></article>
          <article className="log-card"><small>LOG 03 · FLEXIBILITY</small><h3>Change with confidence.</h3><p>Review schedule options and adjust course details as your semester takes shape.</p><div className="tooth-row">▴ ▴ ▴ ▴ ▴ ▴ ▴</div><label>→ KEEP THE DETAILS IN SYNC</label></article>
          <article className="log-card log-wide"><div><small>LOG 04 · CLARITY</small><h3>Your week, at a glance.</h3><p>Move from setup to a readable timetable with the people and places around each class in view.</p><label>→ MAKE SPACE FOR THE WORK</label></div><div className="rings"><i/><i/><i/><b/></div></article>
        </div>
        <div className="stats-band"><div><small>COURSES</small><strong>All <i>together</i></strong><span className="ruler"><i/></span></div><div><small>PLANNING</small><strong>Made <i>personal</i></strong><span className="temp-bar"><i/></span></div><div><small>WORKFLOW</small><strong>One clear <i>view</i></strong><span className="tooth-row">▴ ▴ ▴ ▴ ▴ ▴</span></div><div><small>YOUR WEEK</small><strong className="coral">In rhythm</strong><span className="curve">⌁</span></div></div>
        <div className="closing-line"><p>Set your courses. Shape your week.<br /><em>Find your rhythm.</em></p><button className="primary-cta" onClick={() => router.push("/dashboard")}>GO TO DASHBOARD <span><ArrowRight size={16} /></span></button></div>
      </section>
    </main>
  );
}
