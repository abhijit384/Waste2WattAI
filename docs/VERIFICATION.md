# Scaffold verification

Local verification on 2026-10-08 in `E:\Waste2WattAI`.

## Toolchain

- Node.js 24.16.0; npm 11.13.0; Python 3.14.6.
- TypeScript 5.9.3; React 19.3.0; Vite 7.3.7; Tailwind CSS 4.3.3.
- ESLint 10.12.0; typescript-eslint 8.71.1; Prettier 3.9.9; Ruff 0.14.0.
- Exact JavaScript dependency resolutions are recorded in `package-lock.json`.

## Checks

- `npm run check`: shared declarations, TS workspace/test typechecks, ESLint,
  Prettier, Node/Python tests, and all four workspace builds.
- One Node API boundary test and two Python placeholder tests.
- `.\.venv\Scripts\python -m ruff check .` and Ruff formatting check.
- Repository file inventory, package dependency inspection, and `git diff --check`.

The initial ESLint 9 install emitted an unsupported-version warning; ESLint and
`@eslint/js` were upgraded to major 10, supported by the installed typescript-eslint.
The final checks use that updated toolchain.

The frontend build emits local HTML/CSS/JavaScript in `apps/web/dist`. Shared/API/infra
TypeScript outputs are local ignored `dist` directories. `node_modules`, `.venv`,
Ruff cache, and npm/pip download cache are inside the project and ignored by Git.

Validation covers scaffold compilation, formatting, and explicit unimplemented
behavior. No browser interaction, AWS integration, scientific model, cloud resource,
security implementation, or deployment is validated or claimed.
