"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado.");
  return session;
}

export async function addSlideAction(projectId: string) {
  await requireSession();
  const count = await prisma.slide.count({ where: { projectId } });
  const slide = await prisma.slide.create({
    data: { projectId, order: count, background: JSON.stringify({ type: "color", value: "#123C74" }) },
  });
  revalidatePath(`/admin/slides/${projectId}`);
  // Devolve o slide recém-criado pro editor poder inserir direto no estado
  // local (sem recarregar a página, o que perderia qualquer edição pendente
  // ainda não salva em outro slide/camada).
  return {
    id: slide.id,
    order: slide.order,
    duration: slide.duration,
    background: slide.background ? JSON.parse(slide.background) : null,
    hidden: slide.hidden,
    layers: [],
  };
}

export async function deleteSlideAction(projectId: string, slideId: string) {
  await requireSession();
  await prisma.slide.delete({ where: { id: slideId } });
  revalidatePath(`/admin/slides/${projectId}`);
}

/** Recebe a lista de IDs de slide na ordem visual desejada e grava o campo
 * "order" de cada um de uma vez só. Usado pelo arrastar-e-soltar da lista
 * de Slides (mesma ideia do reorderLayersAction, mas pros slides). */
export async function reorderSlidesAction(projectId: string, orderedSlideIds: string[]) {
  await requireSession();
  await prisma.$transaction(
    orderedSlideIds.map((id, i) => prisma.slide.update({ where: { id }, data: { order: i } }))
  );
  revalidatePath(`/admin/slides/${projectId}`);
}

/** Slide oculto continua existindo e editável no painel, mas some do
 * carrossel publicado (ver filtro em app/vitrine/[slug]/page.tsx) — dá pra
 * preparar um slide com calma ou pausar um sem perder o que já foi feito. */
export async function toggleSlideHiddenAction(projectId: string, slideId: string, hidden: boolean) {
  await requireSession();
  await prisma.slide.update({ where: { id: slideId }, data: { hidden } });
  revalidatePath(`/admin/slides/${projectId}`);
}

/** Duplica um slide inteiro (fundo, duração e todas as camadas, com o
 * mesmo texto/posição/animação de cada uma) e insere a cópia logo depois
 * do original na ordem — jeito rápido de criar uma variação de um slide
 * que já ficou bom, sem recomeçar do zero. */
export async function duplicateSlideAction(projectId: string, slideId: string) {
  await requireSession();
  const original = await prisma.slide.findUniqueOrThrow({
    where: { id: slideId },
    include: { layers: { orderBy: { order: "asc" } } },
  });

  // Abre espaço pra cópia entrar logo após o original: todo slide com
  // order maior sobe uma casa.
  await prisma.slide.updateMany({
    where: { projectId, order: { gt: original.order } },
    data: { order: { increment: 1 } },
  });

  const copia = await prisma.slide.create({
    data: {
      projectId,
      order: original.order + 1,
      duration: original.duration,
      background: original.background,
      hidden: original.hidden,
      layers: {
        create: original.layers.map((l) => ({
          type: l.type,
          order: l.order,
          x: l.x,
          y: l.y,
          width: l.width,
          height: l.height,
          rotation: l.rotation,
          content: l.content,
          animationIn: l.animationIn,
          animationOut: l.animationOut,
          delayMs: l.delayMs,
          durationMs: l.durationMs,
          responsive: l.responsive,
        })),
      },
    },
    include: { layers: { orderBy: { order: "asc" } } },
  });

  revalidatePath(`/admin/slides/${projectId}`);

  return {
    id: copia.id,
    order: copia.order,
    duration: copia.duration,
    background: copia.background ? JSON.parse(copia.background) : null,
    hidden: copia.hidden,
    layers: copia.layers.map((l) => ({
      id: l.id,
      type: l.type as "TEXT" | "IMAGE" | "BUTTON",
      order: l.order,
      x: l.x,
      y: l.y,
      width: l.width,
      height: l.height,
      rotation: l.rotation,
      content: JSON.parse(l.content),
      animationIn: l.animationIn,
      animationOut: l.animationOut,
      delayMs: l.delayMs,
      durationMs: l.durationMs,
      responsive: l.responsive ? JSON.parse(l.responsive) : {},
    })),
  };
}

export async function updateSlideBackgroundAction(projectId: string, slideId: string, background: { type: "color" | "image"; value: string }) {
  await requireSession();
  await prisma.slide.update({ where: { id: slideId }, data: { background: JSON.stringify(background) } });
  revalidatePath(`/admin/slides/${projectId}`);
}

export async function updateSlideDurationAction(projectId: string, slideId: string, duration: number) {
  await requireSession();
  await prisma.slide.update({ where: { id: slideId }, data: { duration } });
  revalidatePath(`/admin/slides/${projectId}`);
}

