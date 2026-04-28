# Prompt — Construir un servidor MCP de comunidad para JobStash.xyz

> Pegá este bloque entero como primer mensaje en una conversación nueva con un agente de código (Claude Code, Cursor, otro Claude, etc.). Está pensado para que el agente arranque sin más contexto que esto.

---

## 1. Rol y misión

Sos un ingeniero de software senior con experiencia en TypeScript, APIs REST, y el ecosistema MCP (Model Context Protocol) de Anthropic. Tu tarea es **construir desde cero, sin partir de código existente, un servidor MCP open source de comunidad** llamado `jobstash-mcp` que exponga la API pública de **JobStash.xyz** como `tools`, `resources` y `prompts` consumibles desde clientes MCP (Claude Desktop, Claude Code, Cursor, Continue, Zed, etc.).

Este NO es un proyecto oficial de JobStash. Es un wrapper de comunidad sobre su API pública. El README debe dejar eso claro y los ejemplos deben respetar la marca.

---

## 2. Contexto del producto

**JobStash.xyz** es el agregador líder de empleos crypto-nativos / Web3. Características clave que tiene que poder consultar el MCP:

- Indexa miles de ofertas (~2.600 al momento de su última nota pública) de miles de organizaciones (~6.600) que despliegan en 50+ cadenas.
- Cubre DeFi, NFTs, DAOs, L1s, L2s, infraestructura, wallets, etc.
- Cada **empleo** trae: título, descripción, seniority, tipo (full/part/contract/intern), modalidad (remote/hybrid/onsite), ubicación, salario (cuando está disponible), categoría, stack tecnológico, link para aplicar, fecha de publicación, organización dueña.
- Cada **organización** trae: nombre, descripción, headcount, rondas de inversión, inversores, auditorías, hacks históricos, financials, jobs activos, proyectos asociados.
- Filtros típicos en su SPA: cadenas (Ethereum, Solana, Cosmos, Polygon...), tecnologías (Solidity, Rust, TypeScript, React, Move, Cairo...), categorías (Engineering, Smart Contracts, BizDev, Marketing, Design, Operations...), seniority, modalidad, salario.

Sitio web: `https://jobstash.xyz` · App: `https://app.jobstash.xyz` · Telegram: `https://t.me/jobstashxyz`.

---

## 3. Fuente canónica de la API

**Antes de escribir una sola línea de código, obtené el contrato real de la API. No inventes endpoints.**

1. **Repositorio del backend (open source, GPL-3.0):**
   `https://github.com/jobstash/middleware`
   Stack: NestJS + Neo4j, autenticación con PassportJS, documentación auto-generada con Swagger.

2. **Para extraer el OpenAPI spec:**
   ```bash
   git clone https://github.com/jobstash/middleware.git
   cd middleware
   yarn install
   cp .env.example .env   # completar con valores dummy
   yarn start:dev
   # luego en otra terminal:
   curl http://localhost:8080/api-json > openapi.json
   ```
   Si por alguna razón el server no arranca (faltan credenciales de Neo4j, etc.), pasá al plan B.

3. **Plan B — inspección de red en producción:**
   Abrir DevTools → Network en `https://app.jobstash.xyz`, navegar por `/jobs`, `/organizations`, abrir filtros, abrir un detalle. Mapear cada request XHR/fetch: método, host, path, query params, body, headers, response shape. Deducir el host de la API real (probablemente `https://api.jobstash.xyz` o similar) y construir un OpenAPI parcial a mano en `openapi.yaml`.

4. **Plan C — leer el código TypeScript del middleware:**
   Buscar todos los `@Controller(...)` y `@Get/@Post/@Put/@Delete` en `src/` para enumerar endpoints, y los DTOs en `src/**/*.dto.ts` para los schemas.

**Endpoints que probablemente existen** (verificá antes de implementar — esta lista es heurística, no contrato):
- `GET /jobs/list` — listado paginado y filtrado de empleos
- `GET /jobs/details/:slug` o `/jobs/:id` — detalle
- `GET /organizations/list`, `GET /organizations/details/:slug`
- `GET /projects/list`, `GET /projects/details/:slug`
- `GET /tags`, `GET /technologies`, `GET /categories`, `GET /chains`, `GET /investors`
- `GET /search` o `/jobs/search` — búsqueda full-text

