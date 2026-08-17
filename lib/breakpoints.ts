export type Device = "desktop" | "tablet" | "mobile";

// Tamanhos fixos de cada dispositivo — os mesmos valores reais usados pelo
// Slider Revolution do site oficial (laboratoriolamic.com.br), extraídos da
// configuração de verdade do slider deles (gridwidth/gridheight):
//   desktop 1240x600 · notebook/tablet 1024x600 · celular 480x720
// O desktop usa o tamanho nativo do projeto (que já nasce em 1240x600 pros
// projetos criados a partir de agora); tablet e celular são fixos.
export const DEVICES: { id: Device; label: string; width: number; height: number }[] = [
  { id: "desktop", label: "Desktop", width: 0, height: 0 }, // 0 = usa o tamanho nativo do projeto
  { id: "tablet", label: "Notebook / Tablet", width: 1024, height: 600 },
  { id: "mobile", label: "Celular", width: 480, height: 720 },
];

export function deviceCanvasSize(device: Device, projectWidth: number, projectHeight: number) {
  if (device === "desktop") return { width: projectWidth, height: projectHeight };
  const d = DEVICES.find((d) => d.id === device)!;
  return { width: d.width, height: d.height };
}

/** Proporção entre a largura do quadro do dispositivo e a largura nativa
 * (desktop) do projeto — usada pra encolher, por padrão, a posição/tamanho
 * das camadas que ainda não têm um ajuste manual pra esse dispositivo. Sem
 * isso, uma camada desenhada pra um banner de 1240px ficaria com as mesmas
 * coordenadas em px dentro de um quadro de celular de 480px, ou seja,
 * transbordando pra fora do quadro. */
export function deviceScaleRatio(device: Device, projectWidth: number): number {
  if (device === "desktop") return 1;
  const canvas = deviceCanvasSize(device, projectWidth, 0);
  return canvas.width / projectWidth;
}

export type LayerOverride = Partial<{
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  hidden: boolean;
}>;

export type ResponsiveMap = Partial<Record<"tablet" | "mobile", LayerOverride>>;

export function parseResponsive(raw: string | null | undefined): ResponsiveMap {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Resolve os valores efetivos de uma camada para o dispositivo pedido.
 * Sem um ajuste manual (override) pra esse dispositivo, a posição e o
 * tamanho vêm do desktop encolhidos pela proporção da tela (`ratio`) — assim
 * a camada sempre nasce dentro do quadro, em vez de manter coordenadas de
 * um banner bem maior. Um override sempre vence e é tratado como já sendo
 * nativo daquele dispositivo (não é escalado de novo). */
export function resolveLayerForDevice<
  T extends { x: number; y: number; width: number; height: number; rotation: number }
>(base: T, responsive: ResponsiveMap, device: Device, ratio = 1, yOffset = 0): T & { hidden: boolean } {
  if (device === "desktop") return { ...base, hidden: false };
  const override = responsive[device] || {};
  const encolhido = {
    ...base,
    x: base.x * ratio,
    y: base.y * ratio + yOffset,
    width: base.width * ratio,
    height: base.height * ratio,
  };
  return {
    ...encolhido,
    ...override,
    hidden: !!override.hidden,
  };
}

/** Deslocamento vertical pra centralizar, por padrão, o layout (encolhido)
 * do desktop dentro do quadro do dispositivo — como tablet e celular agora
 * têm proporção própria (não é mais um recorte da proporção do desktop),
 * sem isso as camadas podiam ficar grudadas no topo com um vazio embaixo,
 * ou cortadas se o quadro for mais baixo. */
export function deviceYOffset(device: Device, projectWidth: number, projectHeight: number): number {
  if (device === "desktop") return 0;
  const ratio = deviceScaleRatio(device, projectWidth);
  const canvas = deviceCanvasSize(device, projectWidth, projectHeight);
  const layoutEncolhidoAltura = projectHeight * ratio;
  return (canvas.height - layoutEncolhidoAltura) / 2;
}
