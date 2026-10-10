"use client";
import Link from "next/link";
import { useState } from "react";
import BrandMark from "@/components/BrandMark";
import HeroCarousel from "./HeroCarousel";
import Icon, { type IconName } from "@/components/ui/Icon";
import { socialUrl, useBrand } from "@/lib/brand";
import { useDoctors } from "@/lib/doctors";
import { bannerHref, heroSlides, webServices, useMedia } from "@/lib/media";
import MapEmbed from "./MapEmbed";
import s from "@/app/(public)/landing.module.css";

const SERVICE_ICONS: IconName[] = ["smile", "sparkles", "sun", "shield-check", "stethoscope"];
const NAV = [
  ["Servicios", "#servicios"],
  ["Equipo", "#equipo"],
  ["Casos", "#casos"],
  ["Ubicación", "#ubicacion"],
  ["Preguntas", "#faq"],
] as const;
const FAQ = [
  ["¿Atienden emergencias?", "Sí. Escríbenos por WhatsApp y te damos el primer horario disponible el mismo día."],
  ["¿Qué medios de pago aceptan?", "Efectivo, tarjetas, Yape y Plin. Emitimos boleta o factura."],
  ["¿Cómo reprogramo mi cita?", 'Desde el enlace "Mi cita" que recibes por WhatsApp, sin necesidad de llamar.'],
  ["¿Cuánto dura la primera consulta?", "Entre 30 y 45 minutos, según el servicio elegido."],
] as const;
const STEPS = ["Elige el servicio", "Elige doctor (opcional)", "Elige día y hora libres", "Ingresa tus datos", "Recibe tu confirmación"];

const bg = (url?: string) => (url ? { backgroundImage: `url("${url}")` } : undefined);

