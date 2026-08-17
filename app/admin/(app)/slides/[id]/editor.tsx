"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addSlideAction,
  deleteSlideAction,
  updateSlideBackgroundAction,
  updateSlideDurationAction,
  addLayerAction,
  deleteLayerAction,
  updateLayerAction,
  updateLayerResponsiveAction,
  reorderLayersAction,
  type LayerUpdateInput,
} from "@/app/actions/editor";
import { DEVICES, deviceCanvasSize, deviceScaleRatio, deviceYOffset, resolveLayerForDevice, type Device, type ResponsiveMap } from "@/lib/breakpoints";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Layer = {
  id: string;
  type: "TEXT" | "IMAGE" | "BUTTON";
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: Record<string, any>;
  animationIn: string;
  animationOut: string;
  delayMs: number;
  durationMs: number;
  responsive: ResponsiveMap;
};

type Slide = {
  id: string;
  order: number;
  duration: number;
  background: { type: "color" | "image"; value: string } | null;
  layers: Layer[];
};

type Project = {
  id: string;
  name: string;
  slug: string;
  width: number;
  height: number;
  published: boolean;
  slides: Slide[];
};

const ANIMACOES = [
  { value: "fade", label: "Aparecer (fade)" },
  { value: "slide-left", label: "Deslizar da direita" },
  { value: "slide-right", label: "Deslizar da esquerda" },
  { value: "slide-up", label: "Subir" },
  { value: "zoom", label: "Zoom" },
];

const CANVAS_MAX_W = 980;

function gradientCss(content: Record<string, any>) {
  const from = content.gradientFrom || "#1257A5";
  const to = content.gradientTo || "#2AA7BE";
  const angle = content.angle ?? 90;
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}

const TIPOS_LABEL: Record<Layer["type"], string> = { TEXT: "Texto", IMAGE: "Imagem", BUTTON: "Botão" };
const TIPOS_ICONE: Record<Layer["type"], string> = { TEXT: "T", IMAGE: "🖼", BUTTON: "▭" };

function niceStep(pxPerUnit: number) {
  // escolhe um espaçamento de régua legível (em px do próprio design)
  const options = [10, 20, 25, 50, 100, 200];
  for (const o of options) if (o * pxPerUnit >= 40) return o;
  return 200;
}

function CamadaItem({
  layer,
  ativo,
  onSelect,
  onDelete,
}: {
  layer: Layer;
  ativo: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layer.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={`camada-item ${ativo ? "ativo" : ""}`} onClick={onSelect}>
      {/* só a alcinha inicia o arraste — o resto da linha fica livre pra clique normal */}
      <span className="camada-arrasta" title="Arrastar pra reordenar" {...attributes} {...listeners}>
        ⠿
      </span>
      <span className="camada-icone">{TIPOS_ICONE[layer.type]}</span>
      <span className="camada-nome">
        {TIPOS_LABEL[layer.type]}
        {layer.type === "TEXT" || layer.type === "BUTTON" ? ` — ${String(layer.content.text || "").slice(0, 18)}` : ""}
      </span>
      <button
        className="camada-excluir"
        title="Excluir camada"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        ×
      </button>
    </div>
  );
}