---

## 4. Stack técnico requerido

| Decisión              | Elección                                | Justificación                                              |
| --------------------- | --------------------------------------- | ---------------------------------------------------------- |
| Lenguaje              | TypeScript (Node ≥ 20)                  | Alineado con el stack de JobStash; SDK MCP más maduro      |
| SDK                   | `@modelcontextprotocol/sdk` (oficial)   | Soporte oficial de Anthropic                               |
| Transports            | `stdio` + `Streamable HTTP`             | stdio para local, HTTP para deploy remoto opcional         |
| HTTP client           | `undici` (built-in en Node 20)          | Cero deps externas, excelente perf                         |
| Validación            | `zod`                                   | Standard de facto, tipos derivados                         |
| Tipos OpenAPI         | `openapi-typescript`                    | Genera types a partir del spec                             |
| Build                 | `tsup`                                  | Zero-config, ESM + CJS                                     |
| Lint/format           | `eslint` + `prettier`                   | Estándar                                                   |
| Tests                 | `vitest` + `msw`                        | Rápido y mock HTTP idiomático                              |
| Logger                | `pino`                                  | Estructurado, low-overhead                                 |
| Cache                 | `lru-cache`                             | TTL para listas estáticas                                  |
| CI                    | GitHub Actions                          | Lint, test, build, publish-on-tag                          |
| Licencia              | **MIT**                                 | No copiamos código GPL-3.0, solo consumimos la API pública |

---

## 5. Estructura del proyecto

```
jobstash-mcp/
├── src/
│   ├── index.ts                  # bin entrypoint, parsea args, arranca server
│   ├── server.ts                 # factory: registra tools, resources, prompts
│   ├── config.ts                 # env vars + defaults + validación con zod
│   ├── api/
│   │   ├── client.ts             # JobstashClient (fetch + retry + cache + logging)
│   │   ├── types.ts              # generado por openapi-typescript
│   │   ├── schemas.ts            # zod schemas espejo de los types
│   │   └── errors.ts             # mapeo HTTP → McpError
│   ├── tools/
│   │   ├── search-jobs.ts
│   │   ├── get-job.ts
│   │   ├── search-organizations.ts
│   │   ├── get-organization.ts
│   │   ├── list-categories.ts
│   │   ├── list-chains.ts
│   │   ├── list-technologies.ts
│   │   ├── list-investors.ts
│   │   ├── get-recent-jobs.ts
│   │   └── compare-organizations.ts
│   ├── resources/
│   │   ├── job.ts                # jobstash://jobs/{slug}
│   │   ├── organization.ts       # jobstash://organizations/{slug}
│   │   └── catalog.ts            # jobstash://catalog/{categories|chains|technologies}
│   ├── prompts/
│   │   ├── find-my-next-crypto-job.ts
│   │   └── evaluate-organization.ts
│   └── utils/
│       ├── pagination.ts
│       └── logger.ts
├── scripts/
│   └── generate-types.ts         # descarga openapi.json y corre openapi-typescript
├── tests/
│   ├── client.test.ts
│   ├── tools/
│   │   ├── search-jobs.test.ts
│   │   └── get-organization.test.ts
│   └── fixtures/
│       └── *.json
├── .env.example
├── .gitignore
├── .eslintrc.cjs
├── .prettierrc
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── package.json                  # con "bin": { "jobstash-mcp": "./dist/index.js" }
├── Dockerfile
├── README.md
├── LICENSE                       # MIT
├── CHANGELOG.md
└── .github/
    ├── workflows/ci.yml
    └── workflows/release.yml
```

---

## 6. Especificación detallada de tools

Para **cada** tool: nombre exacto, descripción Markdown orientada a LLM (clara, con ejemplos de cuándo usarla), schema Zod del input, manejo de errores, paginación cuando aplique. Las descripciones van en **inglés** (los LLMs las parsean mejor); el README puede ser bilingüe.

### 6.1 `search_jobs`
Búsqueda principal de empleos. Inputs:

