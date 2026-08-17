# Progresso — Painel LAMIC + Motor de Slides

> Arquivo de continuidade. Se a sessão foi interrompida, comece lendo isto
> antes de mexer em qualquer coisa — evita repetir trabalho ou reintroduzir
> bugs já corrigidos.

## Status geral

- **Nada foi commitado ainda.** Tudo abaixo está só no working tree local.
  Último commit real: `7fd4602 feat: importa dados reais do site
  laboratoriolamic.com.br` (só o site estático, sem o painel/admin).
- Repositório remoto: `https://github.com/Nolei98/Lamic.git` (branch `main`).
- Deploy de referência (protegido por login Vercel, não acessível
  diretamente): `lamic-i60ldq3ge-nolei98s-projects.vercel.app`.

## O que é este projeto

Site institucional do Laboratório LAMIC (`public/*.html`, estático) +
um painel administrativo em Next.js (`/admin`) com um motor de
slides/banners próprio (parecido com o Slider Revolution, mas construído do
zero) que substitui o hero fixo da home por um carrossel editável.

- **Stack:** Next.js 14 (App Router) + TypeScript + Prisma + SQLite (local,
  `prisma/dev.db`) + `@dnd-kit` (arrastar camadas na lista).
- **Rodar local:** `npm run dev` → `http://localhost:3000` (porta 3000
  fixa). Se travar/gerar lag depois de muitas edições, reiniciar o servidor
  do zero costuma resolver (`Get-Process node | Stop-Process -Force` antes).
- **Login do painel:** `/admin/login` — e-mail `noleirodrigues@gmail.com`,
  senha em `.env` (`ADMIN_PASSWORD`). Sem cadastro público — usuários novos
  só são criados de dentro do painel (`/admin/usuarios`).
- **Projeto do banner da home:** "Banner Home — Vacinas", slug
  `banner-home-vacinas`, id `cmsvpkl1w0001dj5ajcs5ecf2`, publicado. A home
  (`public/index.html`) embute ele via `<iframe src="/vitrine/banner-home-vacinas?embed=1">`
  no lugar do hero antigo.

## Arquitetura do motor de slides

- `lib/breakpoints.ts` — tamanhos de tela e a matemática de posição
  responsiva. **Valores reais**, extraídos da configuração de verdade do
  Slider Revolution do site oficial (`laboratoriolamic.com.br`, achado
  inspecionando o HTML/JS deles):
  - Desktop: **1240×600** (tamanho nativo do projeto)
  - Notebook/Tablet: **1024×600**
  - Celular: **480×720** (retrato — o valor certo depois de uma correção,
    tinha saído largura/altura trocadas numa tentativa anterior)
- Sem ajuste manual pra um dispositivo, a camada herda a posição do
  desktop **encolhida proporcionalmente** (`deviceScaleRatio`) e
  **centralizada verticalmente** (`deviceYOffset`) — nunca vaza pra fora do
  quadro.
- `app/admin/(app)/slides/[id]/editor.tsx` — o editor. Componente grande,
  tudo num arquivo só por enquanto.
- `app/vitrine/[slug]/player.tsx` — o player público (dentro do iframe).
  Modo `?embed=1` = preenche 100% do iframe, sem moldura. A escala no modo
  embed vem da **altura** do iframe (`window.innerHeight`), não da largura
  — porque o site oficial trava a altura em 600px (720 no celular) e só
  deixa a largura esticar. Ver `.hero-embed{height:600px}` no
  `public/assets/estilo.css` (era `aspect-ratio`, foi trocado por altura
  fixa pra bater exatamente com o site real).
- `app/actions/editor.ts` — server actions (criar/editar/excluir
  slide/camada, reordenar).

## Decisões de produto tomadas nesta sessão