export function Editor({ project }: { project: Project }) {
  const [slides, setSlides] = useState<Slide[]>(project.slides);
  const [slideId, setSlideId] = useState<string | undefined>(project.slides[0]?.id);
  const [layerId, setLayerId] = useState<string | undefined>(undefined);
  const [device, setDevice] = useState<Device>("desktop");
  const [playing, setPlaying] = useState(false);
  const [guias, setGuias] = useState(false);
  const [zoom100, setZoom100] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [avisoImagem, setAvisoImagem] = useState<string | null>(null);
  const [bgNatural, setBgNatural] = useState<{ w: number; h: number } | null>(null);
  const [salvandoManual, setSalvandoManual] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [salvando, startTransition] = useTransition();
  const dragState = useRef<{
    id: string;
    startX: number;
    startY: number;
    layerX: number;
    layerY: number;
    moved: boolean;
    finalX: number;
    finalY: number;
  } | null>(null);
  const resizeState = useRef<{
    id: string;
    handle: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
    finalX: number;
    finalY: number;
    finalWidth: number;
    finalHeight: number;
  } | null>(null);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const canvasSize = deviceCanvasSize(device, project.width, project.height);
  const deviceRatio = deviceScaleRatio(device, project.width);
  const yOffset = deviceYOffset(device, project.width, project.height);
  const scale = zoom100 ? 1 : Math.min(1, CANVAS_MAX_W / canvasSize.width);
  const slide = slides.find((s) => s.id === slideId);
  const layerBase = slide?.layers.find((l) => l.id === layerId);
  const layer = layerBase ? resolveLayerForDevice(layerBase, layerBase.responsive, device, deviceRatio, yOffset) : undefined;

  function patchLayerBase(id: string, patch: Partial<Layer>) {
    setSlides((prev) =>
      prev.map((s) => (s.id !== slideId ? s : { ...s, layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
    );
  }

  function patchLayerResponsive(id: string, dev: "tablet" | "mobile", patch: Record<string, unknown>) {
    setSlides((prev) =>
      prev.map((s) =>
        s.id !== slideId
          ? s
          : {
              ...s,
              layers: s.layers.map((l) =>
                l.id === id ? { ...l, responsive: { ...l.responsive, [dev]: { ...(l.responsive[dev] || {}), ...patch } } } : l
              ),
            }
      )
    );
  }

  // Nada aqui grava no servidor na hora — só marca que existe alteração
  // pendente. O conteúdo de verdade só vai pro banco quando aperta "Salvar"
  // (função salvarTudo, mais abaixo). Isso também tira o lag que rolava
  // antes: cada troca de cor/texto disparava uma gravação no servidor na
  // hora; agora fica tudo local até você decidir salvar.
  function saveLayer(_id: string, _data: LayerUpdateInput) {
    setDirty(true);
  }

  function saveResponsive(_id: string, _dev: "tablet" | "mobile", _patch: Record<string, unknown>) {
    setDirty(true);
  }

  function saveBackground() {
    setDirty(true);
  }

  function saveDuration() {
    setDirty(true);
  }

  useEffect(() => setAvisoImagem(null), [layerId, slideId]);

  // Mede a resolução real do fundo (mesmo quando já veio salvo do banco,
  // não só no upload) pra poder marcar a área que realmente fica visível.
  useEffect(() => {
    const src = slide?.background?.type === "image" ? slide.background.value : null;
    if (!src) {
      setBgNatural(null);
      return;
    }
    const img = new Image();
    img.onload = () => setBgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setBgNatural(null);
    img.src = src;
  }, [slide?.background]);

  // Avisa antes de sair da página se tiver alteração ainda não salva.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  async function salvarTudo() {
    setSalvandoManual(true);
    try {
      const chamadas: Promise<unknown>[] = [];
      for (const s of slides) {
        chamadas.push(updateSlideBackgroundAction(project.id, s.id, s.background || { type: "color", value: "#0E2E5A" }));
        chamadas.push(updateSlideDurationAction(project.id, s.id, s.duration));
        for (const l of s.layers) {
          chamadas.push(
            updateLayerAction(project.id, l.id, {
              x: l.x,
              y: l.y,
              width: l.width,
              height: l.height,
              rotation: l.rotation,
              animationIn: l.animationIn,
              animationOut: l.animationOut,
              delayMs: l.delayMs,
              durationMs: l.durationMs,
              content: l.content,
            })
          );
          for (const dev of ["tablet", "mobile"] as const) {
            if (l.responsive[dev]) chamadas.push(updateLayerResponsiveAction(project.id, l.id, dev, l.responsive[dev]!));
          }
        }
      }
      await Promise.all(chamadas);
      setDirty(false);
    } finally {
      setSalvandoManual(false);
    }
  }

  function onLayerMouseDown(e: React.MouseEvent, l: Layer) {
    e.stopPropagation();
    e.preventDefault(); // evita o navegador iniciar um "arrastar imagem"/seleção de texto nativo
    const resolved = resolveLayerForDevice(l, l.responsive, device, deviceRatio, yOffset);
    setLayerId(l.id);
    dragNodeRef.current = canvasRef.current?.querySelector(`[data-layer-id="${l.id}"]`) as HTMLDivElement | null;
    dragState.current = {
      id: l.id,
      startX: e.clientX,
      startY: e.clientY,
      layerX: resolved.x,
      layerY: resolved.y,
      moved: false,
      finalX: resolved.x,
      finalY: resolved.y,
    };
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragUp);
  }

  /** Se já existe uma camada selecionada e o clique cai dentro da área dela,
   * o arraste tem que mover ESSA camada — mesmo que outra camada esteja
   * visualmente por cima naquele ponto (empilhamento). Sem isso, clicar numa
   * área onde duas camadas se sobrepõem sempre arrastava a que está na frente. */
  function onCanvasMouseDownCapture(e: React.MouseEvent) {
    if (playing || !layerId || !canvasRef.current || !slideAtualExibida) return;
    // Se o clique começou numa alça de redimensionar, deixa ela cuidar disso —
    // senão essa interceptação "roubava" o clique da alça sempre que ela caía
    // dentro da área da própria camada selecionada, virando um arrasto em vez
    // de um redimensionamento (e às vezes de forma inconsistente, dependendo
    // do pixel exato onde a alça ficava em relação à borda).
    if ((e.target as HTMLElement).closest(".alca")) return;
    const selected = slideAtualExibida.layers.find((l) => l.id === layerId);
    if (!selected) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    const r = resolveLayerForDevice(selected, selected.responsive, device, deviceRatio, yOffset);
    const dentro = px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
    if (!dentro) return;
    e.stopPropagation(); // impede que a camada que está por cima receba o clique e "roube" o arraste
    onLayerMouseDown(e, selected);
  }

  // Durante o arraste, mexe direto no DOM (sem chamar setState a cada pixel)
  // — evita re-renderizar o editor inteiro (com a lista de camadas, o
  // dnd-kit etc.) em cada movimento do mouse, que é o que fazia o arraste
  // engasgar/parecer travado em telas mais lentas. O React só é atualizado
  // (e o valor salvo no servidor) quando o mouse é solto.
  function onDragMove(e: MouseEvent) {
    const d = dragState.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true;
    const nx = Math.round(d.layerX + dx);
    const ny = Math.round(d.layerY + dy);
    d.finalX = nx;
    d.finalY = ny;
    if (dragNodeRef.current) {
      dragNodeRef.current.style.left = `${nx * scale}px`;
      dragNodeRef.current.style.top = `${ny * scale}px`;
    }
  }

  function onDragUp() {
    const d = dragState.current;
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragUp);
    dragState.current = null;
    dragNodeRef.current = null;
    if (d && d.moved) {
      if (device === "desktop") {
        patchLayerBase(d.id, { x: d.finalX, y: d.finalY });
        saveLayer(d.id, { x: d.finalX, y: d.finalY });
      } else {
        patchLayerResponsive(d.id, device, { x: d.finalX, y: d.finalY });
        saveResponsive(d.id, device, { x: d.finalX, y: d.finalY });
      }
    }
  }

  function onHandleMouseDown(e: React.MouseEvent, handle: string, l: Layer) {
    e.stopPropagation();
    e.preventDefault();
    const r = resolveLayerForDevice(l, l.responsive, device, deviceRatio, yOffset);
    setLayerId(l.id);
    dragNodeRef.current = canvasRef.current?.querySelector(`[data-layer-id="${l.id}"]`) as HTMLDivElement | null;
    resizeState.current = {
      id: l.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      finalX: r.x,
      finalY: r.y,
      finalWidth: r.width,
      finalHeight: r.height,
    };
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeUp);
  }

  // Mesma ideia do arraste: mexe direto no DOM enquanto redimensiona, sem
  // disparar re-render do React a cada pixel — o React só é atualizado
  // (e o valor salvo no servidor) quando o mouse é solto.
  function onResizeMove(e: MouseEvent) {
    const r = resizeState.current;
    if (!r) return;
    const dx = (e.clientX - r.startX) / scale;
    const dy = (e.clientY - r.startY) / scale;
    const MIN = 16;
    let { x, y, width, height } = r;

    if (r.handle.includes("e")) width = Math.max(MIN, r.width + dx);
    if (r.handle.includes("s")) height = Math.max(MIN, r.height + dy);
    if (r.handle.includes("w")) {
      width = Math.max(MIN, r.width - dx);
      x = r.x + (r.width - width);
    }
    if (r.handle.includes("n")) {
      height = Math.max(MIN, r.height - dy);
      y = r.y + (r.height - height);
    }

    r.finalX = Math.round(x);
    r.finalY = Math.round(y);
    r.finalWidth = Math.round(width);
    r.finalHeight = Math.round(height);

    if (dragNodeRef.current) {
      dragNodeRef.current.style.left = `${r.finalX * scale}px`;
      dragNodeRef.current.style.top = `${r.finalY * scale}px`;
      dragNodeRef.current.style.width = `${r.finalWidth * scale}px`;
      dragNodeRef.current.style.height = `${r.finalHeight * scale}px`;
    }
  }

  function onResizeUp() {
    const r = resizeState.current;
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", onResizeUp);
    resizeState.current = null;
    dragNodeRef.current = null;
    if (r) {
      const patch = { x: r.finalX, y: r.finalY, width: r.finalWidth, height: r.finalHeight };
      if (device === "desktop") {
        patchLayerBase(r.id, patch);
        saveLayer(r.id, patch);
      } else {
        patchLayerResponsive(r.id, device, patch);
        saveResponsive(r.id, device, patch);
      }
    }
  }

  function onCanvasBackgroundClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) setLayerId(undefined);
  }

  async function handleAddSlide() {
    await addSlideAction(project.id);
    location.reload();
  }

  async function handleDeleteSlide(id: string) {
    if (!confirm("Excluir este slide?")) return;
    await deleteSlideAction(project.id, id);
    location.reload();
  }

  async function handleAddLayer(type: "TEXT" | "IMAGE" | "BUTTON") {
    if (!slideId) return;
    await addLayerAction(project.id, slideId, type);
    location.reload();
  }

  async function handleDeleteLayer(id: string) {
    await deleteLayerAction(project.id, id);
    location.reload();
  }

  function handleReorderDragEnd(e: DragEndEvent) {
    if (!slide || !e.over || e.active.id === e.over.id) return;
    const orderedDesc = [...slide.layers].sort((a, b) => b.order - a.order); // topo da lista = frente
    const oldIndex = orderedDesc.findIndex((l) => l.id === e.active.id);
    const newIndex = orderedDesc.findIndex((l) => l.id === e.over!.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(orderedDesc, oldIndex, newIndex);

    // atualiza o "order" localmente pra refletir na hora, e persiste no banco
    const total = reordered.length;
    const orderById = new Map(reordered.map((l, i) => [l.id, total - 1 - i]));
    setSlides((prev) =>
      prev.map((s) =>
        s.id !== slideId ? s : { ...s, layers: s.layers.map((l) => ({ ...l, order: orderById.get(l.id) ?? l.order })) }
      )
    );
    startTransition(() => reorderLayersAction(project.id, reordered.map((l) => l.id)));
  }

  // Carrega o arquivo e também mede a resolução real da imagem — é assim que
  // detectamos se ela é pequena demais pro tamanho que vai ocupar (ver
  // avisarQualidade). O segredo do site oficial pra imagem nunca perder
  // qualidade em nenhuma tela: a imagem-fonte é sempre BEM maior do que o
  // maior tamanho em que ela algum dia vai aparecer — só encolhe, nunca
  // amplia (encolher sempre fica nítido; ampliar sempre borra).
  function onImageFile(file: File, onDone: (dataUrl: string, naturalWidth: number, naturalHeight: number) => void) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () => onDone(dataUrl, img.naturalWidth, img.naturalHeight);
      img.onerror = () => onDone(dataUrl, 0, 0);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  /** A imagem precisa ter pelo menos ~1.6x o maior tamanho em que ela pode
   * aparecer (a mesma folga que o site oficial usa: fundo cheio da tela,
   * telas bem largas etc.) — abaixo disso ela corre risco de esticar e
   * borrar. Retorna null se a resolução está OK. */
  function avisarQualidade(naturalWidth: number, larguraAlvo: number): string | null {
    if (!naturalWidth) return null;
    const minimo = Math.round(larguraAlvo * 1.6);
    if (naturalWidth >= minimo) return null;
    return `Imagem com ${naturalWidth}px de largura — ideal pelo menos ${minimo}px pra não borrar em telas grandes.`;
  }

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      if (playTimer.current) clearTimeout(playTimer.current);
      return;
    }
    setPlaying(true);
    setPlayIndex(0);
  }

  useMemo(() => {
    if (!playing) return;
    const current = slides[playIndex];
    if (!current) return;
    if (playTimer.current) clearTimeout(playTimer.current);
    playTimer.current = setTimeout(() => {
      setPlayIndex((i) => (i + 1) % slides.length);
    }, current.duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, playIndex]);

  const slideAtualExibida = playing ? slides[playIndex] : slide;
  const stepX = niceStep(scale);
  const marksX = Array.from({ length: Math.floor(canvasSize.width / stepX) + 1 }, (_, i) => i * stepX);
  const marksY = Array.from({ length: Math.floor(canvasSize.height / stepX) + 1 }, (_, i) => i * stepX);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn ghost" onClick={togglePlay}>
          {playing ? "⏸ Parar prévia" : "▶ Prévia do carrossel"}
        </button>

        <button className={`btn pequeno ${guias ? "" : "ghost"}`} onClick={() => setGuias((v) => !v)} title="Mostra onde ficam o menu, a busca e o cartão Viva+ do site por cima do banner">
          🗺 Guias do site
        </button>

        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid var(--borda)", borderRadius: 999, padding: 3 }}>
          <button className={`btn pequeno ${zoom100 ? "" : "ghost"}`} style={{ borderRadius: 999 }} onClick={() => setZoom100(true)}>
            100% (tamanho real)
          </button>
          <button className={`btn pequeno ${!zoom100 ? "" : "ghost"}`} style={{ borderRadius: 999 }} onClick={() => setZoom100(false)}>
            Ajustar à tela
          </button>
        </div>

        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid var(--borda)", borderRadius: 999, padding: 3 }}>
          {DEVICES.map((d) => (
            <button
              key={d.id}
              className={`btn pequeno ${device === d.id ? "" : "ghost"}`}
              style={{ borderRadius: 999 }}
              onClick={() => {
                setDevice(d.id);
                setLayerId(undefined);
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12.5, color: "var(--txt-2)" }}>
          {canvasSize.width}×{canvasSize.height}px{device !== "desktop" ? " (visualização responsiva)" : ""}
        </span>

        <span className={`indicador-salvo ${dirty ? "salvando" : ""}`} style={{ marginLeft: "auto" }}>
          {dirty ? (
            <>
              <span className="ponto" /> Alterações não salvas
            </>
          ) : (
            <>✓ Tudo salvo</>
          )}
        </span>
        <button className="btn" onClick={salvarTudo} disabled={salvandoManual || !dirty}>
          {salvandoManual ? "Salvando…" : "💾 Salvar"}
        </button>
      </div>

      <div className="editor">
        <div className="editor-col">
          <b style={{ fontSize: 12.5, textTransform: "uppercase", color: "var(--txt-2)" }}>Slides</b>
          <div style={{ marginTop: 10 }}>
            {slides.map((s, i) => (
              <div
                key={s.id}
                className={`slide-item ${s.id === slideId ? "ativo" : ""}`}
                onClick={() => {
                  setSlideId(s.id);
                  setLayerId(undefined);
                }}
              >
                <span>Slide {i + 1}</span>
                <button
                  className="btn perigo pequeno"
                  style={{ padding: "2px 8px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSlide(s.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button className="btn pequeno" style={{ marginTop: 10, width: "100%" }} onClick={handleAddSlide}>
            + Slide
          </button>

          {slide && (
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--txt-2)" }}>Fundo</label>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button
                  className={`btn pequeno ${slide.background?.type !== "image" ? "" : "ghost"}`}
                  onClick={() => {
                    const bg = { type: "color" as const, value: slide.background?.type === "color" ? slide.background.value : "#0E2E5A" };
                    setSlides((prev) => prev.map((s) => (s.id === slide.id ? { ...s, background: bg } : s)));
                    saveBackground();
                  }}
                >
                  Cor
                </button>
                <label className={`btn pequeno ${slide.background?.type === "image" ? "" : "ghost"}`} style={{ cursor: "pointer" }}>
                  Imagem
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      onImageFile(file, (dataUrl, naturalWidth, naturalHeight) => {
                        const bg = { type: "image" as const, value: dataUrl };
                        setSlides((prev) => prev.map((s) => (s.id === slide.id ? { ...s, background: bg } : s)));
                        saveBackground();
                        setAvisoImagem(avisarQualidade(naturalWidth, project.width));
                        setBgNatural(naturalWidth ? { w: naturalWidth, h: naturalHeight } : null);
                      });
                    }}
                  />
                </label>
              </div>

              {avisoImagem && (
                <p style={{ fontSize: 11.5, color: "#B8791A", marginTop: 6, lineHeight: 1.4 }}>⚠ {avisoImagem}</p>
              )}

              {slide.background?.type === "image" ? (
                <div style={{ marginTop: 8 }}>
                  <div
                    className="fundo-quadriculado"
                    style={{
                      position: "relative",
                      width: "100%",
                      // a caixinha usa a MESMA proporção da foto original — assim a
                      // foto preenche ela inteira (sem tarja), e a marcação (que é
                      // calculada em cima do tamanho real da foto) bate certinho com
                      // onde ela está desenhada, em vez de ficar desalinhada.
                      aspectRatio: bgNatural ? `${bgNatural.w} / ${bgNatural.h}` : "16 / 9",
                      maxHeight: 160,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid var(--borda)",
                    }}
                  >
                    <img src={slide.background.value} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                    {bgNatural &&
                      (() => {
                        const canvasAR = canvasSize.width / canvasSize.height;
                        const imgAR = bgNatural.w / bgNatural.h;
                        // a foto inteira aparece acima; esse retângulo marca só a
                        // fatia que o fundo de verdade usa no banner (object-fit:cover
                        // — o resto é cortado, fundo sempre preenche o quadro todo).
                        const wPct = imgAR >= canvasAR ? (canvasAR / imgAR) * 100 : 100;
                        const hPct = imgAR >= canvasAR ? 100 : (imgAR / canvasAR) * 100;
                        return (
                          <div
                            className="guia-corte-fundo"
                            style={{
                              position: "absolute",
                              left: `${(100 - wPct) / 2}%`,
                              top: `${(100 - hPct) / 2}%`,
                              width: `${wPct}%`,
                              height: `${hPct}%`,
                            }}
                          />
                        );
                      })()}
                  </div>
                  <p style={{ fontSize: 11, color: "var(--txt-2)", marginTop: 5, lineHeight: 1.4 }}>
                    A imagem inteira aparece acima; a área <b style={{ color: "#C0392B" }}>marcada</b> é a que
                    realmente fica visível no banner — o resto é cortado (o fundo sempre preenche o quadro todo,
                    igual à largura cheia do banner no site).
                  </p>
                </div>
              ) : (
                <input
                  type="color"
                  value={slide.background?.type === "color" ? slide.background.value : "#0E2E5A"}
                  onChange={(e) => {
                    const bg = { type: "color" as const, value: e.target.value };
                    setSlides((prev) => prev.map((s) => (s.id === slide.id ? { ...s, background: bg } : s)));
                    saveBackground();
                  }}
                  style={{ width: "100%", marginTop: 8 }}
                />
              )}

              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--txt-2)", marginTop: 12, display: "block" }}>
                Duração (ms)
              </label>
              <input
                type="number"
                defaultValue={slide.duration}
                step={500}
                onBlur={(e) => {
                  const duration = Number(e.target.value) || 5000;
                  saveDuration();
                }}
                style={{ width: "100%", padding: 6, marginTop: 6 }}
              />
            </div>
          )}

          {slide && (
            <div style={{ marginTop: 22 }}>
              <b style={{ fontSize: 12.5, textTransform: "uppercase", color: "var(--txt-2)" }}>Camadas</b>
              <p style={{ fontSize: 11.5, color: "var(--txt-2)", margin: "4px 0 8px" }}>
                De cima pra baixo = da frente pro fundo. O fundo do slide fica sempre por baixo de tudo.
              </p>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <button className="btn ghost pequeno" onClick={() => handleAddLayer("TEXT")}>
                  + Texto
                </button>
                <button className="btn ghost pequeno" onClick={() => handleAddLayer("IMAGE")}>
                  + Imagem
                </button>
                <button className="btn ghost pequeno" onClick={() => handleAddLayer("BUTTON")}>
                  + Botão
                </button>
              </div>

              <div className="camadas-lista">
                {/* Exceção de posição: o Fundo sempre aparece PRIMEIRO na lista
                    (não é arrastável), mas continua renderizando por baixo de
                    todas as camadas no canvas — a lista não reflete 100% a
                    pilha aqui de propósito, só essa única exceção. */}
                <div className="camada-item camada-fundo" title="O fundo do slide — sempre embaixo de todas as camadas, mesmo aparecendo primeiro aqui">
                  <span className="camada-icone">▢</span>
                  <span className="camada-nome">Fundo do slide</span>
                </div>
                <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleReorderDragEnd}>
                  <SortableContext
                    items={[...slide.layers].sort((a, b) => b.order - a.order).map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {[...slide.layers]
                      .sort((a, b) => b.order - a.order)
                      .map((l) => (
                        <CamadaItem
                          key={l.id}
                          layer={l}
                          ativo={l.id === layerId}
                          onSelect={() => setLayerId(l.id)}
                          onDelete={() => handleDeleteLayer(l.id)}
                        />
                      ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}
        </div>

        <div className="canvas-wrap" onClick={onCanvasBackgroundClick}>
          <div style={{ display: "flex" }} onClick={onCanvasBackgroundClick}>
            <div>
              {/* canto vazio acima da régua vertical */}
              <div style={{ height: 20 }} />
              {/* régua vertical (altura) */}
              <div style={{ position: "relative", width: 30, height: canvasSize.height * scale }}>
                {marksY.map((m) => (
                  <div key={m} style={{ position: "absolute", top: m * scale, right: 2, fontSize: 9.5, color: "var(--txt-2)" }}>
                    {m}
                  </div>
                ))}
              </div>
            </div>
            <div>
              {/* régua horizontal (largura) */}
              <div style={{ position: "relative", height: 20, width: canvasSize.width * scale }}>
                {marksX.map((m) => (
                  <div key={m} style={{ position: "absolute", left: m * scale, top: 4, fontSize: 9.5, color: "var(--txt-2)" }}>
                    {m}
                  </div>
                ))}
              </div>
              <div
                ref={canvasRef}
                className="canvas"
                onClick={onCanvasBackgroundClick}
                onMouseDownCapture={onCanvasMouseDownCapture}
                style={{ width: canvasSize.width * scale, height: canvasSize.height * scale }}
              >
                {slideAtualExibida?.background?.type === "color" && (
                  <div style={{ position: "absolute", inset: 0, background: slideAtualExibida.background.value }} />
                )}
                {slideAtualExibida?.background?.type === "image" && (
                  <img
                    src={slideAtualExibida.background.value}
                    alt=""
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
                {slideAtualExibida?.layers.map((l) => {
                  const r = resolveLayerForDevice(l, l.responsive, playing ? "desktop" : device, playing ? 1 : deviceRatio, playing ? 0 : yOffset);
                  if (r.hidden) return null;
                  return (
                    <div
                      key={`${l.id}-${playing ? playIndex : "edit"}`}
                      className={`layer ${!playing && l.id === layerId ? "selecionada" : ""}`}
                      data-layer-id={l.id}
                      style={{
                        left: r.x * scale,
                        top: r.y * scale,
                        width: r.width * scale,
                        height: r.height * scale,
                        transform: `rotate(${r.rotation}deg)`,
                        cursor: playing ? "default" : "move",
                        ...(playing
                          ? ({
                              ["--dur" as any]: `${l.durationMs}ms`,
                              ["--delay" as any]: `${l.delayMs}ms`,
                            } as React.CSSProperties)
                          : {}),
                      }}
                      onMouseDown={playing ? undefined : (e) => onLayerMouseDown(e, l)}
                      draggable={false}
                    >
                      <div className={playing ? `anim-${l.animationIn}` : ""} style={{ width: "100%", height: "100%" }}>
                        {l.type === "TEXT" ? (
                          <div
                            className="txt-layer"
                            style={{
                              fontSize: (l.content.fontSize || 24) * scale * (playing ? 1 : deviceRatio),
                              color: l.content.color || "#0E2E5A",
                              fontWeight: l.content.fontWeight || 700,
                            }}
                          >
                            {l.content.text}
                          </div>
                        ) : l.type === "BUTTON" ? (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "grid",
                              placeItems: "center",
                              background: gradientCss(l.content),
                              borderRadius: (l.content.radius ?? 999) * scale,
                              color: l.content.color || "#fff",
                              fontWeight: l.content.fontWeight || 700,
                              fontSize: (l.content.fontSize || 16) * scale * (playing ? 1 : deviceRatio),
                              textAlign: "center",
                              padding: "0 8px",
                            }}
                          >
                            {l.content.text}
                          </div>
                        ) : l.content.src ? (
                          <img
                            src={l.content.src}
                            alt={l.content.alt || ""}
                            draggable={false}
                            style={{ width: "100%", height: "100%", objectFit: l.content.fit === "cover" ? "cover" : "contain" }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: "#E2E9F1", display: "grid", placeItems: "center", fontSize: 11, color: "#5C6B7C" }}>
                            sem imagem
                          </div>
                        )}
                      </div>
                      {!playing && l.id === layerId && (
                        <>
                          {["nw", "n", "ne", "w", "e", "sw", "s", "se"].map((h) => (
                            <div key={h} className={`alca alca-${h}`} onMouseDown={(e) => onHandleMouseDown(e, h, l)} />
                          ))}
                        </>
                      )}
                    </div>
                  );
                })}

                {guias && !playing && device === "desktop" && (
                  <>
                    {/* Menu (rail) fixo do site — não colocar texto/botão importante embaixo dele */}
                    <div className="guia-site" style={{ left: 0, top: 0, width: 140 * scale, height: 340 * scale }}>
                      <span>Menu do site</span>
                    </div>
                    {/* Selo circular "Cartão LAMIC VIVA+" que fica preso no canto (canvas 1240x600) */}
                    <div className="guia-site" style={{ left: 958 * scale, top: 460 * scale, width: 172 * scale, height: 172 * scale, borderRadius: "50%" }}>
                      <span>Selo Viva+</span>
                    </div>
                    {/* Bolinhas de navegação do carrossel — centralizadas embaixo */}
                    <div
                      className="guia-site"
                      style={{ left: (canvasSize.width / 2 - 70) * scale, top: (canvasSize.height - 64) * scale, width: 140 * scale, height: 40 * scale, borderColor: "#E8862A" }}
                    >
                      <span>Navegação (bolinhas)</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="editor-col">
          <b style={{ fontSize: 12.5, textTransform: "uppercase", color: "var(--txt-2)" }}>Propriedades</b>
          {!layer || !layerBase ? (
            <p style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 10 }}>Selecione uma camada no canvas.</p>
          ) : (
            <div className="form" style={{ marginTop: 10 }}>
              {device !== "desktop" && (
                <div className="aviso-ok" style={{ fontSize: 12 }}>
                  Editando só para <b>{DEVICES.find((d) => d.id === device)?.label}</b>. O que não for alterado aqui
                  usa o valor do Desktop.
                </div>
              )}

              {layer.type === "TEXT" && (
                <>
                  <label>Texto</label>
                  <textarea
                    rows={3}
                    value={layerBase.content.text || ""}
                    onChange={(e) => patchLayerBase(layerBase.id, { content: { ...layerBase.content, text: e.target.value } })}
                    onBlur={() => saveLayer(layerBase.id, { content: layerBase.content })}
                  />
                  <div className="campo-inline">
                    <div>
                      <label>Tam. fonte</label>
                      <input
                        type="number"
                        value={layerBase.content.fontSize || 24}
                        onChange={(e) => patchLayerBase(layerBase.id, { content: { ...layerBase.content, fontSize: Number(e.target.value) } })}
                        onBlur={() => saveLayer(layerBase.id, { content: layerBase.content })}
                      />
                    </div>
                    <div>
                      <label>Cor</label>
                      <input
                        type="color"
                        value={layerBase.content.color || "#0E2E5A"}
                        onChange={(e) => {
                          patchLayerBase(layerBase.id, { content: { ...layerBase.content, color: e.target.value } });
                          saveLayer(layerBase.id, { content: { ...layerBase.content, color: e.target.value } });
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {layer.type === "BUTTON" && (
                <>
                  <label>Texto do botão</label>
                  <input
                    value={layerBase.content.text || ""}
                    onChange={(e) => patchLayerBase(layerBase.id, { content: { ...layerBase.content, text: e.target.value } })}
                    onBlur={() => saveLayer(layerBase.id, { content: layerBase.content })}
                  />
                  <label>Link (URL)</label>
                  <input
                    value={layerBase.content.href || ""}
                    placeholder="https://…"
                    onChange={(e) => patchLayerBase(layerBase.id, { content: { ...layerBase.content, href: e.target.value } })}
                    onBlur={() => saveLayer(layerBase.id, { content: layerBase.content })}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <input
                      type="checkbox"
                      checked={layerBase.content.newTab !== false}
                      onChange={(e) => {
                        const content = { ...layerBase.content, newTab: e.target.checked };
                        patchLayerBase(layerBase.id, { content });
                        saveLayer(layerBase.id, { content });
                      }}
                    />
                    Abrir em outra página (nova aba)
                  </label>
                  <div className="campo-inline">
                    <div>
                      <label>Gradiente de</label>
                      <input
                        type="color"
                        value={layerBase.content.gradientFrom || "#1257A5"}
                        onChange={(e) => {
                          const content = { ...layerBase.content, gradientFrom: e.target.value };
                          patchLayerBase(layerBase.id, { content });
                          saveLayer(layerBase.id, { content });
                        }}
                      />
                    </div>
                    <div>
                      <label>até</label>
                      <input
                        type="color"
                        value={layerBase.content.gradientTo || "#2AA7BE"}
                        onChange={(e) => {
                          const content = { ...layerBase.content, gradientTo: e.target.value };
                          patchLayerBase(layerBase.id, { content });
                          saveLayer(layerBase.id, { content });
                        }}
                      />
                    </div>
                  </div>
                  <div className="campo-inline">
                    <div>
                      <label>Cor ao passar o mouse (de)</label>
                      <input
                        type="color"
                        value={layerBase.content.hoverFrom || "#2AA7BE"}
                        onChange={(e) => {
                          const content = { ...layerBase.content, hoverFrom: e.target.value };
                          patchLayerBase(layerBase.id, { content });
                          saveLayer(layerBase.id, { content });
                        }}
                      />
                    </div>
                    <div>
                      <label>até</label>
                      <input
                        type="color"
                        value={layerBase.content.hoverTo || "#2AA7BE"}
                        onChange={(e) => {
                          const content = { ...layerBase.content, hoverTo: e.target.value };
                          patchLayerBase(layerBase.id, { content });
                          saveLayer(layerBase.id, { content });
                        }}
                      />
                    </div>
                  </div>
                  <div className="campo-inline">
                    <div>
                      <label>Ângulo (°)</label>
                      <input
                        type="number"
                        value={layerBase.content.angle ?? 90}
                        onChange={(e) => patchLayerBase(layerBase.id, { content: { ...layerBase.content, angle: Number(e.target.value) } })}
                        onBlur={() => saveLayer(layerBase.id, { content: layerBase.content })}
                      />
                    </div>
                    <div>
                      <label>Borda (px)</label>
                      <input
                        type="number"
                        value={layerBase.content.radius ?? 999}
                        onChange={(e) => patchLayerBase(layerBase.id, { content: { ...layerBase.content, radius: Number(e.target.value) } })}
                        onBlur={() => saveLayer(layerBase.id, { content: layerBase.content })}
                      />
                    </div>
                  </div>
                  <div className="campo-inline">
                    <div>
                      <label>Tam. fonte</label>
                      <input
                        type="number"
                        value={layerBase.content.fontSize || 16}
                        onChange={(e) => patchLayerBase(layerBase.id, { content: { ...layerBase.content, fontSize: Number(e.target.value) } })}
                        onBlur={() => saveLayer(layerBase.id, { content: layerBase.content })}
                      />
                    </div>
                    <div>
                      <label>Cor do texto</label>
                      <input
                        type="color"
                        value={layerBase.content.color || "#ffffff"}
                        onChange={(e) => {
                          const content = { ...layerBase.content, color: e.target.value };
                          patchLayerBase(layerBase.id, { content });
                          saveLayer(layerBase.id, { content });
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {layer.type === "IMAGE" && (
                <>
                  <label>Imagem</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      onImageFile(file, (src, naturalWidth) => {
                        patchLayerBase(layerBase.id, { content: { ...layerBase.content, src } });
                        saveLayer(layerBase.id, { content: { ...layerBase.content, src } });
                        setAvisoImagem(avisarQualidade(naturalWidth, layerBase.width));
                      });
                    }}
                  />
                  {avisoImagem && (
                    <p style={{ fontSize: 11.5, color: "#B8791A", marginTop: 6, lineHeight: 1.4 }}>⚠ {avisoImagem}</p>
                  )}
                  <label>Ajuste da imagem no quadro</label>
                  <select
                    value={layerBase.content.fit === "cover" ? "cover" : "contain"}
                    onChange={(e) => {
                      const content = { ...layerBase.content, fit: e.target.value };
                      patchLayerBase(layerBase.id, { content });
                      saveLayer(layerBase.id, { content });
                    }}
                  >
                    <option value="contain">Ajustar inteira (sem cortar)</option>
                    <option value="cover">Preencher o quadro (pode cortar)</option>
                  </select>
                </>
              )}

              <div className="campo-inline">
                <div>
                  <label>Largura ({device})</label>
                  <input
                    type="number"
                    value={Math.round(layer.width)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (device === "desktop") patchLayerBase(layerBase.id, { width: v });
                      else patchLayerResponsive(layerBase.id, device, { width: v });
                    }}
                    onBlur={() => {
                      if (device === "desktop") saveLayer(layerBase.id, { width: layer.width });
                      else saveResponsive(layerBase.id, device, { width: layerBase.responsive[device]?.width });
                    }}
                  />
                </div>
                <div>
                  <label>Altura ({device})</label>
                  <input
                    type="number"
                    value={Math.round(layer.height)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (device === "desktop") patchLayerBase(layerBase.id, { height: v });
                      else patchLayerResponsive(layerBase.id, device, { height: v });
                    }}
                    onBlur={() => {
                      if (device === "desktop") saveLayer(layerBase.id, { height: layer.height });
                      else saveResponsive(layerBase.id, device, { height: layerBase.responsive[device]?.height });
                    }}
                  />
                </div>
              </div>

              {device !== "desktop" && (
                <>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                    <input
                      type="checkbox"
                      checked={!!layerBase.responsive[device]?.hidden}
                      onChange={(e) => {
                        patchLayerResponsive(layerBase.id, device, { hidden: e.target.checked });
                        saveResponsive(layerBase.id, device, { hidden: e.target.checked });
                      }}
                    />
                    Ocultar nesse dispositivo
                  </label>
                  <button
                    className="btn ghost pequeno"
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      patchLayerResponsive(layerBase.id, device, {});
                      setSlides((prev) =>
                        prev.map((s) =>
                          s.id !== slideId
                            ? s
                            : {
                                ...s,
                                layers: s.layers.map((l) => {
                                  if (l.id !== layerBase.id) return l;
                                  const r = { ...l.responsive };
                                  delete r[device];
                                  return { ...l, responsive: r };
                                }),
                              }
                        )
                      );
                      startTransition(() => updateLayerResponsiveAction(project.id, layerBase.id, device, null as any));
                    }}
                  >
                    Usar valores do Desktop
                  </button>
                </>
              )}

              {device === "desktop" && (
                <>
                  <label>Animação de entrada</label>
                  <select
                    value={layerBase.animationIn}
                    onChange={(e) => {
                      patchLayerBase(layerBase.id, { animationIn: e.target.value });
                      saveLayer(layerBase.id, { animationIn: e.target.value });
                    }}
                  >
                    {ANIMACOES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>

                  <div className="campo-inline">
                    <div>
                      <label>Atraso (ms)</label>
                      <input
                        type="number"
                        value={layerBase.delayMs}
                        onChange={(e) => patchLayerBase(layerBase.id, { delayMs: Number(e.target.value) })}
                        onBlur={() => saveLayer(layerBase.id, { delayMs: layerBase.delayMs })}
                      />
                    </div>
                    <div>
                      <label>Duração (ms)</label>
                      <input
                        type="number"
                        value={layerBase.durationMs}
                        onChange={(e) => patchLayerBase(layerBase.id, { durationMs: Number(e.target.value) })}
                        onBlur={() => saveLayer(layerBase.id, { durationMs: layerBase.durationMs })}
                      />
                    </div>
                  </div>
                </>
              )}

              <button className="btn perigo pequeno" style={{ marginTop: 16 }} onClick={() => handleDeleteLayer(layerBase.id)}>
                Excluir camada
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
