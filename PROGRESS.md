# Progresso — Painel LAMIC + Motor de Slides

> Arquivo de continuidade. Se a sessão foi interrompida, comece lendo isto
> antes de mexer em qualquer coisa — evita repetir trabalho ou reintroduzir
> bugs já corrigidos.

## Status geral

- **Tudo commitado e em produção.** Branch `main`, remoto
  `https://github.com/Nolei98/Lamic.git`, sincronizada com `origin/main`
  (working tree limpa no fim desta sessão).
- **Produção:** `https://lamic-three.vercel.app` — site institucional +
  painel `/admin` funcionando, banco em Postgres (Supabase).
- **Deploy:** normalmente automático via push no GitHub → Vercel. Em algum
  momento desta sessão o GitHub teve uma instabilidade e os pushes não
  disparavam deploy; nesse caso usei `vercel deploy --prod` (Vercel CLI, já
  logado como `nolei98`) direto da máquina. Se algo parecido acontecer de
  novo, essa é a saída.

## ⚠️ Aviso importante: local e produção usam o MESMO banco

`vercel pull --environment production` (rodado nesta sessão pra linkar o
projeto) criou um `.env.local` que faz o `npm run dev` local ler as MESMAS
`DATABASE_URL`/`DIRECT_URL` de produção (Supabase). **Não existe banco de
desenvolvimento separado.** Qualquer edição feita em `localhost:3000`
grava direto no site real.

Isso já causou um incidente nesta sessão: uma camada de título do banner
da home foi apagada de verdade (provavelmente por uma aba antiga do
painel ainda aberta, com estado desatualizado, insistindo em salvar por
cima). Tive que restaurar manualmente via script direto no banco. Se for
mexer bastante ou testar coisas arriscadas, considere:
- Criar um projeto Supabase separado só pra dev (era uma pergunta em
  aberto — o usuário ainda não decidiu se quer isso), **ou**
- Sempre testar mudanças novas num **projeto de banner descartável**
  dentro do próprio painel (criar → testar → apagar) em vez de editar o
  "Banner Home — Vacinas" real, **ou**
- Garantir que só uma aba/janela do painel fique aberta por vez.

## O que é este projeto

Site institucional do Laboratório LAMIC (`public/*.html`, estático) + um
painel administrativo em Next.js (`/admin`) com um motor de
slides/banners próprio (parecido com o Slider Revolution, mas construído
do zero) que substitui o hero fixo da home por um carrossel editável.

- **Stack:** Next.js 14 (App Router) + TypeScript + Prisma + **Postgres
  (Supabase, projeto `lamic-admin`, região São Paulo/`sa-east-1`)** +
  `@dnd-kit` (arrastar slides e camadas).
- **Rodar local:** `npm run dev` → `http://localhost:3000` (porta 3000
  fixa). Lembrar do aviso acima — é o banco de produção.
- **Login do painel:** `/admin/login` — e-mail `noleirodrigues@gmail.com`,
  senha em `ADMIN_PASSWORD` (`.env` local e nas env vars da Vercel).
- **Projeto do banner da home:** "Banner Home — Vacinas", slug
  `banner-home-vacinas`, projeto id `cmsxcgni20001rain617j2rrz` (mudou de
  id depois de um `seed-hero.ts` rodado nesta sessão — não é mais
  `cmsvpkl1w0001dj5ajcs5ecf2`), publicado. A home (`public/index.html`)
  embute ele via `<iframe src="/vitrine/banner-home-vacinas?embed=1">`.
- **Script de restauração:** `scripts/seed-hero.ts` recria os 3 slides
  reais do banner da home do zero (apaga e recria — só rodar se o
  conteúdo real estiver corrompido/perdido, como aconteceu uma vez nesta
  sessão).

## Arquitetura do motor de slides

- `lib/breakpoints.ts` — tamanhos de tela e a matemática de posição
  responsiva (Desktop = tamanho nativo do projeto; Notebook/Tablet
  1024×600; Celular 480×720).
- `app/admin/(app)/slides/[id]/editor.tsx` — o editor. Componente grande,
  tudo num arquivo só.
