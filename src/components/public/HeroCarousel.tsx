"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Icon from "@/components/ui/Icon";
import { type HeroSlide, heroSlideSecs } from "@/lib/media";
import s from "./hero.module.css";

const QUERY = "(prefers-reduced-motion: reduce)";
const subscribeCalm = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** Hero con fotos, videos en bucle (mudos) y animaciones incluidas, en carrusel. Se pausa al pasar el mouse, en pestañas ocultas y con «reducir movimiento». */
export default function HeroCarousel({ slides, label }: { slides: HeroSlide[]; label: string }) {
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const [hidden, setHidden] = useState(false);
  const calm = useSyncExternalStore(subscribeCalm, () => window.matchMedia(QUERY).matches, () => false);
  const many = slides.length > 1;
  const idx = slides.length ? i % slides.length : 0;
  const cur = slides[idx];
  // «Reducir movimiento» detiene el carrusel por defecto, pero el botón de reproducir del visitante lo reactiva
  const [forced, setForced] = useState<boolean | null>(null);
  const playing = forced ?? !calm;
  const running = many && playing && !hover && !hidden;

  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setI((n) => n + 1), heroSlideSecs(cur) * 1000);
    return () => clearTimeout(t);
  }, [running, idx, cur]);

  if (!slides.length) return <div className={s.box} />;
  return (
    <div className={s.box} role="group" aria-roledescription="carrusel" aria-label={label} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {slides.map((sl, k) => {
        const on = k === idx;
        if (sl.kind === "image") return <div key={sl.id} className={s.slide} data-on={on} role={on ? "img" : undefined} aria-label={on ? label : undefined} aria-hidden={!on} style={{ backgroundImage: `url("${sl.src}")` }} />;
        if (sl.kind === "anim") return <div key={sl.id} className={`${s.slide} ${s.anim} ${s[sl.anim ?? "ondas"]}`} data-on={on} aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>;
        return (
          <div key={sl.id} className={s.slide} data-on={on} aria-hidden={!on}>
            {on && <video className={s.video} src={sl.src} autoPlay={forced ?? !calm} muted loop playsInline preload="metadata" aria-label={label} />}
          </div>
        );
      })}
      {many && (
        <div className={s.ctrl}>
          <button type="button" className={s.pause} aria-label={playing ? "Pausar carrusel" : "Reanudar carrusel"} onClick={() => setForced(!playing)}><Icon name={playing ? "pause" : "play"} size={14} /></button>
          {slides.map((sl, k) => (
            <button key={sl.id} type="button" className={s.dotHit} aria-label={`Ir a la diapositiva ${k + 1}`} onClick={() => setI(k)}><span className={s.dot} aria-current={k === idx} /></button>
          ))}
        </div>
      )}
    </div>
  );
}
