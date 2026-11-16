# GitHub Pages demo

The live demo at https://mso-docs.github.io/Docs-Navigator-MCP-SUSE-Edition/ is a static copy of `public/`.
It has no backend. The page searches a snapshot of real documentation pages, `public/demo-data/index.json`, with BM25 in the browser.

## What the demo does and doesn't do

- Search works across all eight sources, in the browser, on the snapshot.
- Ask shows the best matching passages. A sample answer on the page shows what a live answer looks like.
- Summarize, indexing, and AI answers need the server. Clone the repo to use them.

## Enable it

In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**. The workflow in `.github/workflows/deploy-pages.yml` runs the tests and publishes `public/` on every push to `main`.

## Refresh the snapshot

```bash
npm ci
npm run build-demo      # crawls a few dozen pages per source into public/demo-data/index.json
npm run build-sample    # rewrites public/demo-data/sample.json
```

`build-sample` quotes the best-matching passage by default. To have an open model write the sample answer instead:

```bash
AI_PROVIDER=huggingface HF_TOKEN=hf_... npm run build-sample
```

The token needs the “Make calls to Inference Providers” permission. Commit the two JSON files.