- `app/vitrine/[slug]/player.tsx` — o player público (dentro do iframe).
  Modo `?embed=1`: o `.vitrine-wrap` ocupa 100% da largura do iframe (pro
  fundo preencher telas largas), e as camadas ficam num
  `.vitrine-conteudo` interno com largura fixa e centralizado — só o
  fundo estica, o conteúdo não.
- `app/actions/editor.ts` — server actions (criar/editar/excluir/duplicar/
  reordenar/ocultar slide e camada).
- `middleware.ts` + `lib/session.ts` — autenticação do painel. A
  verificação de sessão roda no Edge Runtime e por isso é feita à mão com
  Web Crypto (`crypto.subtle`), **sem** a lib `jose` (ver histórico de
  bugs abaixo pro motivo). `lib/auth.ts` tem as funções que só rodam em
  contexto Node (usam `next/headers`) — criar/ler/limpar cookie de sessão.

## Recursos do editor já implementados

- Canvas com zoom 100% ou "Ajustar à tela"; régua de medidas.
- Camadas: Texto, Imagem, Botão (gradiente + cor de hover + link com
  opção de nova aba).
- Arrastar e redimensionar direto no canvas (mexe no DOM durante o
  movimento, só sincroniza com o React/servidor ao soltar o mouse).
- Painel de Camadas com ordem de empilhamento via `@dnd-kit` — o canvas
  agora **renderiza na mesma ordem** que a lista mostra (bug corrigido
  nesta sessão, ver histórico).
- **Slides**: reordenar (arrastar), ocultar/mostrar (some do carrossel
  publicado mas continua editável), duplicar (clona fundo + todas as
  camadas, insere logo depois do original).
- **Atalhos de teclado** (com uma camada selecionada, foco fora de campo
  de texto): `Delete`/`Backspace` exclui; `Ctrl+C`/`Ctrl+V` copia e cola
  (inclusive entre slides diferentes; colar no mesmo slide desloca
  +24px pra não nascer em cima da original).
- Responsivo por dispositivo (Desktop/Notebook-Tablet/Celular) com
  sobrescrita manual de posição/tamanho por camada.
- "🗺 Guias do site" — mostra onde ficam o menu, o selo Viva+ e a
  navegação reais do site, com layout próprio pra Desktop (menu lateral)
  e pra Notebook/Tablet/Celular (barra horizontal + hambúrguer).
- Aviso de qualidade de imagem (< 1.6× de folga pro tamanho que vai
  ocupar).
- Salvamento manual (botão "💾 Salvar", indicador "Alterações não
  salvas"/"✓ Tudo salvo") — ações estruturais (criar/excluir/duplicar/
  ocultar/reordenar slide ou camada) persistem na hora; edições de
  propriedade (posição, texto, cor...) só ao clicar Salvar.
- **Erros de salvamento não são mais silenciosos**: se algo falhar ao
  salvar (ex.: referenciar um registro que não existe mais no banco),
  aparece um aviso vermelho explícito com botão "Recarregar", em vez de
  simplesmente não persistir sem avisar.

## Bugs encontrados e corrigidos (histórico completo, não repetir)

### Sessão de deploy/infra
1. Build da Vercel falhava (`prisma generate` não rodava — cache de
   `node_modules`) → `postinstall`/`build` script rodando `prisma
   generate` explicitamente.
2. **Causa raiz de vários bugs de runtime**: o projeto na Vercel foi
   criado originalmente pro site estático e ficou com **Framework Preset
   = "Other"**, não "Next.js", em Project Settings → Build and
   Development. Isso fazia o build empacotar o middleware errado,
   puxando `ua-parser-js` interno do Next (via `next/server`) e
   referenciando `__dirname`, inexistente no Edge Runtime →
   `ReferenceError: __dirname is not defined`, `MIDDLEWARE_INVOCATION_FAILED`
   em qualquer rota `/admin/*`. Corrigido trocando o preset pra
   "Next.js". Isolado testando com um middleware vazio antes de achar a
   causa real — vale lembrar esse método se algo parecido acontecer de
   novo (bug reproduzível mesmo sem código nenhum nosso = configuração
   do projeto, não código).
3. Middleware usava `jose` (JWT) — funcionava local mas o build da
   Vercel especificamente resolvia o pacote errado (build node em vez de
   edge/browser) e quebrava em runtime. Trocado por verificação HS256
   manual com Web Crypto nativa (`lib/session.ts`), eliminando a
   dependência externa nesse caminho.
