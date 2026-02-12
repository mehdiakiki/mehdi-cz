# mehdi-cz

Personal website and technical blog of Mehdi Akiki, built with Next.js, TypeScript, Tailwind CSS, and MDX.

## Website

The website is available at [mehdi.cz](https://www.mehdi.cz).

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Contentlayer + MDX (blog content)
- Pliny (search, newsletter, comments, analytics helpers)

## Features

- Blog with pagination and tag pages
- SEO metadata, sitemap, and robots route
- RSS feed generation (`/feed.xml` + per-tag feeds)
- Contact page with Formspree integration
- Newsletter endpoint using Buttondown
- Optional Umami analytics and Giscus comments
- Dockerized production deployment
- GitHub Pages static export workflow

## Project Routes

- `/` Home/About
- `/blog` Blog index
- `/blog/page/[page]` Paginated blog pages
- `/blog/[...slug]` Individual blog post pages
- `/blog/tags/[tag]/page/[page]` Tag pages
- `/work` Projects/work page
- `/hire` Services page
- `/contact` Contact page
- `/api/newsletter` Newsletter endpoint (server mode)

## Local Development

### Prerequisites

- Node.js 20+
- Yarn Classic (`1.22.x`)

### Setup

```bash
yarn install
cp .env.example .env
```

Fill `.env` values as needed.

### Run

```bash
yarn dev
```

Open `http://localhost:3000`.

## Environment Variables

See `.env.example`.

Required for full functionality:

- `BUTTONDOWN_API_KEY`
- `NEXT_PUBLIC_FORMSPREE_KEY`

Optional:

- `NEXT_UMAMI_ID`
- `NEXT_PUBLIC_GISCUS_REPO`
- `NEXT_PUBLIC_GISCUS_REPOSITORY_ID`
- `NEXT_PUBLIC_GISCUS_CATEGORY`
- `NEXT_PUBLIC_GISCUS_CATEGORY_ID`

## Scripts

- `yarn dev` Start dev server
- `yarn build` Production build + postbuild RSS generation
- `yarn serve` Start production server
- `yarn lint` Lint and autofix
- `yarn analyze` Build with bundle analyzer

## Content Management

- Blog posts live in `data/blog/*.mdx`
- Author data lives in `data/authors/*.mdx`
- Site-wide metadata lives in `data/siteMetadata.js`
- Navigation links live in `data/headerNavLinks.ts`

After editing content, run:

```bash
yarn build
```

This regenerates:

- `app/tag-data.json`
- `public/search.json`
- RSS feeds under `public/`

## Deployment

### 1) GitHub Pages (Static Export)

The workflow is already configured in `.github/workflows/pages.yml`.

On push to `main`, it runs:

- `EXPORT=1`
- `UNOPTIMIZED=1`
- static export to `out/`

Notes:

- API routes are not usable in static export mode.
- Use server hosting for newsletter/contact backend behavior.

### 2) Docker

Build and run:

```bash
docker build -t mehdi-blog .
docker run -d --name mehdi-blog -p 3000:3000 --env-file .env mehdi-blog
```

Or use Docker Compose:

```bash
docker-compose up -d --build
```

## Repository Conventions

- Commit messages use `verb:message` format.
- Example: `fix:sitemap tag route generation`

## Useful Docs In Repo

- `DEPLOYMENT.md`
- `DOCKER_TEST_RESULTS.md`

## License

This repository currently does not include a license file.