export default function Landing() {
  const brand = useBrand();
  const media = useMedia();
  const doctors = useDoctors();
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState(0);


  return (
    <div className={s.root}>
      <header className={s.header}>
        <BrandMark />
        <nav className={s.nav} aria-label="Secciones">
          {NAV.map(([t, h]) => (
            <a key={h} href={h}>{t}</a>
          ))}
        </nav>
        <button type="button" className={s.menuBtn} aria-label="Menú" aria-expanded={menu} onClick={() => setMenu(!menu)}>
          <Icon name={menu ? "x" : "menu"} />
        </button>
        <div className={s.actions}>
          <Link href="/clientes" className={s.actionBtn}><Icon name="user" size={16} />Clientes</Link>
          <Link href="/intranet" className={s.actionBtn} data-quiet="true"><Icon name="lock" size={16} /><span className={s.full}>Acceso del personal</span><span className={s.short}>Personal</span></Link>
          <Link href="/reserva" className={s.cta}>Reservar cita</Link>
        </div>
      </header>
      <nav className={`${s.mobileMenu} ${menu ? s.open : ""}`} aria-label="Menú móvil">
        {NAV.map(([t, h]) => (
          <a key={h} href={h} onClick={() => setMenu(false)}>{t}</a>
        ))}
        <Link href="/clientes" onClick={() => setMenu(false)}>Clientes · mis citas y comprobantes</Link>
        <Link href="/intranet" onClick={() => setMenu(false)}>Acceso del personal</Link>
      </nav>

      <section className={s.hero}>
        <div className={s.heroCopy}>
          <div className={s.kicker}>{brand.kicker}</div>
          <h1 className={s.h1}>{brand.slogan}</h1>
          <p className={s.sub}>{brand.heroSub}</p>
          <div className={s.heroBtns}>
            <Link href="/reserva" className={s.btnPrimary}>Reservar cita</Link>
            <a href={brand.waLink} className={s.btnGhost} target="_blank" rel="noopener noreferrer">
              <Icon name="message-circle" />WhatsApp
            </a>
          </div>
          <Link href="/clientes" className={s.heroLink}>¿Ya eres cliente? Revisa tu historial aquí</Link>
          <div className={s.rating}>
            <Icon name="star" style={{ color: "var(--accent-500)" }} />
            <b style={{ color: "var(--ink-900)" }}>{media.stats[2]?.n}</b> · {media.stats[1]?.n} pacientes · {brand.hours}
          </div>
        </div>
        <HeroCarousel slides={heroSlides(media)} label={brand.name} />
      </section>

      {webServices(media).length > 0 && (
        <section id="servicios" className={s.section}>
          <h2 className={s.h2}>{brand.servicesTitle}</h2>
          <div className={s.cards4}>
            {webServices(media).map((sv, i) => (
              <div key={sv.id} className={s.card}>
                <span className={s.svcIcon}><Icon name={SERVICE_ICONS[i % 5]} size={24} /></span>
                <b style={{ fontSize: 18 }}>{sv.name}</b>
                <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink-500)" }}>{sv.desc}</span>
                {sv.price && <span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: "var(--brand-text)" }}>Desde S/ {sv.price}{(sv.sessions ?? 1) > 1 ? ` · ${sv.sessions} sesiones` : ""}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {media.banner.on !== false && media.banner.img && (() => {
        const b = media.banner, href = bannerHref(b.link);
        const pic = (
          <picture>
            {b.imgMobile && <source media="(max-width: 760px)" srcSet={b.imgMobile} />}
            <img className={s.bannerImg} src={b.img} alt={b.alt ?? ""} loading="lazy" />
          </picture>
        );
        return (
          <section className={s.banner} aria-label={b.alt || "Banner"}>
            {href ? <a href={href} {...(/^https?:/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})} aria-label={b.alt || "Ver más"}>{pic}</a> : pic}
          </section>
        );
      })()}

      {media.banner.showStats && media.stats.length > 0 && (
        <div className={s.stats}>
          {media.stats.map((st) => (
            <div key={st.id}>
              <div className={`${s.statN} tnum`}>{st.n}</div>
              <div className={s.statL}>{st.l}</div>
            </div>
          ))}
        </div>
      )}

      {doctors.length > 0 && (
        <section id="equipo" className={s.section}>
          <h2 className={s.h2}>{brand.teamTitle}</h2>
          <div className={s.team}>
            {doctors.map((d) => (
              <div key={d.id} className={s.docCard}>
                <div className={s.docPhoto} style={bg(d.photo)} role={d.photo ? "img" : undefined} aria-label={d.photo ? d.name : undefined} />
                <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ fontSize: 18 }}>{d.name}</b>
                  <span style={{ color: "var(--ink-500)", fontSize: 14 }}>{d.spec}</span>
                  {d.cop && <span className="tnum" style={{ fontSize: 13, color: "var(--ink-500)" }}>COP {d.cop}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {media.facs.length > 0 && (
        <section className={s.sectionTight}>
          <h2 className={s.h2}>Nuestras instalaciones</h2>
          <div className={s.facs}>
            {media.facs.map((f) => (
              <div key={f.id} className={s.fac} style={bg(f.photo)}>
                <span className={s.facCap}>{f.cap}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="casos" className={s.casos}>
        {media.cases.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2 className={s.h2}>Casos antes / después</h2>
            <div className={s.casesGrid}>
              {media.cases.map((c) => (
                <div key={c.id} className={s.caseCard}>
                  <div className={s.caseImgs}>
                    <div className={s.caseImg} style={{ background: "var(--muted)", ...bg(c.before) }}>
                      <span className={s.caseTag} style={{ color: "var(--ink-500)" }}>ANTES</span>
                    </div>
                    <div className={s.caseImg} style={{ background: "var(--brand-50)", ...bg(c.after) }}>
                      <span className={s.caseTag} style={{ color: "var(--brand-text)" }}>DESPUÉS</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {media.quotes.length > 0 && <h2 className={s.h2}>Lo que dicen</h2>}
          {media.quotes.map((q) => (
            <figure key={q.id} className={s.quote} style={{ margin: 0 }}>
              <div style={{ color: "var(--accent-500)", letterSpacing: 2 }} aria-label="5 estrellas">★★★★★</div>
              <blockquote style={{ margin: 0, fontSize: 16, lineHeight: 1.5, fontWeight: 500 }}>“{q.t}”</blockquote>
              <figcaption style={{ fontSize: 14, color: "var(--ink-500)" }}>{q.a}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={s.steps}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className={s.h2}>Reserva tu cita en 5 pasos</h2>
          <div style={{ color: "var(--ink-500)", fontSize: 16 }}>Solo mostramos horarios libres, en hora de Lima. Sin llamadas ni registro.</div>
        </div>
        <div className={s.stepsCard}>
          {STEPS.map((t, i) => (
            <div key={t} className={s.step}>
              <span className={s.stepN}>{i + 1}</span>{t}
            </div>
          ))}
          <Link href="/reserva" className={s.stepsBtn}>Reservar ahora</Link>
        </div>
      </section>

      <section id="ubicacion" className={s.loc}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 className={s.h2s}>Ubicación y contacto</h2>
          <MapEmbed address={brand.address} />
          <div className={s.locInfo}>
            <span><Icon name="map-pin" size={16} /> {brand.address}</span>
            <span className="tnum"><Icon name="clock" size={16} /> {brand.hours}</span>
            <a href={brand.telLink} className="tnum"><Icon name="phone" size={16} /> {brand.phone}</a>
            <a href={brand.waLink} className="tnum"><Icon name="message-circle" size={16} /> {brand.whatsapp}</a>
          </div>
        </div>
        <div id="faq" className={s.faq}>
          <h2 className={s.h2s} style={{ marginBottom: 6 }}>Preguntas frecuentes</h2>
          {FAQ.map(([q, a], i) => (
            <div key={q} className={s.faqItem}>
              <button type="button" className={s.faqQ} aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)}>
                {q}
                <Icon name={faq === i ? "minus" : "plus"} />
              </button>
              {faq === i && <div className={s.faqA}>{a}</div>}
            </div>
          ))}
        </div>
      </section>

      <footer className={s.footer}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <BrandMark onDark />
          <span>{brand.address}</span>
        </div>
        <div className={s.footerR}>
          <span style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {(["instagram", "facebook"] as const).map((k) => {
              const name = k === "instagram" ? "Instagram" : "Facebook";
              const url = socialUrl(k, brand[k]);
              return url ? <a key={k} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${name} de ${brand.name} (se abre en una pestaña nueva)`} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>{name} {brand[k]}</a> : <span key={k}>{name} {brand[k]}</span>;
            })}
          </span>
          <span style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <Link href="/clientes">Clientes</Link>
            <Link href="/intranet">Acceso del personal</Link>
            <Link href="/privacidad">Aviso de privacidad (Ley 29733)</Link>
          </span>
        </div>
      </footer>

      <a href={brand.waLink} className={s.wa} aria-label="Escribir por WhatsApp" target="_blank" rel="noopener noreferrer">
        <Icon name="message-circle" size={28} />
      </a>
    </div>
  );
}
