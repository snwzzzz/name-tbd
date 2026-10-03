# name-tbd: a visual app builder

name-tbd is a low-code builder for small web apps. You place widgets on pages, wire them up with workflows, connect them to data, and export the whole thing as **one HTML file that runs on its own**: no server, no install, even opened straight from disk.

This document explains the whole system: how the repository is laid out, how the editor, the backend and the exported app fit together, what happens step by step when you edit, preview and export, and how to extend each part.

---

## Contents

1. [The big picture](#1-the-big-picture)
2. [Repository layout](#2-repository-layout)
3. [Getting started](#3-getting-started)
4. [Core ideas](#4-core-ideas)
5. [The domain model](#5-the-domain-model)
6. [The shared widget catalog](#6-the-shared-widget-catalog)
7. [The frontend](#7-the-frontend)
8. [The runtime core](#8-the-runtime-core)
9. [The exported app (runtime build)](#9-the-exported-app-runtime-build)
10. [The backend](#10-the-backend)
11. [The export pipeline](#11-the-export-pipeline)
12. [The app definition format](#12-the-app-definition-format)
13. [End-to-end workflows](#13-end-to-end-workflows)
14. [Styling and design tokens](#14-styling-and-design-tokens)
15. [Extending the system: recipes](#15-extending-the-system-recipes)
16. [Testing](#16-testing)
17. [The generated API client](#17-the-generated-api-client)
18. [Conventions](#18-conventions)
19. [Known limitations and roadmap](#19-known-limitations-and-roadmap)

---

## 1. The big picture

```
                         shared/widget-catalog.json
                    (the one list of widget types + props)
                      │                              │
          read at build time                 read at startup
                      ▼                              ▼
┌──────────────────────────────────────┐   ┌──────────────────────────────────────┐
│  name-tbd/  (Angular 21)             │   │  ntbd/  (Spring Boot 4, Java 21)     │
│                                      │   │                                      │
│  ┌────────────┐   ┌───────────────┐  │   │  REST API ── services ── JPA ── DB   │
│  │  Editor    │   │ Runtime core  │  │   │                                      │
│  │ (project   │──▶│ widgets,      │  │   │  Export pipeline:                    │
│  │  name-tbd) │   │ workflow      │  │   │   AppDefinitionService               │
│  └────────────┘   │ engine, ports │  │   │     └─ contributors (pages, data)    │
│        │          └───────────────┘  │   │   ExportFormat (single-file HTML)    │
│        │                 ▲           │   │     └─ inlines the runtime build     │
│        │          ┌───────────────┐  │   │                                      │
│        │          │ Runtime app   │  │   └──────────────────────────────────────┘
│        │          │ (project      │  │                    ▲        │
│        │          │  runtime)     │──┼── npm run build:runtime     │ export.html
│        │          └───────────────┘  │    → ntbd/.../export-runtime│
│        │      HTTP (generated client)│                    │        ▼
└────────┼─────────────────────────────┘                    │   ┌──────────────┐
         └──────────────────────────────────────────────────┘   │ Exported app │
                                                                │ (any browser)│
                                                                └──────────────┘
```

Three things run:

| Part | Where | What it is |
|---|---|---|
| **Editor** | `name-tbd/` (Angular project `name-tbd`) | The builder UI: canvas, workflow editor, data manager, properties, preview. |
| **Backend** | `ntbd/` | Stores applications, pages, widgets, workflows and data. Builds and packages exports. |
| **Exported app** | `name-tbd/src/runtime/` (Angular project `runtime`) | A small Angular app that runs any app definition. The backend inlines it into every export. |

The editor's preview and the exported app run **the same widget components and the same workflow engine** (the runtime core). Only the adapters around them differ (see [Core ideas](#4-core-ideas)).

---

## 2. Repository layout

```
name-tbd/                     ← repository root
├── shared/
│   └── widget-catalog.json   ← THE widget registry, read by frontend + backend
├── name-tbd/                 ← frontend (Angular 21 workspace, two projects)
│   ├── angular.json          ← projects "name-tbd" (editor) and "runtime" (exported app)
│   ├── tsconfig.runtime.json
│   └── src/
│       ├── app/              ← editor + runtime core
│       │   ├── core/         ← runtime core (shared by editor preview and export)
│       │   ├── widgets/      ← widget components (part of the runtime core)
│       │   ├── editor/       ← editor shell pieces (navbar, sidebars, panels, editors)
│       │   ├── pages/        ← editor screens (canvas, workflow editor, data, start)
│       │   ├── components/   ← generic UI components (button, select, modals…)
│       │   ├── _services/    ← editor state services
│       │   ├── _constants/   ← editor registries and constants
│       │   ├── _directives/  ← base classes (BaseWidget, BasePropEditor, …)
│       │   ├── _types/  _utils/  _styles/
│       │   └── api/          ← GENERATED OpenAPI client (do not edit by hand)
│       ├── runtime/          ← the exported app (bootstrap, shell, routing, adapters)
│       ├── styles.scss       ← editor global styles
│       └── main.ts           ← editor bootstrap
└── ntbd/                     ← backend (Spring Boot 4, Maven)
    ├── pom.xml               ← also copies ../shared into the classpath
    └── src/
        ├── main/java/com/example/ntbd/
        │   ├── catalog/      ← reads shared/widget-catalog.json
        │   ├── export/       ← app definition + export formats
        │   ├── workflow/     ← server-side flow engine (Condition/Email/Webhook)
        │   ├── datasource/   ← tabular data parsers (CSV)
        │   ├── controller/ service/ persistence/ domain/ dto/ mapper/ commands/
        │   └── config/       ← CORS, security
        ├── main/resources/
        │   ├── db/migration/ ← Flyway migrations
        │   └── export-runtime/  ← runtime build output (gitignored, generated)
        └── test/             ← JUnit tests (+ a stand-in runtime in resources)
```

---

## 3. Getting started

### Prerequisites

- **Node.js** with npm (the workspace pins `npm@11`)
- **Java 21** (the Maven wrapper is included)
- **Docker**, for the local PostgreSQL started by Testcontainers

### Run the backend

The backend runs through `TestNtbdApplication` (in `ntbd/src/test/java`). It starts the normal application plus a **PostgreSQL 17 container** via Testcontainers, and Flyway creates the schema and test data.

- From your IDE: run `TestNtbdApplication`.
- From the command line (inside `ntbd/`): `./mvnw spring-boot:test-run`

The API listens on `http://localhost:8080`. Swagger UI is served by springdoc (`/swagger-ui.html`), and the raw spec at `/v3/api-docs`.

### Sign-in

Users sign in with Google or Microsoft (OIDC). The backend starts without credentials, but signing in needs them, as environment variables:

| Variable | What it is |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | An OAuth client from Google Cloud. Redirect URI: `http://localhost:4200/login/oauth2/code/google` |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | An app registration in Microsoft Entra. Redirect URI: `http://localhost:4200/login/oauth2/code/microsoft` |
| `MICROSOFT_TENANT` | Optional: one tenant id instead of `common` (any Microsoft account) |
| `APP_FRONTEND_URL` | Where the editor runs (default `http://localhost:4200`); sign-in returns there |

The redirect URIs use the editor's origin because `ng serve` proxies the login paths to the backend. Sign-in starts at `/oauth2/authorization/google` (or `microsoft`); `GET /api/me` returns the signed-in user and their workspaces, and `POST /logout` signs out.

Every API request needs a signed-in user (`SecurityConfig`); without one the answer is `401`. The session is an `HttpOnly` cookie. Writes need the CSRF token: the backend sets it as the `XSRF-TOKEN` cookie and Angular's `HttpClient` sends it back as the `X-XSRF-TOKEN` header, which only works for same-origin requests (hence the proxy). CORS is off unless `APP_CORS_ALLOWED_ORIGINS` lists origins. On HTTPS, set `SESSION_COOKIE_SECURE=true`. In local development (`app.security.public-api-docs` in the test configuration) the OpenAPI spec and Swagger UI stay open, so the API client can be generated.

### Run the editor

```bash
cd name-tbd
npm install
npm start            # builds the runtime once, then serves the editor
```

Open `http://localhost:4200/editor`. The editor calls the API on its own origin (`API_BASE_URL` in `_constants/api.constants.ts` is empty); `ng serve` proxies `/api` and the login paths to `http://localhost:8080` (`name-tbd/proxy.conf.json`). A deploy does the same with one reverse proxy in front of both.

### npm scripts

| Script | What it does |
|---|---|
| `npm start` | `ng build runtime` once, then `ng serve name-tbd` (the editor, with live reload). |
| `npm run build` | Production build of the editor (`dist/name-tbd`). |
| `npm run build:runtime` | Production build of the exported app into `ntbd/src/main/resources/export-runtime/`. |
| `npm run watch:runtime` | The same, rebuilding on every change. Use it while working on widgets or the runtime. |
| `npm test` | All frontend specs (Vitest, via `ng test`). Add `--watch=false` for a single run. |

The workspace has two projects, so plain `ng build` asks which one. The npm scripts already name it.

### When do I need `build:runtime`?

Only when the **code** of the exported app changes: widgets, workflow actions, the runtime shell. Your pages, data and workflows are read fresh from the database on every export.

The backend looks for the runtime build in several places, in order (`ntbd.export.runtime-locations`):

1. `file:src/main/resources/export-runtime/` (backend started from `ntbd/`)
2. `file:ntbd/src/main/resources/export-runtime/` (backend started from the repo root)
3. `classpath:export-runtime/` (a packaged jar)

During development, the backend therefore uses a fresh runtime build **without a restart**.

---

## 4. Core ideas

### 4.1 One registry for everything: the widget catalog

`shared/widget-catalog.json` lists every widget type with its name, icon, category, default size and settings ("props"). Both sides read it:

- **Frontend** (imported at build time):
  - the palette (component list)
  - the properties panel
  - the default props of new widgets
  - the runtime's prop defaults
- **Backend** (on the classpath, loaded at startup):
  - the props endpoint
  - the default props of components
  - the default props written into exports

Nothing about a widget type's settings is defined anywhere else.

### 4.2 Ports and adapters: one runtime core, two hosts

Widgets and workflow actions never touch editor state directly. They inject **ports**, the interfaces in `core/ports/app-ports.ts`:

| Port | Purpose |
|---|---|
| `APP_DATA` | Data sources, their rows, and changes to them |
| `APP_PAGES` | The app's pages (id, name, path, layout flag) |
| `APP_NAVIGATION` | The current page and opening another one |
| `APP_SESSION` | Whether the app is "live" (reacts to clicks, runs workflows), and on which page |
| `APP_LAYOUT` | Each page's widgets, plus temporary prop overrides from workflows |
| `WORKFLOW_SOURCE` | Each page's workflow graph |

Each host provides **adapters** for these ports:

```
                    ┌────────────────────── runtime core ─────────────────────┐
                    │  widgets/*   core/workflow/*   core/rendering/*          │
                    │              inject APP_DATA, APP_SESSION, …             │
                    └───────────────▲───────────────────────────▲─────────────┘
                                    │                           │
           editor/runtime-adapters/                 runtime/app/runtime-adapters.ts
           editor-runtime.providers.ts              (exported app)
           ─ data: backend data, or the preview's   ─ data: embedded snapshot +
             copy while previewing                    browser storage
           ─ pages: PagesStateService               ─ pages: the app definition
           ─ navigation: editor tabs                ─ navigation: the Angular router
           ─ session: live while previewing         ─ session: always live
           ─ layout: LayoutStateService             ─ layout: definition + overrides
           ─ workflows: WorkflowStateService        ─ workflows: from the definition
```

This is why the export behaves exactly like the preview: it *is* the same code.

### 4.3 A hard boundary

`core/runtime-boundary.spec.ts` reads the source files of `core/`, `widgets/`, `_directives/base-widget.directive.ts` and `src/runtime/`. It fails the build if any of them imports:

- editor state (`_services/`, except `_services/modal/`)
- editor UI (`editor/`, `pages/`)
- the backend client (`api/`)
- editor-only registries (`widget-registry`, `prop-editors`, `workflow` constants)

Anything the runtime needs from its surroundings must go through a port.

### 4.4 Open/closed everywhere: registries

New behavior is added by **adding an entry to a registry**, not by editing switch statements:

| Registry | File | Holds |
|---|---|---|
| Widget catalog | `shared/widget-catalog.json` | Widget types, sizes, props |
| `WIDGET_COMPONENTS` | `core/rendering/widget-components.ts` | Type → Angular component |
| `WIDGET_ICONS` | `_constants/widget-registry.constants.ts` | Icon name → Lucide icon |
| `PROP_EDITORS` | `_constants/prop-editors.constants.ts` | Custom prop type → editor component |
| `ACTION_TYPES` | `_constants/workflow.constants.ts` | Workflow actions as the editor offers them |
| `ACTION_HANDLERS` | `core/workflow/action-handlers.ts` | Action id → handler (what it does) |
| `TABLE_OPERATIONS` | `core/workflow/actions/table/table-operations.ts` | Operations of the "Table action" |
| `WIDGET_TRIGGERS` | `core/workflow/widget-triggers.ts` | Widget events that can start a flow |
| `SIDEBAR_TABS` | `_constants/sidebar-tabs.constants.ts` | Sidebar panels |
| `KEYBOARD_SHORTCUTS` | `_constants/keyboard-shortcuts.constants.ts` | Editor shortcuts |
| `TEXT_SIZES` | `core/rendering/text-sizes.ts` | Text size presets → design tokens |
| `TabularDataParser` beans | `ntbd/.../datasource/` | Import formats (CSV) |
| `AppDefinitionContributor` beans | `ntbd/.../export/definition/` | Sections of the app definition |
| `ExportFormat` beans | `ntbd/.../export/format/` | How exports are packaged |
| `NodeHandler` beans | `ntbd/.../workflow/` | Server-side workflow node types |

The recipes in [section 15](#15-extending-the-system-recipes) walk through each one.

---

## 5. The domain model

```
Workspace ─┬─ WorkspaceMember (user, role: OWNER / EDITOR / VIEWER)
           └─ Application (below)

User ─ UserIdentity (issuer + subject: one way to sign in)

Application ─┬─ Branch ─┬─ Page ─┬─ UiComponent ─┬─ UiComponentProperty (key → value, text)
  (title)    │ (name,   │ (name, │  (type, x, y, │
             │ version) │ path,  │   w, h,       └─ children (UiComponent, via parent)
             │          │ layout)│
             │          │        └─ Workflow ─┬─ Node (type, x, y, props as JSON)
             │          │                     └─ Edge (source node + port → target node)
             │          └─ DataSource ─┬─ DataSourceColumn (index, name)
             │             (name,      └─ DataSourceRow (index) ─ DataSourceCell (value)
             │              format)
             └─ VersionControl
User (creator of branches)
```

- **User**: a person who signs in with an identity provider (Google, Microsoft). There are no passwords. A **UserIdentity** links the provider's `issuer` and `subject` to the user; a second provider joins the same user only if it reports the email as verified.
- **Workspace**: where applications live. Each user gets a personal workspace on first sign-in; **WorkspaceMember** gives a user a role in a workspace.

- **Application**: an app being built, with a title, in one workspace. The app's name in exports.
- **Branch**: a line of work on an application. **Pages, workflows and data sources belong to a branch**, and an export is always *of a branch*. The editor currently works on the seeded branch `-1` (`EDITOR_BRANCH_ID`).
- **Page**: a screen with a `name` and a `path` (its address in the exported app). One page per branch can be the **layout page** (`layout = true`): its widgets (navbar, sidebar, …) appear around every other page.
- **UiComponent**: a placed widget.
  - `type` is a catalog type.
  - Its position and size `x, y, w, h` are in **grid cells** (see below).
  - It can have a `parent` (containers hold children).
  - Its props are stored as rows of `UiComponentProperty` (text values).
- **Workflow**: each page has (at most) one workflow, created on first access. Its **nodes** have a `type` (`Trigger`, `Condition`, `Action`), a position in the workflow editor, and their settings as a JSON `props` map. **Edges** connect a node's output port to another node.
- **DataSource**: imported tabular data (CSV), stored normalized as columns, rows and cells. The editor works with it as `columns: string[]` plus `rows: string[][]`.

**The grid.** Every page is an artboard of **1920 × 945 px**: exactly the page area of a maximized desktop browser on a 1920 × 1080 screen (minus the taskbar and the browser's toolbars). It is divided into **128 columns × 63 rows** of square 15 px cells, so the artboard's edges are the window's edges. Widget geometry is stored in cells, never in pixels. Containers have a nested grid with as many cells as the container is big. The grid is defined once, in `_constants/artboard.constants.ts`; the canvas, the layout overlay and the exported app all draw from it, and the backend never needs to know it.

### Database migrations

Flyway migrations live in `ntbd/src/main/resources/db/migration/` (`V1_0_0__init.sql` … `V1_0_14__browser_window_artboard.sql`). Changes to the grid come with a migration that moves saved widgets onto the new grid (`V1_0_13`, `V1_0_14`, `V1_0_15`). `V1_0_16` turns saved nav menus' old default colors into Auto; `V1_0_17` gives saved buttons and links the new brand color. Hibernate only **validates** the schema (`ddl-auto=validate`), so every schema change needs a new migration. The sample data (application `-1`, user `-1`, branch `-1`, page `-1`) is in `ntbd/src/test/resources/db/devdata/V1_0_3__add_test_data.sql`. Only dev runs and tests add that location (`spring.flyway.locations` in `ntbd/src/test/resources/config/application.properties`), so a real deploy starts with an empty database. `V1_0_18__accounts.sql` moves applications that existed before accounts into the shared workspace `-1`, with every existing user as an owner.

---

## 6. The shared widget catalog

`shared/widget-catalog.json`:

```jsonc
{
  "version": 1,
  "categories": [ { "id": "basic", "label": "Basic" }, … ],   // palette sections, in order
  "widgets": [
    {
      "type": "button",                     // unique id, stored on components
      "name": "Button",                     // shown in the palette
      "icon": "mouse-pointer-click",        // Lucide icon name (see WIDGET_ICONS)
      "category": "actions",
      "keywords": ["click", "trigger"],     // extra search words for the palette
      "size": { "w": 2, "h": 1, "minW": 1, "minH": 1 },   // size when dropped, in cells
      "resizable": true,
      "palette": true,                      // false: no longer offered (old pages still show it)
      "container": false,                   // true: holds other widgets in a nested grid
      "props": [
        { "key": "label", "type": "string", "label": "Label", "group": "Content", "default": "Click Me" },
        { "key": "textSize", "type": "select", "label": "Text size", "group": "Style",
          "default": "Normal", "options": ["Small", "Normal", "Large", "Title", "Headline"] }
      ]
    }
  ]
}
```

**Prop types.**
- Built in: `string`, `number`, `color`, `boolean`, `select`, `textarea`. A `color` is edited with `ColorField`: a swatch for the browser's picker plus a hex field (`#rgb`/`#rrggbb`, `#` optional). A color whose default is `""` can go back to none ("Auto": the theme's, or one that fits the widget).
- Custom, each with its own editor in `PROP_EDITORS`:
  - `dataSource`: pick a data source
  - `columns`: pick and order columns
  - `page`: pick one page
  - `pages`: pick and order several pages
- **Values are stored as text**, so defaults are text too. For example a boolean is `"true"`, and lists are JSON text like `"[\"1\",\"2\"]"`.
- `group` sections the properties panel. Groups appear in the order their first prop does.
- **Position and size are not props.** They are fields of the component, set by dragging and resizing on the canvas.

**Who reads it.**

| Reader | How |
|---|---|
| Frontend | `core/catalog/widget-catalog.ts` imports the JSON (`resolveJsonModule`). It exports `WIDGET_CATALOG`, `catalogWidget(type)` and `catalogDefaults(widget)`. |
| Editor palette and properties | `_constants/widget-registry.constants.ts` (`PALETTE_ITEMS`, `PALETTE_CATEGORIES`, `WIDGET_REGISTRY`, `RESIZABLE_WIDGET_TYPES`) and `_services/widget-registry.service.ts`. |
| Backend | `pom.xml` copies `../shared` into the classpath (`shared/widget-catalog.json`). `catalog/WidgetCatalog` loads and validates it at startup (unique types, every prop has a key and type). It offers `widgets()`, `widget(type)` and `defaultsOf(type)`. |
| Backend API | `GET /api/widget-props` and `GET /api/widget-props/{type}` serve the catalog's props. |

**Parity tests.** `core/catalog/widget-catalog.spec.ts` checks that every catalog widget has a component and a known icon, that every prop type has an editor, and that every category exists. A catalog entry can't silently miss its frontend half.

---

## 7. The frontend

Angular 21: standalone components, signals (`signal`, `computed`, `effect`, `resource`), zoneless change detection. Tests run on Vitest. The workflow editor uses Foblex Flow, and the canvas uses GridStack.

### 7.1 Folder roles

| Folder | Role | May import editor code? |
|---|---|---|
| `core/` | Runtime core: ports, catalog, rendering, workflow engine and actions, shared runtime services | **No** |
| `widgets/` | Widget components | **No** |
| `editor/` | Editor shell pieces: navbar, sidebars, tabs, panels, prop and action editors, runtime adapters | Yes |
| `pages/` | Editor screens (routes) | Yes |
| `components/` | Generic UI building blocks | Used by both |
| `_services/` | Editor state (pages, layouts, data, tabs, selection, preview, autosave…) and the signed-in user (`auth.service.ts`) | Yes |
| `_guards/` | Route guards (`authGuard`: signed-in users only) | Yes |
| `_constants/`, `_types/`, `_utils/`, `_directives/`, `_styles/` | Shared helpers. The editor-only registries in `_constants` are off-limits for the core. | Mixed |
| `api/` | Generated backend client | Editor only |

### 7.2 Routing and tabs

```
/                                → /console
/login                           sign in with Google or Microsoft (?error= explains a failed sign-in)
/console                         application overview (currently mock data)
/editor                          → /editor/welcome-0/welcome (the Start tab)
/editor/:tabId/:mode             the editor, one tab active
```

`/console` and `/editor` are behind `authGuard`: it asks `GET /api/me` once (`AuthService`) and sends anyone not signed in to `/login?returnUrl=…`. Signing in leaves the editor for the identity provider; the backend sends the browser back to `/console`, and the guard continues to the remembered `returnUrl`. `authErrorInterceptor` sends a lost session (any 401 from the API) to the login page and explains a 403 in a toast. The user menu (`components/user-menu`) shows who is signed in and signs out.

The editor works with **tabs**, like an IDE. A tab id's kind is decided by `tabKind(id)` in `tabs.service.ts`:

| Tab id | Kind | Modes |
|---|---|---|
| `welcome-…`, `new-…` | Start | `welcome` |
| `panel-<sidebarTab>` | A sidebar panel opened as a full tab | `panel` |
| a page id (digits) | Page | `edit` (canvas), `workflow` (workflow editor), `data` (data manager) |

- The **URL is the source of truth** for the active tab and its mode. The list of open tabs is kept in `sessionStorage`.
- Opening a URL for a tab that isn't open opens it. A mode that doesn't fit the tab kind is corrected.
- Recently opened pages are remembered for the Start screen (`RecentPagesService`, at most 5).

### 7.3 The editor shell

- **Navbar** (`editor/navbar`):
  - theme toggle (light/dark)
  - keyboard shortcuts help
  - a busy indicator (counts running HTTP requests)
  - **Export**, which downloads the whole app as one HTML file
- **Editor tabs** (`editor/editor-tabs`): open, close and switch tabs.
- **Mode dropdown** (`editor/mode-dropdown`): Edit / Workflow / Data for page tabs.
- **Sidebars** (`editor/sidebar`): left and right sidebars show the tabs of `SIDEBAR_TABS`:
  - Components (palette)
  - Data (data sources)
  - Layers (widget tree)

  Tabs can be dragged between sidebars. Which tab is where, and which one is open, is kept across reloads (`SidebarStateService`). A sidebar tab can also open as a full editor tab (`panel-…`).
- **Properties panel** (`editor/properties-panel`): settings of the selected widget, rendered from the catalog by `editor/dynamic-settings`. Prop types without a built-in input use their `PROP_EDITORS` editor.
- **Start screen** (`pages/welcome`): build a page, open a page, manage data, create the layout page, recent pages.

### 7.4 The canvas (Edit mode)

`pages/canvas/canvas.ts` hosts a **GridStack** grid on the 1920 × 945 artboard (its size comes from the constants, in px like GridStack's cells):

- **Pan and zoom**: viewport controls, zoom buttons, fit to screen.
- **Drag from the palette** to create a widget (size from the catalog). Containers get nested grids.
- **Moving and resizing** updates geometry (cells). Only types marked `resizable` resize.
- **Selection** (`SelectionService`, a list of ids; `selectedId` is the one selected last) feeds the properties panel and the Layers panel. **Ctrl/⌘/Shift+click** adds a widget to the selection or takes it out, here and in Layers. The properties panel then stacks one section per widget, scrolling together. **Double-clicking** a widget (here or in the Layers panel) selects it and opens the Properties tab.
- The **context menu** (right-click a widget; on the empty page: Paste):
  - "Add action" (one widget with a trigger): adds a flow for it and jumps to the workflow editor;
  - Copy, Duplicate, Paste (`ClipboardService`): widgets with their current props, containers with their children, and **the flows they start** (their triggers and everything after them). Pasted onto any page in the **nearest free place** where the whole group fits as it was (`placement.utils.ts`); nothing on the page moves, and the copies are selected. Copied triggers start from the copies, and actions pointing at a widget that was copied along point at its copy. When there's no free place, nothing is pasted and a message (`ToastService`) says why;
  - Center horizontally / vertically / on both axes, in what the widget is in (the page, or its container);
  - Delete.
- **Center guides**: while a widget is dragged or resized centered in its grid (as near as its cells allow), a dashed line marks the grid's middle (`centering.utils.ts`).
- The **layout overlay** (`pages/canvas/layout-overlay`) draws the layout page's widgets under the current page: faded while editing, live while previewing. It reuses the core's `WidgetGrid`.

Each widget is created with `ViewContainerRef.createComponent(WIDGET_COMPONENTS[type])` and gets `id` and `props` inputs.

### 7.5 Persistence in the editor

| What | Service | How it's saved |
|---|---|---|
| Pages | `PagesStateService` | Loaded once; created from the Start screen |
| Widgets and geometry | `LayoutStateService` | Per page; create, update and delete calls to `/api/ui-components` |
| Prop edits | `PropsAutosaveService` | Debounced per widget, shortly after the last change. `Ctrl+S` saves now. Warns before closing the tab with unsaved changes. |
| Workflows | `WorkflowStateService` | Graph per page (nodes and edges via `/api/workflows/…`); node edits are saved debounced |
| Data sources | `DataSourceStateService` | List plus details loaded on demand; import (CSV upload) and delete |

### 7.6 Preview

**Alt+P**, or the preview button, starts a preview of the open page:

1. `PreviewSessionService.start(pageId)` makes the session **live**, so widgets react to clicks.
2. The canvas becomes static (no dragging). Widget events are forwarded to `WorkflowRuntimeService`, and **page-load** workflows run.
3. Data changes go to **`PreviewDataService`**, which makes a copy of a data source on the first change. The real data is never touched.
4. Following a link to another page keeps the preview going on that page (`continueOn`). The copied data, table selections and the rows shown in detail sections stay.
5. Stopping the preview throws everything away. Workflow changes such as `set_text` are undone (`WorkflowRuntimeService.reset`), and the preview data, selections, detail records, typed input and table searches are reset.

### 7.7 The workflow editor (Workflow mode)

`pages/workflow-editor` shows the page's workflow as a node graph (Foblex Flow):

- **Trigger** nodes start a flow:
  - a widget event from `WIDGET_TRIGGERS` (button click, table row double-click, input typed into), of a widget on the page or on the layout page (a layout widget's events run the open page's flows, e.g. a search bar in the header);
  - or page load (a trigger without an element).
- **Action** nodes do something. Their type comes from `ACTION_TYPES`, and their settings are edited by the action's editor component (`editor/action-editors/*`).
- **Condition** nodes exist in the model but are **not executed** by the browser runtime yet.
- Edges connect an output port (e.g. `out`) to the next node.

### 7.8 The data manager (Data mode and the Data sidebar)

You import CSV files as data sources, browse their rows (`editor/data-source-*`, `pages/data-editor`), and delete them. Tables and detail sections are bound to a data source with the `dataSource` and `columns` props.

### 7.9 Keyboard shortcuts

| Keys | Action |
|---|---|
| `Alt+1` / `Alt+2` / `Alt+3` | Edit / Workflow / Data mode |
| `Alt+P` | Start or stop the preview |
| `Ctrl+S` | Save property changes now |
| `Alt+N` / `Alt+W` | New tab / close tab |
| `Ctrl+B` | Show or hide the left sidebar (reopens the tab it showed last; also works while typing) |
| `Delete` | Delete the selected widgets |
| `Ctrl+C` / `Ctrl+V` / `Ctrl+D` | Copy / paste / duplicate the selected widgets (Edit mode) |
| `?` | Show the shortcuts |

---

## 8. The runtime core

Everything here runs both in the editor's preview and in the exported app.

### 8.1 Folder structure

```
core/
├── catalog/          widget-catalog.ts (+ parity spec)
├── definition/       app-definition.ts: the export format type + graph conversion
├── ports/            app-ports.ts (ports), memory-app-data.ts (in-memory AppData)
├── rendering/        widget-components.ts, text-sizes.ts, widget-grid/
├── services/         table-selection, detail-records, widget-events
├── workflow/         workflow-runtime.service.ts, action-handlers.ts, widget-triggers.ts
│   └── actions/      set-text/, table/ (+ table-operations), show-detail/
├── testing/          fake-app.ts: in-memory fakes for every port (specs only)
└── runtime-boundary.spec.ts
widgets/              button, label, link, nav, table, detail, form, default
```

### 8.2 Widgets

Every widget extends `BaseWidget` (`_directives/base-widget.directive.ts`):

- Inputs: `id` and `props`. Props are a model, so the canvas can update them live.
- `text(key)` reads a prop as text.
- A host binding sets `--widget-text-size` from the widget's `textSize` prop, so all of its text follows the chosen size.

The widgets:

| Widget | Ports used | Behavior while live |
|---|---|---|
| `label` | none | Shows text in the chosen color and size. |
| `input` | `APP_SESSION` | A text field (optionally a search field with an icon). What's typed is kept in `InputValuesService` for actions to read. Fires `input_change` once typing pauses for its `debounceMs` (default 300), or at once on Enter. Read-only while editing, so clicking it selects the widget. |
| `button` | `APP_SESSION` | Click fires `element_click` through `WidgetEventsService`. Shows hover and press states. |
| `link` | `APP_PAGES`, `APP_NAVIGATION`, `APP_SESSION` | Opens its page, or its URL in a new browser tab. |
| `nav` | `APP_PAGES`, `APP_NAVIGATION`, `APP_SESSION` | Links to chosen pages and marks the current one. A bar: square edges, filling its cells to their edges like a container (catalog `"flush": true`). Its text and current-page colors default to Auto: readable on its background; the Filled appearance marks the open page with a darker tone of the background (`color.utils.ts`). |
| `table` | `APP_DATA`, `APP_SESSION` | Shows rows (chosen columns, max rows, striped). Click selects (single or multi); double-click fires `row_dblclick`. Shows only the rows matching its search (`TableFilterService`, set by the search action). |
| `detail` | `APP_DATA`, `APP_SESSION` | Shows the row a workflow sent to it, with current values. While editing, shows its fields empty. |
| `container` | none | Draws nothing itself: grids give it a nested grid, with its `background` color. |
| `form` | none | Legacy (`palette: false`); still drawn on old pages. |

**Widgets never run workflows themselves.** They fire events through `WidgetEventsService` (`{ pageId, elementId, event }`). The host (the editor canvas, or the runtime shell) passes them to `WorkflowRuntimeService.handleEvent`. This keeps widgets independent of the workflow engine.

### 8.3 Rendering: `WidgetGrid`

`core/rendering/widget-grid` draws a list of `LayoutItem`s on a 128 × 63 CSS grid (`minmax(0, 1fr)` tracks, so cells share the space evenly whatever their content):

- Each item is placed by `grid-column` and `grid-row` from its cells.
- Each top-level widget is inset by 2 px, matching GridStack's margin.
- Containers recurse into a nested grid of their own size.
- Components come from `widgetComponent(type)`, and props are merged with catalog defaults (`widgetProps`).

The exported app uses it to draw pages and the layout page. The editor uses it for the layout overlay.

### 8.4 The workflow engine

`core/workflow/workflow-runtime.service.ts`:

- **Starting flows.**
  - `handleEvent(pageId, elementId, event)` starts every flow whose trigger matches that element and event.
  - `handlePageLoad(pageId)` starts every flow whose trigger has no element (page load).
- **Running.** From a trigger, every connected node runs. Branches run side by side, ordered by their vertical position in the editor. An action runs once the one before it has finished, and **only if that one returned `'continue'`**. `'stop'` (e.g. a cancelled form) ends the branch, and so does an error, which is logged.
- **Handlers.** What each action does is its handler: `ACTION_HANDLERS[actionType]`, an injectable with `run(ActionRun)` and an optional `reset(pageId)`.
- **Sessions.** `ActionRun.isCurrent()` tells a long-running action whether its session is still the current one. `reset(pageId)` (preview stopped) bumps a generation counter so waiting steps never apply. It also calls every handler's `reset`.

The **actions**:

| Action (`actionType`) | Handler | Does |
|---|---|---|
| `set_text` | `SetTextHandler` | Shows other text on a label via `APP_LAYOUT.overrideProps`, optionally switching back after N seconds. Changes to one label queue up. |
| `table` | `TableActionHandler` | Runs a `TABLE_OPERATIONS` entry on a table. |
| `table` / `add_row` | `AddRowHandler` | Asks for a row in a form modal, then `APP_DATA.addRow`. |
| `table` / `edit_row` | `EditRowHandler` | Needs exactly one selected row; edits it in the form modal. |
| `table` / `delete_rows` | `DeleteRowsHandler` | Deletes all selected rows after one confirmation. |
| `show_detail` | `ShowDetailHandler` | Sends the selected row to a detail section (`DetailRecordsService`), opening the detail's page if it's another one. |
| `search` | `SearchHandler` | Filters one table, or every table on the page (`tableId: "all"`, a global search), by an input's text: every word must appear in one of the shown columns, ignoring case; empty shows all rows. Rows it hides are deselected. Start it **on type** with the input's "On input" trigger (debounced), or **on a button press** with a button's "On click". |

Shared runtime state lives in `core/services`:
- `TableSelectionService`: selected rows per table
- `TableFilterService`: the search each table is filtered by
- `InputValuesService`: what's typed into each input
- `DetailRecordsService`: which row each detail section shows
- `WidgetEventsService`: the event bus

### 8.5 Testing the core

`core/testing/fake-app.ts` gives specs a whole app in memory:

```ts
TestBed.configureTestingModule({ providers: provideFakeApp({ data: [PEOPLE], pages: PAGES }) });
fakeApp().session.start('1');          // go live
fakeApp().data.addRow(5, ['Carol']);   // change data
expect(fakeApp().navigation.opened).toEqual([4]);
```

`MemoryAppData` (the `AppData` the exported app uses) backs the fake data, so specs exercise real code.

---

## 9. The exported app (runtime build)

`name-tbd/src/runtime/` is a second Angular application (project `runtime` in `angular.json`):

- **Output.** `ntbd/src/main/resources/export-runtime/`: `index.html`, `main.js`, `styles.css`.
- **No lazy chunks.** One `main.js` of about 340 kB (about 86 kB gzipped).
- **No output hashing.** Stable file names the backend can find.
- **No critical-CSS inlining.** The backend replaces a plain `<link>` tag.
- **License comments** stay inline in `main.js` (`extractLicenses: false`).
- `tsconfig.runtime.json` compiles `src/runtime/main.ts` and whatever it imports.

### 9.1 Startup

`src/runtime/main.ts`:

1. **Read the app definition** (`read-definition.ts`):
   - from `<script type="application/json" id="app-definition">` in the page (single-file export);
   - or, if that's empty, from `app-definition.json` next to the page (for future multi-file exports).
   - A wrong `version` is refused with a clear message.
2. **Bootstrap** `RuntimeShell` with `runtimeConfig(definition)`:
   - the definition as the `APP_DEFINITION` token;
   - the router with **hash location** (`#/about`), so it runs from `file://` too;
   - component input binding;
   - the runtime adapters (`provideAppRuntime()`).

If anything fails, the page shows the reason instead of staying blank.

### 9.2 Routing

`runtime-routes.ts` builds the routes from the definition:

- **One route per non-layout page.** The path is the page's own path without slashes (`/about` → `#/about`). A duplicate path becomes `page-<id>`.
- The route passes `pageId` to `RuntimePage` and sets the document title (`Page · App`).
- **Home page.** It's `homePageId` if set, else the page at `/`, else the first page. Unknown addresses (`**`) redirect home.
- An app without pages shows a short "no pages yet" message.

### 9.3 Shell and pages

```
<app-root> RuntimeShell
  └─ .artboard (window-wide, min 960 px; 945 px high; real CSS px, no zoom)
       ├─ <app-widget-grid class="layout">   the layout page's widgets
       └─ <router-outlet> → RuntimePage      the current page's widgets, on top
```

- **Exactly the canvas on a 1080p screen.** The artboard is drawn with the same `WidgetGrid` as the editor's layout overlay. In a 1920 × 945 window every widget sits where it sits on the canvas, edges included.
- **A real website: zoomable.** Everything is in real CSS px, so the browser's zoom (Ctrl + / −, pinch) works as on any site.
- **A bit responsive.** Rows keep the canvas's height in px; columns share the window's width. A narrower window (or zooming in) narrows the columns down to `EXPORT_MIN_WIDTH`, half the artboard (960 px, i.e. 200% zoom on a 1080p screen); below that the page scrolls sideways instead of squeezing further. A wider window (or zooming out) widens them.
- **Layering.** The page layer lets clicks through its gaps (`pointer-events: none`, widgets `auto`), so the layout page's widgets underneath stay clickable.
- **Page load.** `RuntimePage` sets the current page (`RuntimeLocation`) and runs the page's page-load workflows whenever its `pageId` changes.
- **Events.** `RuntimeShell` passes every widget event to `WorkflowRuntimeService.handleEvent`.
- **Modals** (add/edit row forms, confirmations) use the same CDK overlay modal service as the editor.

### 9.4 Runtime adapters

`runtime-adapters.ts`:

| Port | Adapter |
|---|---|
| `APP_DATA` | `MemoryAppData` over `definition.dataSources`. Every change is saved by `AppStorage` and restored on the next visit. |
| `APP_PAGES` | `definition.pages`. A page's `path` is its hash address (`#/about`), so links also work as normal links (middle-click, new tab). |
| `APP_NAVIGATION` | `router.navigateByUrl`; the current page comes from `RuntimeLocation`. |
| `APP_SESSION` | Always live. |
| `APP_LAYOUT` | Page components from the definition, with prop overrides from workflows applied (a signal, so widgets update). |
| `WORKFLOW_SOURCE` | `definitionGraph(page.workflow)`, converted once per page and cached. |

### 9.5 Data in the browser

`AppStorage` keeps data changes in `localStorage` under `ntbd-app-<appId>-data`, tagged with the export's **`dataRevision`** (a fingerprint of the exported data):

- **Same data revision:** visitors keep their changes, even across re-exports that only changed pages or workflows.
- **New data exported:** the revision changes and the app starts from the new data.
- **Storage blocked or full:** the app keeps working; changes just aren't kept.

---

## 10. The backend

Spring Boot 4 (Jackson 3, `tools.jackson.*`), Java 21, Spring Data JPA, Flyway, PostgreSQL (H2 in tests), springdoc OpenAPI, Lombok.

### 10.1 Layers

```
controller/   REST endpoints; GlobalExceptionHandler maps exceptions to status codes
   │
service/      transactions and business rules; work with DTOs and commands
   │
persistence/  Spring Data repositories (+ converters for value types)
   │
domain/       JPA entities (embedded ids like Page.PageId, AuditableEntity timestamps)

dto/ + mapper/   records sent to clients, and entity ↔ DTO mapping
commands/        request bodies (NewPageCommand, UpdateUiComponentCommand, …)
```

**Errors** (`GlobalExceptionHandler`):

| Exception | Status |
|---|---|
| `ResourceNotFoundException` subclasses | 404 |
| `DuplicateResourceException` | 409 |
| `IllegalArgumentException`, `PasswordValidationException` | 400 |
| `ExportRuntimeUnavailableException` (runtime not built) | 503 |

**Security and CORS.** Every request is permitted and CSRF is disabled (development setup). CORS allows all origins.

### 10.2 REST API

| Area | Endpoints |
|---|---|
| Applications | `POST /api/applications`, `GET /api/applications` |
| Branches | `POST /api/branches`, `GET /api/branches`, `DELETE /api/branches/{id}` |
| Versions | `POST /api/versions`, `GET /api/versions`, `GET /api/versions/latest` |
| Users | `POST /api/users` |
| Pages | `POST /api/pages`, `GET /api/pages`, `GET /api/pages/{id}`, `GET /api/pages/{id}/ui-components`, `GET /api/pages/{id}/workflow` (created on first access) |
| Components | `POST /api/ui-components`, `GET /api/ui-components`, `GET`/`PUT`/`DELETE /api/ui-components/{id}`, `GET /api/ui-components/{id}/props` (with catalog defaults) |
| Widget props | `GET /api/widget-props`, `GET /api/widget-props/{type}` (from the catalog) |
| Workflows | `POST`/`GET /api/workflows`, `GET`/`DELETE /api/workflows/{id}`, `POST /api/workflows/{id}/execute` (server-side engine) |
| Nodes | `POST`/`GET /api/workflows/{wid}/nodes`, `GET`/`PUT`/`DELETE /api/workflows/{wid}/nodes/{nid}` |
| Edges | `POST`/`GET /api/workflows/{wid}/edges`, `GET`/`DELETE /api/workflows/{wid}/edges/{eid}` |
| Data sources | `POST /api/data-sources` (import), `GET /api/data-sources?branchId=…`, `GET`/`DELETE /api/data-sources/{id}` |
| **Export** | `GET /api/branches/{branchId}/definition`, `GET /api/branches/{branchId}/export?format=html`, `GET /api/export/formats` |

### 10.3 Data import

`POST /api/data-sources` with `{ branchId, name, format, content }`:

1. `TabularDataParserRegistry` picks the parser for `format`. Today that's `CsvParser`.
2. The parser turns the content into a `ParsedTable` (columns and rows), or throws `IllegalArgumentException` (400) for invalid content.
3. `DataSourceService` stores it as columns, rows and cells.

### 10.4 The server-side flow engine

Separate from the browser runtime, `workflow/FlowEngine` runs a workflow **on the server** (`POST /api/workflows/{id}/execute`, for `ACTIVE` workflows):

- It walks from the start node along edges, one node at a time.
- Each node type has a `NodeHandler` bean: `ConditionHandler`, `EmailHandler`, `WebhookHandler`.
- Node configs are checked by `NodeConfigValidator`.
- The workflow's status moves `ACTIVE → RUNNING → COMPLETED/FAILED`.

This engine is for backend automation. Page workflows in the editor and in exports run in the browser (section 8.4).

---

## 11. The export pipeline

```
GET /api/branches/{id}/export?format=html
        │
        ▼
ExportController ──▶ AppDefinitionService.build(branchId)
                       │  loads the branch and its application → ExportScope
                       │  new AppDefinition(app)
                       │  for each AppDefinitionContributor (by @Order):
                       │     PagesContributor       → "homePageId", "pages"
                       │     DataSourcesContributor → "dataSources", "dataRevision"
                       ▼
                     AppDefinition
                       │
        ExportFormatRegistry.get("html") ──▶ SingleFileHtmlExport.export(definition)
                       │  ExportRuntime: index.html, styles.css, main.js
                       │  replace <title>App</title>                  → app name (HTML-escaped)
                       │  replace <link … styles.css>                 → <style>…</style>
                       │  replace empty <script id="app-definition">  → definition JSON
                       │  replace <script src="main.js" …>            → <script type="module">…</script>
                       ▼
                     ExportedFile("my-app.html", text/html; UTF-8, bytes)
                       │
        ◀──────────────┘  Content-Disposition: attachment
```

### 11.1 The definition

`AppDefinition` holds `version`, `app` (`id`, `name`) and **sections**. Each section is a top-level JSON field added by a contributor (`@JsonAnyGetter`). A section name can only be contributed once.

- **`PagesContributor`**:
  - all pages of the branch (by id), each with its components as a **tree** (children inside containers);
  - each component's props are **completed with the catalog defaults**, so the exported app never depends on the editor having saved them;
  - each page's workflow as raw nodes and edges (`findForPage`, which never creates a workflow);
  - `homePageId` is `null` for now.
- **`DataSourcesContributor`**: every data source of the branch with all its rows. `dataRevision` is the first 8 bytes (as 16 hex characters) of the SHA-256 of that data.

### 11.2 Packaging safely

Everything is inlined into one HTML document, so nothing inlined may end its element early:

- **JSON:** every `<` becomes `<`. In JSON, `<` can only appear inside strings, where both forms mean the same.
- **JavaScript:** `</script` becomes `<\/script` and `<!--` becomes `<\!--`. These sequences only occur inside JS strings and regexes, where the escapes mean the same.
- **CSS:** `</` becomes `<\/`.
- **Title:** HTML-escaped.

A runtime `index.html` without the expected tags fails clearly, telling you to rebuild the runtime.

---

## 12. The app definition format

The contract between backend and runtime. TypeScript type: `core/definition/app-definition.ts`. Java: `export/definition/*`. A breaking change bumps `APP_DEFINITION_VERSION` and `AppDefinition.VERSION` together.

Pages carry their widgets' geometry in grid cells only (`x`, `y`, `w`, `h`): turning cells into pixels is the runtime's job, with the same constants as the editor. (Version 2 briefly carried precomputed CSS per widget; version 3 dropped it again.)

```jsonc
{
  "version": 3,
  "app": { "id": -1, "name": "Test Application" },
  "homePageId": null,                       // null: the page at "/", else the first page
  "pages": [
    {
      "id": 1, "name": "Home", "path": "/home", "layout": false,
      "components": [
        { "id": 10, "type": "table", "x": 4, "y": 2, "w": 10, "h": 8,
          "props": { "dataSourceId": "1", "columns": "[]", "maxRows": "10", … } },
        { "id": 11, "type": "container", "x": 0, "y": 0, "w": 6, "h": 3, "props": {},
          "children": [ { "id": 12, "parentId": 11, "type": "label", … } ] }
      ],
      "workflow": {
        "nodes": [
          { "id": 1, "type": "Trigger", "x": 0, "y": 50,
            "props": { "triggerType": "element_click", "elementId": "10", "eventName": "row_dblclick" } },
          { "id": 2, "type": "Action", "x": 400, "y": 100,
            "props": { "actionType": "show_detail", "config": { "tableId": "10", "detailId": "13", "detailPageId": "1" } } }
        ],
        "edges": [ { "id": 1, "sourceNodeId": 1, "sourcePort": "out", "targetNodeId": 2 } ]
      }
    }
  ],
  "dataSources": [
    { "id": 1, "name": "people", "columns": ["id", "first_name"], "rows": [["1", "Anna"], ["2", "Lukas"]] }
  ],
  "dataRevision": "80569c033e4af4b1"
}
```

**Workflows travel in the backend's neutral shape** (nodes with props, edges with node ids and port names). The frontend's port-id format stays a frontend detail: `definitionGraph()` converts them into the graph the workflow runtime runs.

---

## 13. End-to-end workflows

### 13.1 Building a page

1. **Start screen → "Build a page"**: `POST /api/pages` on branch `-1`. A tab opens in Edit mode.
2. **Drag a widget from the palette.**
   - The size comes from the catalog.
   - `POST /api/ui-components` stores type, geometry and parent.
   - The canvas creates the component with the catalog's default props.
3. **Move or resize**: geometry is updated in cells with `PUT /api/ui-components/{id}`.
4. **Change settings**: the properties panel edits props. The widget updates live, and `PropsAutosaveService` saves shortly after the last change (or now with `Ctrl+S`).

### 13.2 Adding behavior

1. Right-click a button → **Add action**, or switch to Workflow mode.
2. A trigger is created for the widget's event (`WIDGET_TRIGGERS`). The new action is connected to it, and nodes and edges are saved through `/api/workflows/{id}/nodes|edges`.
3. Pick the action type and fill in its settings (its editor from `ACTION_TYPES`).

### 13.3 Previewing

1. **Alt+P**: the session goes live, and page-load flows run.
2. **Click a button**: `ButtonWidget` fires `element_click`. The canvas passes it to `WorkflowRuntimeService.handleEvent`, which runs the matching flows' handlers through the ports. The editor adapters read and write the preview's data copy.
3. **Stop the preview**: all preview changes are undone.

### 13.4 Importing data

**Data sidebar → import a CSV** sends `POST /api/data-sources` with format `csv`. The data source is then available to tables and detail sections (`dataSource` prop).

### 13.5 Exporting

1. **Navbar → Export** opens `GET /api/branches/-1/export?format=html`.
2. The backend builds the definition, inlines the runtime, and sends `<app-name>.html`.
3. Open the file anywhere. The runtime reads the embedded definition, routes to the home page, draws the layout page plus the page, and runs workflows exactly like the preview. Data changes stay in that browser.

---

## 14. Styling and design tokens

Global styles are split into partials in `src/app/_styles/`. Both the editor (`src/styles.scss`) and the exported app (`src/runtime/styles.scss`) use them:

| Partial | Contains |
|---|---|
| `_tokens.scss` | Colors (light and `[data-theme='dark']`), font sizes, widget text sizes, hover tokens |
| `_base.scss` | Box sizing, html/body defaults |
| `_fields.scss` | Form field look (`.ui-field`, `.ui-input`, `.ui-check`, …), used in modals |
| `_modal.scss` | Modal backdrop and panel |
| `_spinner.scss` | `.ui-spinner` |

The editor adds GridStack's CSS, drag ghosts and the blueprint grid. The runtime adds only the CDK overlay CSS.

**Text sizes.**
- The scale: `--text-size-small` (12 px), `-normal` (14), `-large` (18), `-title` (24), `-headline` (32).
- Widget text uses `--widget-text-size` (default: normal), and hints use `--widget-text-size-small`.
- A widget's **Text size** prop sets `--widget-text-size` on that widget (`BaseWidget`).

**Brand color.** The widgets' main color (buttons, links, menus, focus rings: `--widget-brand`, `BRAND_COLOR`) is the editor's primary, `#2f89ff`, in both themes.

**Hover.** `--widget-hover-dim` / `--widget-active-dim` (brightness filters that work on any color) and `--widget-transition`. Hover and press states apply only while the app runs:
- buttons darken;
- links fade and thicken their underline;
- table rows and menu links tint.

**Component styles** have a 4 kB budget (warning) per component in production builds, so keep component SCSS flat and put shared pieces in partials.

---

## 15. Extending the system: recipes

### Add a widget

1. **Catalog**: add an entry to `shared/widget-catalog.json` (type, name, icon, category, size, props).
2. **Component**: create `widgets/<name>-widget/` with a component extending `BaseWidget`. Read props with `this.text(key)` or the helpers in `_utils/widget-props.utils.ts`. Use ports (`inject(APP_DATA)`, …), never editor services. Size text with `var(--widget-text-size)`.
3. **Register** the component in `WIDGET_COMPONENTS` (`core/rendering/widget-components.ts`).
4. **Icon**: if it's new, add it to `WIDGET_ICONS`.
5. **Optional**:
   - if it fires an event, add a `WIDGET_TRIGGERS` entry and fire through `WidgetEventsService`;
   - if it needs a custom prop type, see the next recipe.
6. **Verify**: run the tests (the catalog parity and boundary specs check the wiring), then `npm run build:runtime` so exports include it.

The backend needs no change: it reads the catalog.

### Add a prop type with its own editor

1. Use the new `type` in the catalog prop.
2. Create an editor component extending `BasePropEditor` in `editor/prop-editors/`.
3. Register it in `PROP_EDITORS` under that type name.

### Add a workflow action

1. **Handler** (runtime): create `core/workflow/actions/<name>/<name>.handler.ts`, an `@Injectable({ providedIn: 'root' })` implementing `ActionHandler`:
   - `run({ pageId, node, isCurrent })` returns `'continue'` or `'stop'`;
   - add `reset(pageId)` if it changes things that must be undone after a preview;
   - use ports only.
2. Register the handler in `ACTION_HANDLERS` (`core/workflow/action-handlers.ts`) under the action id.
3. **Editor**: create a settings component in `editor/action-editors/` and add an `ACTION_TYPES` entry (id, label, `defaultConfig`, `editor`).
4. Add a spec next to the handler (use `provideFakeApp`).

### Add a table operation

Add a handler (like `AddRowHandler`) and an entry `{ id, label, handler }` to `TABLE_OPERATIONS`. The Table action's editor offers it automatically.

### Add a widget trigger

Fire the event from the widget (`WidgetEventsService.fire({ pageId, elementId, event })`, only while `APP_SESSION.live()`). Then add a `WIDGET_TRIGGERS` entry (`widgetType`, `event`, title, icon, `nameProp`, `describe`).

### Add a sidebar panel

Create the panel component and add `{ id, label, icon, component, defaultSide }` to `SIDEBAR_TABS`. It can then be moved between sidebars and opened as a tab.

### Add a keyboard shortcut

Add `{ id, keys, description }` to `KEYBOARD_SHORTCUTS`, and handle the `id` where the action lives. The help dialog lists it automatically.

### Add an import format

Implement `TabularDataParser` (`format()`, `parse(content)`) as a Spring `@Component`. `TabularDataParserRegistry` picks it up. Then offer the format in the frontend's `DATA_SOURCE_FORMATS`.

### Add an export format (e.g. a ZIP for a hosting vendor)

1. Implement `ExportFormat` as a `@Component`:
   - `id()` is the `?format=` value;
   - `export(definition)` returns an `ExportedFile`.
2. Use `ExportRuntime` for the runtime files. A multi-file export can write `app-definition.json` next to `index.html`: the runtime reads it from there when the page has none embedded.
3. It appears in `GET /api/export/formats` automatically.

### Add a section to the app definition (e.g. API connections)

1. **Backend**: implement `AppDefinitionContributor` as a `@Component` with an `@Order`, and `definition.put("apiConnections", …)` in `contribute(scope, definition)`.
2. **Frontend**: add the field to `AppDefinition` in `core/definition/app-definition.ts`, and consume it in the runtime adapters (e.g. a new `AppData` implementation that calls the API).
3. If the change is breaking, bump the version on both sides.

### Add a new kind of data (database, API, …)

The `AppData` port is the seam:
1. Export the connection info as a definition section (previous recipe).
2. Implement `AppData` in the runtime against it, instead of `MemoryAppData`, choosing per data source.

Widgets and actions don't change.

---

## 16. Testing

### Frontend

`npm test -- --watch=false` runs every spec under `src/**` with Vitest in jsdom.

| Area | Example specs |
|---|---|
| Runtime boundary | `core/runtime-boundary.spec.ts` |
| Catalog parity | `core/catalog/widget-catalog.spec.ts` |
| Widgets on the fake app | `widgets/*/*.spec.ts` |
| Workflow engine and actions | `core/workflow/**/*.spec.ts` |
| Exported app end to end | `runtime/app/runtime-shell/runtime-shell.spec.ts` (boots the shell with a test app; checks layout, workflows, routing, persisted data) |
| Runtime routing and storage | `runtime/app/runtime-routes.spec.ts`, `app-storage.spec.ts` |
| Editor services and utils | `_services/*.spec.ts`, `_utils/*.spec.ts` |

### Backend

`./mvnw test` inside `ntbd/`. Tests use H2 in PostgreSQL mode (`src/test/resources/application.properties`).

| Area | Tests |
|---|---|
| Services, controllers, mappers, repositories | `service/`, `controller/`, `mapper/`, `persistence/` |
| Catalog | `catalog/WidgetCatalogTest` |
| Export | `export/AppExportIntegrationTest` (real database content → definition → HTML download), `export/format/*` (inlining and escaping, formats registry, runtime lookup), `export/definition/AppDefinitionTest` |
| Server-side engine | `workflow/*` |

**Export tests use a stand-in runtime** (`src/test/resources/export-runtime-test/`) and set `ntbd.export.runtime-locations` per test. They never need the frontend build, and the stand-in never leaks into a running backend.

---

## 17. The generated API client

`name-tbd/src/app/api/` is generated by **ng-openapi** from the backend's OpenAPI spec. **Never edit it by hand.** Regenerate it after changing endpoints or DTOs:

1. Start the backend (any database; H2 is enough, e.g. `--spring.datasource.url=jdbc:h2:mem:api;MODE=PostgreSQL;DATABASE_TO_LOWER=true;DEFAULT_NULL_ORDERING=HIGH`).
2. Run:

   ```bash
   npx ng-openapi -i http://localhost:8080/v3/api-docs -o src/app/api
   ```

The whole folder is regenerated each time. Commit it together with the backend change.

---

## 18. Conventions

- **Registries over conditionals.** A new kind of thing is a new registry entry or bean, not a new `if` or `switch`.
- **The runtime core uses ports only.** The boundary spec enforces it.
- **Props are text.** Parse them with the helpers in `_utils/widget-props.utils.ts`.
- **Geometry is in grid cells**, never pixels.
- **Signals** for state, `computed` for derived values, `effect` only for side effects.
- **Comments say why.** They describe what something is for, not what the next line does.
- **Backend**: constructor injection (`@RequiredArgsConstructor`), records for DTOs and commands, one migration per schema change.
- **Styles**: design tokens from `_tokens.scss`. Shared look goes in partials; component SCSS stays small.

---

## 19. Known limitations and roadmap

**Today:**
- The editor works on one hard-coded branch (`-1`). The console shows mock applications.
- Condition nodes are stored and editable but not executed by the browser runtime.
- There is no home-page setting: the export starts on the page at `/`, or else the first page.
- Exported data lives in the export and in each visitor's browser. There's no shared live data yet.
- Pages are designed for one desktop window size. They adapt to windows down to half its width; on smaller screens (phones) they scroll sideways. Real mobile layouts would need per-breakpoint geometry.
- Signing in works, but data isn't scoped to workspaces yet: every signed-in user can read and change every application.

**Planned, and prepared for by the architecture:**
- **Live data sources** (databases, APIs): a new definition section plus an `AppData` implementation (section 15).
- **Vendor deploys and ZIP exports**: a new `ExportFormat`. The runtime already reads `app-definition.json` from next to the page.
- **More widgets, actions and triggers**: registry entries (section 15).
