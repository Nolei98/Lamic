"use client";

import { useEffect, useRef, useState } from "react";
import { resolveLayerForDevice, deviceScaleRatio, deviceYOffset, deviceCanvasSize, type Device, type ResponsiveMap } from "@/lib/breakpoints";

type Layer = {
  id: string;
  type: "TEXT" | "IMAGE" | "BUTTON";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: Record<string, any>;
  animationIn: string;
  delayMs: number;
  durationMs: number;
  responsive: ResponsiveMap;
};

type Slide = {
  id: string;
  duration: number;
  background: { type: "color" | "image"; value: string } | null;
  layers: Layer[];
};

type Project = { id: string; name: string; width: number; height: number; slides: Slide[] };

// Mesmos pontos de corte do Slider Revolution do site oficial
// (responsiveLevels: "1240,1024,1024,480").
function pickDevice(viewportWidth: number): Device {
  if (viewportWidth < 480) return "mobile";
  if (viewportWidth < 1240) return "tablet";
  return "desktop";
}

function SlideContent({
  slide,
  scale,
  device,
  deviceRatio,
  yOffset,
  animKey,
  contentWidth,
}: {
  slide: Slide;
  scale: number;
  device: Device;
  deviceRatio: number;
  yOffset: number;
  animKey: number;
  contentWidth: number;
}) {
  return (
    <>
      {/* Fundo: sempre no inset:0 do slide (que ocupa 100% do .vitrine-wrap no
          modo embutido) — é isso que faz ele preencher a tela toda mesmo em
          monitores mais largos que o desenho nativo do banner. */}
      {slide.background?.type === "color" && <div style={{ position: "absolute", inset: 0, background: slide.background.value }} />}
      {slide.background?.type === "image" && (
        <img src={slide.background.value} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      {/* Camadas: continuam dentro da faixa de largura fixa do design
          (contentWidth), centralizada — só o fundo estica, o conteúdo não. */}
      <div className="vitrine-conteudo" style={{ width: contentWidth, transform: "translateX(-50%)" }}>
      {slide.layers.map((l) => {
        const r = resolveLayerForDevice(l, l.responsive, device, deviceRatio, yOffset);
        if (r.hidden) return null;
        return (
          <div
            key={`${l.id}-${animKey}`}
            className={`vitrine-layer anim-${l.animationIn}`}
            style={
              {
                left: r.x * scale,
                top: r.y * scale,
                width: r.width * scale,
                height: r.height * scale,
                transform: `rotate(${r.rotation}deg)`,
                ["--dur" as any]: `${l.durationMs}ms`,
                ["--delay" as any]: `${l.delayMs}ms`,
              } as React.CSSProperties
            }
          >
            {l.type === "TEXT" ? (
              <div
                style={{
                  fontSize: (l.content.fontSize || 24) * scale * deviceRatio,
                  color: l.content.color || "#0E2E5A",
                  fontWeight: l.content.fontWeight || 700,
                  whiteSpace: "pre-wrap",
                }}
              >
                {l.content.text}
              </div>
            ) : l.type === "BUTTON" ? (
              <a
                href={l.content.href || "#"}
                target={l.content.newTab !== false ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="vitrine-botao"
                style={
                  {
                    display: "grid",
                    placeItems: "center",
                    width: "100%",
                    height: "100%",
                    borderRadius: (l.content.radius ?? 999) * scale * deviceRatio,
                    color: l.content.color || "#fff",
                    fontWeight: l.content.fontWeight || 700,
                    fontSize: (l.content.fontSize || 16) * scale * deviceRatio,
                    textDecoration: "none",
                    textAlign: "center",
                    padding: "0 8px",
                    ["--bg" as any]: `linear-gradient(${l.content.angle ?? 90}deg, ${l.content.gradientFrom || "#1257A5"}, ${l.content.gradientTo || "#2AA7BE"})`,
                    ["--bg-hover" as any]: `linear-gradient(${l.content.angle ?? 90}deg, ${l.content.hoverFrom || "#2AA7BE"}, ${l.content.hoverTo || "#2AA7BE"})`,
                  } as React.CSSProperties
                }
              >
                {l.content.text}
              </a>
            ) : l.content.src ? (
              <img
                src={l.content.src}
                alt={l.content.alt || ""}
                style={{ width: "100%", height: "100%", objectFit: l.content.fit === "cover" ? "cover" : "contain" }}
              />
            ) : null}
          </div>
        );
      })}
      </div>
    </>
  );
}

export function Player({ project, fill = false }: { project: Project; fill?: boolean }) {
  const [index, setIndex] = useState(0);
  const [key, setKey] = useState(0); // força remontagem das camadas do slide ativo, pra reanimar as entradas
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [device, setDevice] = useState<Device>("desktop");

  useEffect(() => {
    function fit() {
      const dev = pickDevice(window.innerWidth);
      const canvas = deviceCanvasSize(dev, project.width, project.height);
      if (fill) {
        // No modo embutido (iframe no site), a ALTURA do quadro é fixa —
        // igual ao site oficial, que trava em 600px (720px no celular) e só
        // deixa a largura esticar. Por isso a escala vem da altura da
        // própria janela do iframe (window.innerHeight — mais confiável
        // aqui do que clientHeight do body), não da largura: se a escala
        // viesse da largura, em telas mais estreitas o banner ficava mais
        // baixo do que os 600px reais.
        setScale(window.innerHeight / canvas.height);
      } else {
        const w = wrapRef.current?.parentElement?.clientWidth || canvas.width;
        setScale(Math.min(1, (w - 4) / canvas.width));
      }
      setDevice(dev);
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [project.width, project.height, fill]);

  const canvasSize = deviceCanvasSize(device, project.width, project.height);

  useEffect(() => {
    if (project.slides.length <= 1) return;
    const current = project.slides[index];
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % project.slides.length);
      setKey((k) => k + 1);
    }, current.duration);
    return () => clearTimeout(t);
  }, [index, project.slides]);

  function goTo(i: number) {
    setIndex(i);
    setKey((k) => k + 1);
  }
  function proximo() {
    goTo((index + 1) % project.slides.length);
  }
  function anterior() {
    goTo((index - 1 + project.slides.length) % project.slides.length);
  }

  const contentWidth = canvasSize.width * scale;

  return (
    <div
      ref={wrapRef}
      className="vitrine-wrap"
      // No modo embutido (fill), a largura vem 100% do iframe — é o fundo
      // que preenche a tela toda. Fora do embed (prévia isolada), o quadro
      // continua no tamanho fixo de sempre.
      style={{ width: fill ? "100%" : contentWidth, height: canvasSize.height * scale, borderRadius: fill ? 0 : 12 }}
    >
      {/* Todos os slides ficam empilhados no DOM; a troca é só a opacidade —
          é isso que faz o fade suave de um pro outro (ver .vitrine-slide no globals.css). */}
      {project.slides.map((s, i) => (
        <div key={s.id} className={`vitrine-slide ${i === index ? "on" : ""}`}>
          <SlideContent
            slide={s}
            scale={scale}
            device={device}
            deviceRatio={deviceScaleRatio(device, project.width)}
            yOffset={deviceYOffset(device, project.width, project.height)}
            animKey={i === index ? key : -1}
            contentWidth={contentWidth}
          />
        </div>
      ))}

      {project.slides.length > 1 && (
        <div className="vitrine-controles" style={{ left: "50%", transform: "translateX(-50%)", bottom: 24 * scale }}>
          <div className="vitrine-dots" role="tablist" aria-label="Escolher slide">
            {project.slides.map((s, i) => (
              <button
                key={s.id}
                className={i === index ? "on" : ""}
                onClick={() => goTo(i)}
                aria-label={`Ir para o slide ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
