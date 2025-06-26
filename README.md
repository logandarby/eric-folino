# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages with the following features:

### Automatic Deployment

- Pushes to the `main` branch automatically trigger a build and deployment
- GitHub Actions workflow includes linting, circular dependency checks, and building
- The site is deployed to: `https://[username].github.io/eric-folino/`

### Manual Deployment

You can also deploy manually using:

```bash
npm run deploy
```

### Pre-commit Hooks

Husky is configured with pre-commit hooks that run:

- ✨ **Pretty-quick**: Automatically formats staged files
- 🔍 **ESLint**: Lints code for potential issues
- 🔄 **Circular dependency check**: Ensures no circular imports
- 🏗️ **Build**: Verifies the project builds successfully

### Configuration

- **Base URL**: `/eric-folino/` (configured in `vite.config.ts`)
- **Build output**: `dist/` directory
- **Node version**: 18 (GitHub Actions)

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```

```