```ts
{
  query?: string;                     // full-text
  categories?: string[];              // ["Engineering", "Smart Contracts", ...]
  technologies?: string[];            // ["Solidity", "Rust", "TypeScript", ...]
  chains?: string[];                  // ["Ethereum", "Solana", ...]
  seniority?: "Junior" | "Mid" | "Senior" | "Lead";
  location_type?: "Remote" | "Hybrid" | "Onsite";
  employment_type?: "FullTime" | "PartTime" | "Contract" | "Internship";
  min_salary_usd?: number;            // anual
  max_salary_usd?: number;
  posted_within_days?: number;
  organization?: string;              // slug
  limit?: number;                     // default 20, max 100
  offset?: number;                    // default 0
}
```

Output: `{ items: JobSummary[], total: number, hasMore: boolean, nextOffset: number | null }`.

`JobSummary`: `slug, title, organization {slug, name, logoUrl}, locationType, employmentType, summary, applyUrl, postedAt, tags, salary?`.

### 6.2 `get_job`
`{ slug: string }` → detalle completo.

### 6.3 `search_organizations`
Filtros: `query, categories, chains, funding_stage, has_open_jobs, founded_after, headcount_range, limit, offset`.

### 6.4 `get_organization`
`{ slug: string }` → descripción, headcount, rondas, inversores, auditorías, hacks, jobs activos, proyectos.

### 6.5 `list_categories` / `list_chains` / `list_technologies` / `list_investors`
Sin inputs (o `{ query?: string }` para filtrar). **Cachear con TTL de 1 hora.**

### 6.6 `get_recent_jobs`
`{ hours?: number; days?: number; limit?: number }` → atajo a `search_jobs` ordenado por `postedAt desc`.

### 6.7 `compare_organizations` (bonus)
`{ slugs: string[] }` (2–5) → tabla comparativa estructurada: headcount, total raised, last round, audit count, hack count, open jobs.

---

## 7. Resources

Implementá `resources/list`, `resources/templates/list` y `resources/read`.

| URI template                                  | Contenido                       |
| --------------------------------------------- | ------------------------------- |
| `jobstash://jobs/{slug}`                      | JSON completo del empleo        |
| `jobstash://organizations/{slug}`             | JSON completo de la organización |
| `jobstash://catalog/categories`               | array de categorías             |
| `jobstash://catalog/chains`                   | array de cadenas                |
| `jobstash://catalog/technologies`             | array de tecnologías            |

`mimeType: "application/json"` en todos los casos.

---

## 8. Prompts (templates)

### 8.1 `find_my_next_crypto_job`
Args: `stack` (string), `seniority` (enum), `location_preference` (enum), `salary_floor_usd` (number opcional).
Genera un mensaje multi-paso que: 1) llama `search_jobs` con los filtros, 2) si hay >5 resultados, llama `get_organization` para los top 3, 3) presenta un resumen con pros/cons.

### 8.2 `evaluate_organization`
Args: `slug` (string).
Genera un prompt de due diligence: trae datos de la org, sus rondas, auditorías, hacks, jobs activos, y devuelve un análisis estructurado (red flags, green flags, score 1-10).

---

## 9. Configuración (env vars, validadas con zod en `config.ts`)

| Variable                        | Default                          | Descripción                                |
| ------------------------------- | -------------------------------- | ------------------------------------------ |
| `JOBSTASH_API_BASE_URL`         | (a confirmar al inspeccionar)    | Base URL de la API                         |
| `JOBSTASH_API_TOKEN`            | (vacío)                          | Solo si algún endpoint lo requiere         |
| `JOBSTASH_CACHE_TTL_SECONDS`    | `3600`                           | TTL para listas estáticas                  |
| `JOBSTASH_REQUEST_TIMEOUT_MS`   | `15000`                          | Timeout por request                        |
| `JOBSTASH_MAX_RETRIES`          | `3`                              | Reintentos en 5xx/red                      |
| `JOBSTASH_USER_AGENT`           | `jobstash-mcp/<version>`         | UA enviado en cada request                 |
| `LOG_LEVEL`                     | `info`                           | `trace\|debug\|info\|warn\|error`          |
| `MCP_TRANSPORT`                 | `stdio`                          | `stdio` o `http`                           |
| `MCP_HTTP_PORT`                 | `8765`                           | solo si transport=http                     |

