# eduardoborges.dev

meu blog pessoal. feito com [astro](https://astro.build), hospedado no [cloudflare pages](https://pages.cloudflare.com).

## rodando

```bash
pnpm install
pnpm dev
```

## deploy

push na `main` → github actions → cloudflare pages. automático.

## estrutura

```
src/
  content/posts/   ← posts em markdown
  pages/           ← rotas
  layouts/         ← layout base
  components/      ← header, footer
  styles/          ← css
public/            ← assets estáticos
```
