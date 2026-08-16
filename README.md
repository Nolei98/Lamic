# Laboratório LAMIC — site institucional

Site estático (HTML, CSS e JS puros, sem build) do Laboratório LAMIC — Análises Clínicas e Vacinas no Cariri.

## Estrutura

```
.
├── index.html          # Home
├── sobre.html           # Sobre o laboratório
├── exames.html          # Busca de exames
├── vacinas.html          # Sala de vacinas
├── convenios.html        # Convênios e cartões
├── unidades.html          # Unidades de coleta
├── assets/
│   ├── app.js            # Scripts do site (menu, busca, chat da Livia etc.)
│   └── estilo.css        # Estilos
├── dados/
│   └── exames.js         # Base local com os 1.582 exames (mnemônico, sinonímia, jejum, preparo)
├── img/                   # Imagens do site
└── LIVIA.md               # Documentação da integração com a assistente virtual Livia
```

## Rodando localmente

Como é um site 100% estático, basta servir a pasta com qualquer servidor HTTP simples:

```bash
npx serve .
# ou
python3 -m http.server 8000
```

## Deploy na Vercel

1. Importe este repositório no [Vercel](https://vercel.com/new).
2. Framework preset: **Other** (site estático, sem build step).
3. Build Command: vazio. Output Directory: `.` (raiz do repositório).
4. Deploy — a cada push na branch `main` a Vercel publica automaticamente.

## Assistente virtual (Livia)

Veja [`LIVIA.md`](./LIVIA.md) para detalhes de como o widget de chat está integrado e como trocar a URL do atendimento.