---

## 10. Cliente HTTP (`api/client.ts`)

Requisitos:

1. **Singleton** con base URL configurable, instanciado en `server.ts`.
2. `undici.fetch` con `AbortController` para timeouts.
3. **Reintentos con backoff exponencial** (3 intentos, jitter) en 5xx, 429 y errores de red. NO en 4xx.
4. Respeta `Retry-After` si viene en el header.
5. **Cache LRU** (max 500 entradas, TTL configurable) para endpoints idempotentes (GETs). Clave: `method + url + sortedQueryString`.
6. **Logging estructurado** con pino: cada request loguea `{ method, url, status, durationMs }` en `info`, body completo solo en `debug`.
7. **User-Agent** identificable. Header `Accept: application/json`.
8. Validación de respuesta con el schema zod del endpoint correspondiente. Si falla, error claro en log y `McpError`.

---

## 11. Manejo de errores (`api/errors.ts`)

| Origen                    | McpError code        |
| ------------------------- | -------------------- |
| Zod input inválido        | `InvalidParams`      |
| 400 / 422                 | `InvalidParams`      |
| 401 / 403                 | `InvalidRequest`     |
| 404                       | `MethodNotFound` o un error semántico ("job not found") |
| 429                       | `InternalError` con mensaje "rate limited, retry later" |
| 5xx                       | `InternalError`      |
| Timeout / red             | `ConnectionClosed`   |
| Validación de response    | `InternalError`      |

**Nunca** filtrar el `JOBSTASH_API_TOKEN` ni headers internos en mensajes de error. Sanitizar antes de retornar.

---

## 12. Tests (mínimo exigido)

1. **Client (`tests/client.test.ts`):** happy path, retry en 503, no-retry en 400, timeout, cache hit, sanitización de errores. Mock con `msw`.
2. **Cada tool:** input válido, input inválido (Zod), respuesta vacía, paginación correcta. Fixtures JSON en `tests/fixtures/`.
3. **E2E con MCP Inspector:** script que lance el server por stdio, liste tools, llame `search_jobs` con un mock y valide el shape.
4. **Snapshot test** del JSON expuesto por `tools/list` y `resources/list` para detectar cambios accidentales en el contrato público del MCP.

Cobertura objetivo: **≥80% líneas, ≥70% branches**. Incluir `coverage` step en CI.

---

## 13. README.md (estructura obligatoria)

```
# jobstash-mcp

[badges: npm version, CI, license MIT, MCP compatible]

> Community MCP server for JobStash.xyz — bringing crypto-native job search to your AI assistant.

## What is this?
[1 párrafo]

## What is JobStash?
[1 párrafo + link a jobstash.xyz]

## Disclaimer
This is an unofficial community project. Not affiliated with JobStash. Uses the public API.

## Quick start
### With npx (recommended)
### Claude Desktop config
[snippet completo de claude_desktop_config.json listo para copiar]
### Claude Code (.mcp.json)
### Cursor / Continue / Zed
[snippets respectivos]

## Tools
[tabla con nombre, descripción corta, ejemplo de prompt]
### `search_jobs`
[descripción completa, schema, ejemplo]
... (cada tool)

## Resources
[tabla y ejemplos]

## Prompts
[ejemplos]

## Environment variables
[tabla]

## Local development
[clonar, instalar, generate-types, run, test]

## Contributing
[guidelines]

## License
MIT

## Acknowledgements
JobStash team for the open API and middleware.
```

---

## 14. Distribución

1. **npm:** publicar como `jobstash-mcp` (o `@<scope>/jobstash-mcp` si el nombre no está libre). `package.json` con `"bin"`, `"files": ["dist"]`, `"engines": { "node": ">=20" }`.
2. **Dockerfile** multi-stage (builder con devDeps + runtime con Node 20-alpine y solo `dist/`).
3. **Submisiones:**
   - PR a `https://github.com/modelcontextprotocol/registry`
   - Listing en `https://glama.ai/mcp/servers`
   - Listing en `https://www.pulsemcp.com`
   - Tweet con la cuenta `@jobstash_xyz` etiquetada (proponer en el README, no hacerlo automáticamente)