4. Import `@/lib/session` no middleware (alias TS) → trocado por import
   relativo (`./lib/session`) depois que o checker de Edge Function da
   Vercel reclamou do specifier antes de resolver o alias.
5. Banco era SQLite local (`prisma/dev.db`) — migrado pra Postgres
   (Supabase), criado projeto novo via browser, `db push` + seeds rodados
   contra o banco real.

### Sessão do editor
6. `location.reload()` depois de criar/excluir slide ou camada jogava
   fora qualquer edição pendente ainda não salva → trocado por
   atualização de estado local (igual todo o resto do editor já fazia).
7. Fundo do banner embutido (iframe da home) não preenchia telas mais
   largas que o design nativo (~1200px) — `.vitrine-wrap` tinha largura
   fixa em vez de 100%. Corrigido separando fundo (estica) de conteúdo
   (`.vitrine-conteudo`, largura fixa e centralizado).
8. Canvas do editor renderizava camadas na ordem antiga do array em vez
   da ordem de empilhamento (`order`) — depois de reordenar pela lista, o
   que ficava visualmente na frente não batia com o que a lista mostrava,
   e cliques em áreas sobrepostas caíam na camada errada. Corrigido
   ordenando por `order` antes de renderizar.
9. Clique fora de qualquer camada só desmarcava a seleção clicando
   exatamente no fundo do canvas (`target === currentTarget`) — clicar na
   régua ou no cinza ao redor não fazia nada. Trocado por
   `closest('.layer, .alca')`.
10. Adicionar um segundo `DndContext` (pras slides, além do já existente
    pras camadas) causava mismatch de hidratação do React
    (`aria-describedby` do dnd-kit gerado diferente no servidor e no
    cliente) por falta de `id` estável — corrigido com
    `id="dnd-slides"`/`id="dnd-camadas"`.
11. `salvarTudo` usava `Promise.all` — um item falhando derrubava o lote
    inteiro **sem avisar** (o botão só parava de dizer "Salvando…", nada
    persistia, e não tinha erro visível). Foi exatamente esse o bug que
    causou o incidente de dado perdido (ver aviso no topo). Trocado por
    `Promise.allSettled` + aviso explícito de erro; todos os handlers de
    criar/excluir/ocultar/duplicar têm try/catch com reversão da
    atualização otimista em caso de falha.
12. Testando atalho de colar (Ctrl+V) via automação: colava 2 cópias em
    vez de 1 — o navegador dispara `keydown` com `repeat:true` ao segurar
    a tecla. Corrigido ignorando eventos repetidos.

## Pendências conhecidas (ainda não implementadas)

- **Ctrl+Z (desfazer)**: não implementado. Se entrar nisso, sugestão é
  limitar a desfazer só edições de propriedade (posição/tamanho/texto/
  cor) via pilha de snapshots do estado local — não tentar desfazer ações
  estruturais (criar/excluir slide/camada), que já são imediatas no
  servidor.
- Alças de redimensionar de uma camada selecionada que está *atrás* de
  outra na pilha podem ficar visualmente cobertas — o clique não chega
  até a alça. Não confirmado se ainda reproduz depois do fix #8 acima
  (que mudou a ordem de renderização); revisar se voltar a acontecer.
- Responsivo do banner da home ainda sem ajustes manuais finos por
  camada em Tablet/Celular — herda o encolhimento automático.
- Qualidade de imagem: só o aviso (texto), sem redimensionamento/
  otimização automática.
- **Banco de dev separado**: ainda não decidido/feito (ver aviso no
  topo). Perguntar ao usuário se quer resolver isso antes de mexer mais
  no painel.

## Créditos/config úteis

- Supabase: projeto `lamic-admin`, ref `orzyufoyomfvhssmrtvw`, região
  `sa-east-1` (São Paulo). Connection strings em `.env`
  (`DATABASE_URL` = pooler porta 6543, `DIRECT_URL` = direta porta 5432).
- Vercel: projeto `lamic`, org `nolei98s-projects`. CLI já linkado nesta
  máquina (`vercel link` rodado, `.vercel/project.json` presente).
- `.env.example` documenta todas as variáveis necessárias pra rodar do
  zero em outra máquina.