- **Salvamento manual.** Nada mais salva sozinho a cada mudança — só ao
  clicar em "💾 Salvar" no topo do editor (indicador "Alterações não
  salvas"/"✓ Tudo salvo"). Motivo: autosave em cada clique causava lag e
  corrida entre gravações. Ações **estruturais** (criar/excluir
  slide/camada, reordenar) continuam imediatas — não esperam o Salvar. Isso
  ficou combinado assim mas nunca foi confirmado explicitamente pelo
  usuário; se perguntar de novo, é bom confirmar se faz sentido.
- **Barra de busca não fica mais em cima do banner** — só o menu (rail) e o
  cartão "LAMIC VIVA+" continuam sobrepostos. Removida a margem negativa
  que puxava a busca pra cima do hero (`public/assets/estilo.css`, classe
  `.busca`).
- **Navegação do carrossel público**: só bolinhas, centralizadas embaixo do
  banner. As setas de próximo/anterior foram removidas (ficavam "em cima"
  do conteúdo do slide, o usuário achou melhor sem elas).
- **Fundo do slide**: sempre `object-fit:cover`, preenche o quadro inteiro
  (nunca aparece "quadriculado" fora dele — isso só existe na PRÉVIA do
  editor, pra mostrar quanto da foto original é cortado).

## Recursos do editor já implementados

- Canvas com zoom 100% (tamanho real, padrão) ou "Ajustar à tela".
- Régua de medidas (topo + lateral esquerda).
- Camadas: Texto, Imagem, Botão (com gradiente + cor de hover configurável
  + link com opção de abrir em nova aba).
- Arrastar e redimensionar direto no canvas — **mexe direto no DOM durante
  o movimento** (sem re-render do React a cada pixel) pra não travar;
  só sincroniza com o React/servidor ao soltar o mouse.
- Painel de Camadas com ordem de empilhamento (arrastar pra reordenar via
  `@dnd-kit`), exceção: "Fundo do slide" sempre aparece primeiro na lista
  mas renderiza atrás de tudo no canvas.
- Responsivo por dispositivo (Desktop/Notebook-Tablet/Celular) com
  sobrescrita manual de posição/tamanho por camada.
- "🗺 Guias do site" — mostra por cima do canvas onde ficam o menu, o selo
  Viva+ e a navegação do slide reais do site (só no modo Desktop).
- Aviso de qualidade de imagem: se a foto enviada for pequena demais pro
  tamanho que vai ocupar (< 1.6× de folga), mostra um alerta.
- Prévia do fundo mostra a foto inteira + a área realmente visível marcada
  (accounting pro corte do `object-fit:cover`).
- Aviso antes de sair da página com alteração não salva (`beforeunload`).

## Bugs encontrados e corrigidos nesta sessão (histórico, não repetir)

1. Clique numa alça de redimensionar sendo "roubado" pela lógica de
   "priorizar camada selecionada" → corrigido ignorando cliques em `.alca`.
2. Arrastar/redimensionar "travando" (só atualizava a posição ao soltar o
   mouse) → causa real: `e.currentTarget` não confiável quando o
   `onLayerMouseDown` era invocado indiretamente pelo caminho de clique
   "prioridade da camada selecionada". Corrigido buscando o elemento via
   `data-layer-id` (atributo fixo no DOM) em vez de `currentTarget`.
2b. **Ainda pendente** (relatado, não resolvido): se a camada selecionada
   está *atrás* de outra na pilha, as alças dela podem ficar visualmente
   cobertas pela camada da frente, e o clique nunca chega até a alça (vai
   pra camada da frente). Ideia de solução: renderizar as alças da camada
   selecionada num overlay separado, sempre por cima de tudo (fora do loop
   normal de camadas), só pra fins de clique — sem mudar a ordem visual
   real.
3. Excluir camada bagunçando a ordem das outras → o campo `order` podia
   colidir depois de um delete no meio da lista; corrigido renumerando
   (0..n-1) a cada exclusão.
4. Corte arredondado do banner vazando um quadrado atrás da curva →
   `.hero-embed` tinha `background` sólido atrás do iframe recortado;
   removido (deixado transparente).
5. Guia de corte do fundo (prévia no editor) desalinhada → a miniatura
   usava uma caixa com proporção diferente da foto, causando um "encaixe
   dentro de encaixe". Corrigido fazendo a caixa da miniatura usar a mesma
   proporção (`aspect-ratio`) da foto original.
6. Ícone de seta dos cards de serviço girando pro lado errado no hover →
   sentido da rotação estava invertido (`-45deg` → `45deg`).
7. Tag `</main>` duplicada em `public/index.html` (bug antigo, achado por
   acaso ao mexer na seção do formulário de contato).

## Pendências conhecidas (ainda não implementadas)

- **Atalhos de teclado**: Ctrl+Z (desfazer), Delete (excluir camada
  selecionada), Ctrl+C/Ctrl+V (copiar/colar camada). Pedido explicitamente,
  ainda não entrei nisso. Se implementar, escopo sugerido: Delete e
  Ctrl+C/V são baratos (ver seção 2b acima também, mesmo contexto de
  seleção); Ctrl+Z é mais trabalhoso — sugestão é limitar a desfazer só
  edições de propriedade (posição/tamanho/texto/cor) via uma pilha de
  snapshots do estado local, não tentar desfazer ações estruturais
  (criar/excluir slide/camada), que já são imediatas no servidor.
- **Fix 2b acima** (alças cobertas por camada da frente).
- Responsivo do banner da home ainda não tem ajustes manuais finos por
  camada em Tablet/Celular — herda o encolhimento automático. Pode precisar
  de retoque depois de ver como fica na prática.
- Qualidade de imagem: implementado só o aviso (texto). Não há nenhum
  redimensionamento/otimização automática de imagem — depende do usuário
  enviar fotos em resolução alta o bastante (o aviso ajuda, mas não força).

## Próximo passo sugerido

Revisar tudo visualmente com calma (o usuário ainda não confirmou "está
pronto pra commitar"), decidir se entra nas pendências acima, e só então
fazer o primeiro commit de todo o painel/motor de slides — vai ser um
commit grande (dezenas de arquivos novos: `app/`, `lib/`, `prisma/`,
`middleware.ts`, configs). Confirmar com o usuário antes de dar `git push`,
como já vem sendo feito nesta sessão.
