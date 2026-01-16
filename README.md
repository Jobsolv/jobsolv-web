# Jobsolv Web

The official website for [Jobsolv](https://www.jobsolv.com) - an AI-powered resume tailoring and job tracking platform.

## 🚀 Tech Stack

- **[Astro](https://astro.build/)** - Static site generator
- **[MDX](https://mdxjs.com/)** - Markdown with JSX support for blog content
- **TypeScript** - Type safety

## 📁 Project Structure

```
jobsolv-web/
├─ src/
│  ├─ pages/          # Routes and pages
│  ├─ layouts/         # Page layouts
│  ├─ components/      # Reusable components
│  ├─ content/         # Content collections (blog posts)
│  ├─ assets/          # Images and other assets
│  └─ utils/           # Utility functions
├─ public/             # Static assets
├─ astro.config.mjs    # Astro configuration
├─ package.json
└─ tsconfig.json
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:4321` to view your site.

### Build

Build the site for production:

```bash
npm run build
```

### Preview

Preview the production build locally:

```bash
npm run preview
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run astro` - Run Astro CLI commands

## 🌐 Site Configuration

The site is configured to deploy to `https://www.jobsolv.com`. This is set in `astro.config.mjs`.

## 📚 Content

- **Blog posts**: Located in `src/content/blog/`
- **Pages**: Located in `src/pages/`
- **Components**: Located in `src/components/`

## 🔧 Integrations

- `@astrojs/mdx` - MDX support for blog content
- `@astrojs/sitemap` - Automatic sitemap generation
