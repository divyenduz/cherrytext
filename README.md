# CherryText.com

Find typos and writing improvements in your documentation and get suggestions to fix them.

## Example Usage

- [https://cherrytext.com/analyse/?url=https://xata.io/docs/getting-started/workflow](https://cherrytext.com/analyse/?url=https://xata.io/docs/getting-started/workflow)

## Development

```sh
cp _.dev.vars.example .dev.vars
cp _.env.example .env
pnpm install
pnpm run typegen
pnpm run dev
```

## Deployment

Then, deploy your app to Cloudflare Pages:

```sh
pnpm run deploy
```
