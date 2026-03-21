# CLAUDE.md

This file provides guidance for AI assistants working with this codebase.

## Project Overview

A minimal React 18 starter application bootstrapped with Create React App. The `App.js` component is intentionally empty — this is a skeleton ready for feature implementation.

- **Origin:** StackBlitz template (`https://stackblitz.com/~/github.com/kirkbradford0/react-9pwbq2sd`)
- **Package name:** `react` (v0.0.0)

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18.1 |
| Rendering | React DOM 18.1 (createRoot / Concurrent Mode) |
| Build / Dev Server | Create React App (`react-scripts`) |
| Language | JavaScript (ES6+, no TypeScript) |
| Styling | Plain CSS (`src/style.css`) |
| Testing | Jest + jsdom (via `react-scripts test`) |
| Package Manager | npm |

## Repository Structure

```
react-9pwbq2sd/
├── public/
│   └── index.html          # HTML template — root <div id="root">
├── src/
│   ├── index.js            # Entry point — mounts <App /> with createRoot
│   ├── App.js              # Main component — currently empty, add features here
│   └── style.css           # Global styles — system font stack for h1, p
├── .gitignore              # Ignores node_modules
├── package.json
└── README.md
```

## Development Commands

```bash
npm start        # Start development server (hot reload)
npm test         # Run Jest tests in watch mode (jsdom environment)
npm run build    # Production build to /build
npm run eject    # Eject from CRA (irreversible — avoid unless necessary)
```

## Key Conventions

### Entry Point
`src/index.js` uses the React 18 `createRoot` API wrapped in `<StrictMode>`:
```js
const root = createRoot(document.getElementById('root'));
root.render(<StrictMode><App /></StrictMode>);
```
Do not downgrade to the legacy `ReactDOM.render` API.

### Component Development
- Add all application code inside or imported from `src/App.js`
- Use functional components and hooks (no class components)
- No state management library is installed — use React's built-in `useState`/`useReducer`/`useContext` unless a library is explicitly added

### Styling
- Global styles live in `src/style.css`
- No CSS Modules, styled-components, or Tailwind are configured
- Import CSS files directly in the component that owns them (`import './style.css'`)

### Testing
- Test files should be colocated with source files as `*.test.js` or placed in `__tests__/`
- Run with: `npm test`
- The jsdom environment is pre-configured — no additional setup needed for DOM assertions

### Adding Dependencies
- Use `npm install <package>` — no yarn or pnpm
- Do not eject from CRA unless a build customisation is strictly required and cannot be achieved via `CRACO` or similar

## Git Workflow

- **Active development branch:** `claude/add-claude-documentation-axv3o`
- **Default branch:** `master` / `main`
- Commit messages should be short and imperative (e.g., `Add login form`, `Fix button styles`)
- There is only one commit so far (`Initial commit`) — the project is at day zero

## Notes for AI Assistants

- `App.js` is empty by design — do not assume it has existing logic before reading it
- No linting or formatting config is present; CRA defaults apply (ESLint via `eslint-config-react-app`)
- No environment variables (`.env`) exist yet — follow CRA convention (`REACT_APP_*` prefix) when adding them
- There are no existing tests — write tests alongside any new features
