"use client";

import { useEffect, useId, useState } from "react";
import s from "./walkthrough.module.css";

const steps = [
  { name: "Connect", title: "Your server. One secure connection.", detail: "Save your SSH profile and connect with your own key." },
  { name: "Choose", title: "Pick what your server needs.", detail: "Choose Docker from the Shelf of ready-to-run recipes." },
  { name: "Review", title: "See every command first.", detail: "Review the recipe’s commands before you press Install." },
  { name: "Install", title: "Watch it run. Know it worked.", detail: "Follow checks, installation and verification in the live terminal." },
];

export default function AppWalkthrough() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(preference.matches);
    setPlaying(!preference.matches);
    const update = () => {
      setReducedMotion(preference.matches);
      setPlaying(!preference.matches);
    };
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % steps.length), 4500);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <figure className={s.demo} id="app-demo" aria-label="How sshwiz works" data-playing={playing}>
      <div className={s.topbar}>
        <span className={s.windowDots} aria-hidden="true"><i /><i /><i /></span>
        <span>sshwiz <span className={s.previewLabel}>/ product walkthrough</span></span>
        <button type="button" className={s.play} onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}>
          {playing ? "Ⅱ Pause" : "▶ Play"}
        </button>
      </div>
      <div className={s.visual}>
        <svg viewBox="0 0 720 360" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
          <title id={titleId}>{steps[step].title}</title>
          <desc id={descriptionId}>{steps[step].detail} Illustrative app preview; commands and output are abbreviated.</desc>
          <rect width="720" height="360" fill="#0b1233" />
          <path d="M0 40H720 M0 320H720 M40 0V360 M680 0V360" stroke="#93a4ff" strokeOpacity=".08" />
          <g key={step} className={s.scene}>
            <text x="48" y="53" className={s.overline}>{["SSH PROFILE", "YOUR SHELF", "INSTALL REVIEW", "LIVE TERMINAL"][step]}</text>
            <text x="672" y="53" textAnchor="end" className={s.small}>{step === 0 ? "01 / 04" : "● staging connected"}</text>
            {step === 0 && <>
              <rect x="48" y="78" width="624" height="216" rx="14" className={s.panel} />
              <text x="72" y="114" className={s.heading}>Staging box</text>
              <text x="72" y="153" className={s.small}>HOST</text>
              <text x="330" y="153" className={s.small}>AUTHENTICATION</text>
              <text x="72" y="182" className={s.mono}>ubuntu@203.0.113.10</text>
              <text x="330" y="182" className={s.mono}>~/.ssh/id_ed25519</text>
              <rect x="72" y="212" width="148" height="48" rx="9" fill="#6a7bea" />
              <text x="146" y="243" textAnchor="middle" className={s.buttonText}>Connect →</text>
              <g className={s.reveal} style={{ animationDelay: "1.3s" }}><text x="246" y="243" className={s.success}>✓ SSH connection established</text></g>
            </>}
            {step === 1 && <>
              {["Docker", "Node.js", "Nginx", "Certbot"].map((name, index) => {
                const x = 48 + (index % 2) * 320;
                const y = 78 + Math.floor(index / 2) * 112;
                return <g key={name}>
                  <rect x={x} y={y} width="304" height="96" rx="12" className={index === 0 ? s.selected : s.panel} />
                  <text x={x + 20} y={y + 38} className={s.heading}>{name}</text>
                  <text x={x + 20} y={y + 68} className={s.small}>{["Container runtime + Compose", "A pinned runtime version", "Web server + reverse proxy", "Automatic TLS certificates"][index]}</text>
                  {index === 0 && <text x={x + 270} y={y + 38} className={s.success}>✓</text>}
                </g>;
              })}
              <text x="48" y="326" className={s.success}>1 recipe selected</text>
              <text x="672" y="326" textAnchor="end" className={s.small}>Next: review commands →</text>
            </>}
            {step === 2 && <>
              <rect x="48" y="78" width="624" height="172" rx="12" className={s.panel} />
              <text x="72" y="113" className={s.heading}>Docker <tspan className={s.small}>/ command preview</tspan></text>
              <text x="72" y="153" className={s.mono}>$ command -v docker</text>
              <text x="72" y="185" className={s.mono}>$ sudo apt-get install -y docker-ce …</text>
              <text x="72" y="217" className={s.mono}>$ docker --version</text>
              <rect x="48" y="270" width="160" height="48" rx="9" fill="#18a06d" />
              <text x="128" y="301" textAnchor="middle" className={s.buttonText}>Install →</text>
              <text x="232" y="301" className={s.small}>Target: Staging box · Ubuntu</text>
            </>}
            {step === 3 && <>
              <rect x="48" y="78" width="624" height="236" rx="12" fill="#060a1e" stroke="#273561" />
              {[
                ["ubuntu@staging:~$", "#94a1d8"],
                ["✓ check    Docker not present", "#e9ecff"],
                ["✓ install  Commands completed", "#e9ecff"],
                ["✓ verify   Docker daemon responding", "#52d6a4"],
              ].map(([line, color], index) => <g key={line} className={s.reveal} style={{ animationDelay: `${index * .65}s` }}>
                <text x="72" y={115 + index * 35} className={s.mono} style={{ fill: color }}>{line}</text>
              </g>)}
              <g className={s.reveal} style={{ animationDelay: "2.6s" }}>
                <rect x="72" y="250" width="576" height="42" rx="8" fill="#123c37" />
                <text x="92" y="278" className={s.success}>✓ Docker is ready to use.</text>
              </g>
            </>}
          </g>
        </svg>
      </div>
      <figcaption className={s.caption}>
        <div className={s.steps} role="group" aria-label="Walkthrough steps">
          {steps.map((item, index) => <button key={item.name} type="button" aria-pressed={step === index} onClick={() => { setStep(index); setPlaying(false); }}>
            <span>0{index + 1}</span> {item.name}
          </button>)}
        </div>
        <h2>{steps[step].title}</h2>
        <p>{steps[step].detail}</p>
        <span className={s.footnote}>
          {reducedMotion && !playing
            ? "Reduced motion is on. Press Play to start, or select a step."
            : "Illustrative walkthrough · timing condensed"}
        </span>
      </figcaption>
    </figure>
  );
}