export async function addLayerAction(
  projectId: string,
  slideId: string,
  type: "TEXT" | "IMAGE" | "BUTTON",
) {
  await requireSession();
  const count = await prisma.layer.count({ where: { slideId } });
  const slide = await prisma.slide.findUnique({ where: { id: slideId }, include: { project: true } });
  const projectWidth = slide?.project.width || 1200;
  const projectHeight = slide?.project.height || 500;
  const content =
    type === "TEXT"
      ? { text: "Novo texto", fontSize: 28, color: "#FFFFFF", fontWeight: 700 }
      : type === "BUTTON"
      ? {
          text: "Fale conosco",
          href: "https://api.whatsapp.com/send?phone=5588988340130",
          newTab: true,
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: 700,
          gradientFrom: "#1257A5",
          gradientTo: "#2AA7BE",
          hoverFrom: "#2AA7BE",
          hoverTo: "#2AA7BE",
          angle: 90,
          radius: 999,
        }
      : { src: "", alt: "", fit: "contain" };

  const layer = await prisma.layer.create({
    data: {
      slideId,
      type,
      order: count,
      x: 40,
      y: 40,
      width: type === "TEXT" ? 320 : type === "BUTTON" ? 200 : Math.round(projectWidth * 0.6),
      height: type === "TEXT" ? 60 : type === "BUTTON" ? 48 : Math.round(projectHeight * 0.6),
      content: JSON.stringify(content),
    },
  });
  revalidatePath(`/admin/slides/${projectId}`);
  // Mesma ideia do addSlideAction: devolve a camada criada pro editor
  // encaixar no estado local em vez de recarregar a página inteira.
  return {
    id: layer.id,
    type: layer.type as "TEXT" | "IMAGE" | "BUTTON",
    order: layer.order,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
    content,
    animationIn: layer.animationIn,
    animationOut: layer.animationOut,
    delayMs: layer.delayMs,
    durationMs: layer.durationMs,
    responsive: {},
  };
}

export async function deleteLayerAction(projectId: string, layerId: string) {
  await requireSession();
  const layer = await prisma.layer.findUniqueOrThrow({ where: { id: layerId } });
  await prisma.layer.delete({ where: { id: layerId } });

  // Renumera o "order" das camadas que sobraram (0,1,2,...) sem buracos.
  // Sem isso, depois de excluir uma camada do meio, o próximo "+ Camada"
  // podia gerar um order que colidia com o de outra camada já existente
  // (ex.: tinha 0,1,2; apagava a 1; a próxima criada virava 2 de novo,
  // duplicando o valor) — daí a pilha de camadas ficava instável.
  const restantes = await prisma.layer.findMany({ where: { slideId: layer.slideId }, orderBy: { order: "asc" } });
  await prisma.$transaction(restantes.map((l, i) => prisma.layer.update({ where: { id: l.id }, data: { order: i } })));

  revalidatePath(`/admin/slides/${projectId}`);
}

/** Move a camada uma posição pra cima ou pra baixo na ordem de empilhamento
 * (troca o campo "order" com a camada vizinha). Topo da lista de camadas =
 * frente (por cima) na hora de renderizar; o fundo do slide fica sempre
 * implicitamente por baixo de todas. */
export async function reorderLayerAction(projectId: string, slideId: string, layerId: string, direction: "up" | "down") {
  await requireSession();
  const layers = await prisma.layer.findMany({ where: { slideId }, orderBy: { order: "asc" } });
  const idx = layers.findIndex((l) => l.id === layerId);
  if (idx === -1) return;
  const swapWith = direction === "up" ? idx + 1 : idx - 1;
  if (swapWith < 0 || swapWith >= layers.length) return;

  const a = layers[idx];
  const b = layers[swapWith];
  await prisma.$transaction([
    prisma.layer.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.layer.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  revalidatePath(`/admin/slides/${projectId}`);
}

export type LayerUpdateInput = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  animationIn?: string;
  animationOut?: string;
  delayMs?: number;
  durationMs?: number;
  content?: Record<string, unknown>;
};

export async function updateLayerAction(projectId: string, layerId: string, data: LayerUpdateInput) {
  await requireSession();
  await prisma.layer.update({
    where: { id: layerId },
    data: {
      ...(data.x !== undefined ? { x: data.x } : {}),
      ...(data.y !== undefined ? { y: data.y } : {}),
      ...(data.width !== undefined ? { width: data.width } : {}),
      ...(data.height !== undefined ? { height: data.height } : {}),
      ...(data.rotation !== undefined ? { rotation: data.rotation } : {}),
      ...(data.animationIn !== undefined ? { animationIn: data.animationIn } : {}),
      ...(data.animationOut !== undefined ? { animationOut: data.animationOut } : {}),
      ...(data.delayMs !== undefined ? { delayMs: data.delayMs } : {}),
      ...(data.durationMs !== undefined ? { durationMs: data.durationMs } : {}),
      ...(data.content !== undefined ? { content: JSON.stringify(data.content) } : {}),
    },
  });
  revalidatePath(`/admin/slides/${projectId}`);
}

export async function updateLayerResponsiveAction(
  projectId: string,
  layerId: string,
  device: "tablet" | "mobile",
  override: Record<string, unknown> | null,
) {
  await requireSession();
  const layer = await prisma.layer.findUniqueOrThrow({ where: { id: layerId } });
  const current = layer.responsive ? JSON.parse(layer.responsive) : {};
  if (override === null) {
    delete current[device];
  } else {
    current[device] = { ...(current[device] || {}), ...override };
  }
  await prisma.layer.update({ where: { id: layerId }, data: { responsive: JSON.stringify(current) } });
  revalidatePath(`/admin/slides/${projectId}`);
}

/** Recebe a lista de IDs de camada na ordem visual desejada (topo da lista =
 * frente) e grava o campo "order" de cada uma de uma vez só. Usado pelo
 * arrastar-e-soltar do painel de Camadas. */
export async function reorderLayersAction(projectId: string, orderedLayerIds: string[]) {
  await requireSession();
  const total = orderedLayerIds.length;
  await prisma.$transaction(
    orderedLayerIds.map((id, i) => prisma.layer.update({ where: { id }, data: { order: total - 1 - i } }))
  );
  revalidatePath(`/admin/slides/${projectId}`);
}

export async function uploadImageAction(dataUrl: string): Promise<string> {
  // MVP: guarda a imagem como data URL direto no layer (sem upload para storage
  // externo ainda). Para produção, trocar por upload real (Vercel Blob, S3 ou
  // a própria Hostgator via FTP) e salvar apenas a URL aqui.
  return dataUrl;
}
