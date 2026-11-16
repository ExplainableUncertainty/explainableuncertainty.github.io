# Explainable Uncertainty Quantification — Explorer

An interactive companion website for the paper
**"Explainable Uncertainty Quantification: A Systematic Literature Review, Novel Definition, and Future Directions"** (ACM Computing Surveys).

The site makes the paper's taxonomy and its review of 53 papers browsable through two explorers:

- **Paper Explorer** — browse the 53 reviewed papers by domain, modality, uncertainty type, UQ method, explanation output type, evaluation, and more.
- **Category Explorer** — explore the taxonomy dimensions (ML Tasks, XUQ Methods, XUQ Evaluation) and the paper's novel definition.

Built with [Astro](https://astro.build) (static output, no runtime JS framework).

---

## Repository layout

```
.
├── package.json          # Root wrapper — forwards npm commands to site/
├── README.md
├── scripts/
│   └── preprocess_papers.py  # Data pipeline: CSV + BibTeX → site/src/data/papers.json
├── requirements.txt      # Python deps for the data pipeline
├── data/                 # Source data (CSV + BibTeX) — NOT committed
├── paper/                # Paper PDF — NOT committed
├── site/                 # The Astro website
│   ├── package.json
│   ├── astro.config.mjs
│   ├── public/
│   └── src/
└── .github/workflows/    # CI + GitHub Pages deploy
```

---

## Prerequisites

- **Node.js ≥ 22.23.4** (the site pins this version)
- **Python 3** (only needed to regenerate the data from the CSV/BibTeX)

---

## Local development

Install the site dependencies:

```sh
npm install --prefix site
```

Start the dev server:

```sh
npm run dev
```

Open http://localhost:4321.

Other commands (all forwarded to `site/`):

| Command            | Action                                        |
| :----------------- | :-------------------------------------------- |
| `npm run dev`      | Start the dev server at `localhost:4321`      |
| `npm run build`    | Build the production site to `site/dist/`     |
| `npm run preview`  | Preview the production build locally          |

---

## Regenerating the data

The site reads `site/src/data/papers.json`, which is generated from the raw
review data by `scripts/preprocess_papers.py`. If you update the source files
in `data/`, regenerate the JSON:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 scripts/preprocess_papers.py
```

This merges `data/df_struc_copy.csv` (one-hot paper flags) with
`data/included_papers.bib` (bibliographic metadata) into
`site/src/data/papers.json`.

---

## Deploying to GitHub Pages

The site is configured to deploy as a **GitHub Pages user site**, served at the
domain root (no `/repo-name` path). For that to work, the repository must be
named exactly:

```
explainable_uncertainty.github.io
```

### One-time setup

1. Create a GitHub repository named `explainable_uncertainty.github.io`.
2. Push this project to it (default branch `main`).
3. In the repo: **Settings → Pages → Build and deployment → Source: "GitHub Actions"**.
4. Confirm `site/astro.config.mjs` has `site` set to
   `https://explainable_uncertainty.github.io` and `base` set to `/`.

### Deploying

Push to `main` (or run the workflow manually from the **Actions** tab). The
`Deploy to GitHub Pages` workflow builds the site and publishes it to:

```
https://explainable_uncertainty.github.io
```

The `CI` workflow runs on pull requests: it installs dependencies, runs
`npm audit` (fails on high/critical vulnerabilities), and verifies the build.

---

## Docker (optional)

A `Dockerfile` is included for running the built site anywhere Docker runs
(e.g. a local device at an event, independent of GitHub Pages):

```sh
docker build -t xuq-explorer .
docker run --rm -p 4321:4321 xuq-explorer
```

Then open http://localhost:4321.