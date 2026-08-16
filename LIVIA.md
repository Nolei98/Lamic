# Integração da Livia (assistente virtual)

O robozinho flutuante deixou de ser um menu simulado: agora ele abre a conversa real da
**Livia** — `https://livia.app.online24por7.ai`.

## Como está montado

- **HTML** (todas as páginas, gerado por `etapa4.py`): dentro de `#botPainel` existe
  `<div class="corpo livia">` com um `<iframe id="liviaFrame" data-src="https://livia.app.online24por7.ai">`.
  O atributo é `data-src`, **não** `src`.
- **JS** (`assets/app.js`, bloco `/* ===== chat da Livia ===== */`): o `src` só é preenchido
  quando a pessoa abre o painel. Isso evita peso no carregamento da página e não cria
  cookie de terceiro antes da interação (LGPD).
- **CSS** (`assets/estilo.css`): `.livia-frame`, `.livia-carregando`, `.livia-alt`, `.livia-pe`.
- Enquanto carrega aparece o anel com "Abrindo a conversa com a Livia…".
  Se em 6 s o `load` não acontecer, entra a tela alternativa com o botão
  "Abrir a conversa" em nova aba.
- No pé do painel ficam sempre dois atalhos: **Abrir em tela cheia** (a mesma URL da Livia)
  e **Falar com atendente** (WhatsApp humano).

## Trocar a URL

Em `etapa4.py`:

```python
LIVIA = "https://livia.app.online24por7.ai"
```

Rode `python3 etapa5.py` para regerar as páginas. Sem o gerador, basta um find/replace do
`data-src` nos seis arquivos `.html`.

## Se a plataforma bloquear o embed

Algumas plataformas enviam `X-Frame-Options: DENY` ou `Content-Security-Policy: frame-ancestors`,
o que impede abrir a conversa dentro de um iframe. Nesse caso:

1. Peça ao suporte da Online24por7 para liberar o domínio
   `laboratoriolamic.com.br` em `frame-ancestors`; **ou**
2. Peça o **script oficial do widget**. Se existir, ele substitui o iframe: cole a tag
   `<script>` antes de `</body>` e no `app.js` troque a função `iniciaChat` por uma chamada
   ao método de abertura do widget (algo como `window.Livia.open()`), mantendo o botão
   flutuante como disparador; **ou**
3. Deixe apenas o modo "tela cheia": no `app.js`, dentro de `iniciaChat`, chame
   `mostraAlternativa()` na primeira linha — o painel passa a mostrar direto o convite
   com o botão que abre a conversa em outra aba.

## Recomendações de conteúdo para a Livia

Para a assistente responder bem, alimente a base dela com o que já está neste pacote:

- `dados/exames.js` — os 1.582 exames com mnemônico, sinonímia, jejum e preparo.
- As 25 vacinas de `vacinas.html` (texto clínico original, não reescrever).
- As 13 unidades de `unidades.html` com endereço, telefone e WhatsApp.
- Convênios e cartões de `convenios.html`.
- Regra fixa: **resultado de exame só pelo portal** `laboratoriolamic.uniexames.com.br`;
  a Livia nunca deve pedir CPF, senha ou dados de saúde no chat.
