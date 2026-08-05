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
- **AsciiPortrait** (`src/components/AsciiPortrait.astro`): o `<pre>` ascii pré-gerado vira canvas no load; hover revela a foto real (`public/me-withoutbg.png`) num círculo difuso seguindo o cursor, com a borda da silhueta do PNG emplumada via blur + `source-in`. Fallback sem JS/reduced-motion: `<pre>` estático.

### Lighthouse 100 em tudo (manter)

- Contraste: `--muted` em `src/styles/main.css` está calibrado pra ≥4.5:1 sobre `--surface`. Não escurecer.
- `aria-label` deve conter o texto visível do elemento (regra label-content-name-mismatch).

## Convenções

- Todo o copy do site é lowercase estilizado.
- Commits sem atribuição a Claude/Anthropic.
