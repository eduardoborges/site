# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Site pessoal (eduardoborges.dev). Astro 5 estático, hospedado no Cloudflare Pages. Tooling via mise (node 25, pnpm 11).

## Comandos

```bash
pnpm install
pnpm dev        # dev server em localhost:4321
pnpm build      # build estático em dist/
pnpm preview    # serve o dist/
node scripts/ascii-portrait.mjs   # regenera src/components/ascii-portrait.html a partir de public/me-withoutbg.png
```

Sem testes e sem linter. Verificação é `pnpm build` + olhar no browser.

## Deploy

Push na `main` dispara o deploy via GitHub Actions (`.github/workflows/cd.yml`) → Cloudflare Pages.
`pnpm ship` existe só como fallback manual.

## Arquitetura

### Bilíngue (pt default, en em /en/)

- PT é servido na raiz (`/`, `/posts/...`); EN duplicado sob `src/pages/en/`. Não usa roteamento i18n do Astro além do config básico — as rotas EN são arquivos próprios.
- A home é um componente compartilhado (`src/components/Home.astro`) com prop `lang` e dicionário de strings inline. Header/Footer detectam o idioma pelo pathname.
- `Base.astro` cuida de `<html lang>`, og:locale, hreflang (só na home) e meta descriptions por idioma.

### Posts (content collection)

- Coleção única `posts` (`src/content.config.ts`, glob loader). Originais em PT na raiz de `src/content/posts/`, traduções EN em `src/content/posts/en/` com `lang: "en"` no frontmatter.
- **Pegadinha**: o glob loader usa o `slug` do frontmatter como id da entry, então filtrar por pasta (`id.startsWith('en/')`) NÃO funciona. Todo `getCollection('posts', ...)` deve filtrar por `data.lang` — senão posts EN vazam nas páginas PT e vice-versa.
- Tags (`/tags/...`) são só PT.

### Efeitos interativos (scripts inline, sem framework)

- **wght-hover** (`Base.astro`): quebra o texto de `h1/h2/h3/a` em spans `.wght-char` e modula `font-variation-settings 'wght'` pela distância ao cursor (elemento afina pra 100, zona do cursor engorda até 800, raio 60px, falloff sqrt). O `h1` do hero fica de fora (tem a própria animação de onda). Fonte mono variável = peso não desloca layout.
- **AsciiPortrait** (`src/components/AsciiPortrait.astro`): figura com cotas reais (calculadas do ascii no frontmatter) e chão hachurado. No load o `<pre>` vira canvas em três chapas, uma por canal de cor; uma "plotter" imprime de baixo pra cima com os canais defasados (atraso × 1.16, × 1, × 0.84) e as cotas se desenham quando ela termina (`.is-on`). Hover revela a foto real (`public/me-withoutbg.png`) célula a célula, com a borda da lente em três anéis que seguem o cursor com atraso. As linhas vazias do topo do ascii são cortadas e o `data-crop` mantém a foto alinhada. Fallback sem JS/reduced-motion: `<pre>` estático com as cotas.

### Prancha técnica

- A coluna de 800px é a prancha: grid milimetrado (10px e 100px) com as linhas no fim de cada célula, então bordas de caixas com medida múltipla de 10px caem em cima delas. Zonas 1 a 8 no topo e no pé, title block no rodapé.
- Cores: neutros mais três canais `--ch1..3`, só em linhas, nunca em texto. `--blend` é `screen` no escuro (RGB soma branco) e `multiply` no claro (CMY soma preto).
- Código: shiki com tema `css-variables`, cores em `--astro-code-*` no `main.css`. **Pegadinha**: trocar o tema no dev exige apagar `.astro/data-store.json`, senão o HTML em cache continua com o tema antigo.

### Lighthouse 100 em tudo (manter)

- Contraste: os tokens de texto em `src/styles/main.css` estão calibrados pra ≥4.5:1 sobre `--surface`, `--bg` e as linhas do grid, nos dois temas. Não escurecer `--muted`.
- `aria-label` deve conter o texto visível do elemento (regra label-content-name-mismatch).

## Convenções

- Copy é lowercase estilizado. Exceção: rótulos de anotação (títulos de seção da home, cabeçalho da tabela, title block, legenda da figura) ficam em caixa alta, como numa prancha.
- Commits sem atribuição a Claude/Anthropic.