4. **Versionado semver**, releases automáticos por tags (`vX.Y.Z`), `CHANGELOG.md` mantenido con `changesets` o a mano.

---

## 15. Consideraciones especiales

- **Rate limiting:** si la API impone límites, respetarlos y exponer el error con un mensaje útil al cliente MCP. No reintentar agresivamente.
- **Privacidad:** nada se persiste en disco. Cache solo en memoria.
- **Logs:** no loguear queries del usuario en `info`. Solo en `debug`.
- **Compatibilidad MCP:** target spec `2025-06-18` o superior, con backward compat al `2024-11-05`.
- **Internacionalización:** descripciones de tools en inglés. README puede tener sección bilingüe ES/EN.
- **Robustez ante cambios de API:** si JobStash agrega/quita campos, el server NO debe crashear; debe loggear `warn` y devolver el subset disponible. Los schemas zod deben usar `.passthrough()` o `.partial()` donde tenga sentido.

---

## 16. Fuera de alcance (no construir)

- Flujos de autenticación con wallet o sign-in.
- Tools mutativos: postear empleos, aplicar a empleos, dejar reviews. Todos requieren auth y no son apropiados para un wrapper de terceros.
- Scraping de la SPA. Siempre usar la API REST documentada del middleware.
- UI propia (Next.js, etc.). Esto es solo un servidor MCP.

---

## 17. Plan de ejecución (en orden, sin saltarse pasos)

1. **Bootstrap:** `npm init -y`, instalar deps, configurar `tsconfig`, `eslint`, `prettier`, `vitest`, GitHub Actions skeleton.
2. **Generación de tipos:** ejecutar el plan de la sección 3 hasta tener `openapi.json` o un `openapi.yaml` manual; correr `openapi-typescript` para producir `src/api/types.ts`.
3. **Cliente HTTP:** TDD. Primero los tests con `msw`, después la implementación.
4. **Tools mínimos viables:** `search_jobs` y `get_job`, con tests.
5. **Smoke test manual** con MCP Inspector contra la API real para validar que el contrato existe como suponemos.
6. **Resto de tools, resources, prompts.**
7. **README completo** con snippets de configuración para todos los clientes principales.
8. **CI** con `lint + typecheck + test + build` en cada PR, `publish` en tags.
9. **Dockerfile** y test de imagen.
10. **Submitir al MCP Registry oficial** y a Glama / PulseMCP.

---

## 18. Entregables finales

- [ ] Repo público en GitHub con todo lo anterior implementado y CI pasando.
- [ ] Paquete publicado en npm (`latest`) y al menos un tag semver.
- [ ] Imagen Docker publicada (GHCR o Docker Hub).
- [ ] PR enviado al MCP Registry oficial.
- [ ] Listing en al menos uno de Glama / PulseMCP / mcpservers.org.
- [ ] Demo (gif o Loom) en el README mostrando Claude Desktop usando el MCP para buscar un empleo de Solidity remoto > $120k.

---

## 19. Formato de tu respuesta

Antes de empezar a generar archivos:

1. **Confirmá** que entendiste el alcance y mencioná cualquier ambigüedad que detectes.
2. **Proponé un plan** numerado siguiendo la sección 17, ajustado a lo que hayas detectado al investigar la API real (paso 1 antes de codear).
3. **Pedí mi confirmación** antes de generar código.
4. **Una vez confirmado**, generá los archivos en el orden de la sección 5. Para cada archivo: contenido completo + 1-3 líneas explicando decisiones técnicas no triviales. No me preguntes por cada uno; trabajá en bloques de 4-6 archivos relacionados.
5. Al final de cada bloque, **listá comandos exactos** para verificar lo hecho (ej: `npm test`, `npm run build`, `npx @modelcontextprotocol/inspector dist/index.js`).

Si en algún momento la API real difiere de mis suposiciones, **adaptá el código a la realidad** y avisame en el resumen del bloque.

Empezá ahora con los pasos 1 y 2.
