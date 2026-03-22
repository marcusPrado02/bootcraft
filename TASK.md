# Bootcraft – Roadmap de Implementação

> **Princípio guia:** Bootcraft não é um gerador de arquivos. É um "golden path enforcer" que cria projetos completos, prontos para evoluir, com decisões explícitas e padrões maduros desde o dia zero.

---

## Estado Atual (Baseline Implementado)

O que já existe e funciona:

- [x] CLI layer com Commander.js (`init`, `doctor`)
- [x] `TemplateEngine` – interpolação `{{var}}`, `.bootcraftignore`
- [x] `Generator` – pipeline de steps sequenciais
- [x] `ManifestLoader` – carrega e valida `pack.yaml` / `archetype.yaml` com Zod
- [x] `PackResolver` – resolve pack local + hash SHA-256
- [x] `RegistryService` – catálogo de packs em `~/.bootcraft/registry.json`
- [x] `StateStore` – persiste `.bootcraft/state.json` com atomic write
- [x] `InitService` – orquestra inicialização de projeto
- [x] `DoctorService` – validação estrutural básica do projeto gerado
- [x] Testes unitários para todos os serviços core
- [x] `BootcraftError` – erros tipados com códigos

---

## Fase 1 – MVP Utilizável (CLI Completa e Testável)

> **Meta:** Bootcraft deve ser executável de ponta a ponta com uma experiência de usuário mínima decente. Nenhuma feature nova — solidificar o que existe.

### 1.1 UX da CLI

- [ ] **`--version` flag** – ler versão do `package.json` e exibir
- [ ] **Progress reporting** – exibir progresso dos steps (`[2/5] Applying templates...`) durante `init` e `generate`
- [ ] **`--verbose` / `--debug` flags** – propagar log-level por todos os serviços
- [ ] **`--dry-run` flag no `init`** – listar arquivos que seriam escritos sem tocar o filesystem

### 1.2 Prompts Interativos

- [ ] **Modo interativo no `init`** – quando flags obrigatórias são omitidas, usar `@inquirer/prompts` para perguntar: pack path, archetype, nome do projeto, variáveis `-D`
- [ ] **Confirmação antes de sobrescrever** – se diretório de saída não estiver vazio e `--force` não for passado, perguntar ao usuário antes de prosseguir

### 1.3 Pack Fixture de Referência

- [ ] **Criar `fixtures/baseline-pack/`** – pack mínimo real com `pack.yaml`, templates e capabilidades que representa o "dia zero" de um projeto. Serve como referência canônica e base dos testes E2E.
  - Estrutura gerada: `src/domain`, `src/app`, `src/infra`, `src/interfaces`, `tests/unit`, `docs/architecture`, `.env.example`, `README.md`, `.gitignore`
  - Capabilidades declaradas: `health-endpoint`, `graceful-shutdown`, `structured-logging`

### 1.4 Testes E2E

- [ ] **E2E de `init` com `fixtures/baseline-pack`** – rodar `init` em diretório temporário real e validar estrutura gerada
- [ ] **E2E de `doctor`** – gerar projeto em temp dir e garantir que doctor passa; remover arquivo e garantir que falha com mensagem correta
- [ ] **CLI integration tests com `execa`** – compilar o binário e testar stdout/stderr/exit codes de todos os comandos

### 1.5 Build & DX

- [ ] **Pre-commit hook (husky + lint-staged)** – rodar `eslint` e `tsc --noEmit` em staged files antes de cada commit
- [ ] **Coverage reporting** – integrar `c8` nos scripts de test; definir threshold mínimo de 80%

---

## Fase 2 – Template Engine Completa

> **Meta:** Templates devem suportar lógica real para que packs possam gerar código condicional e repetitivo sem gambiarras.

### 2.1 Lógica de Templates

- [ ] **Conditional blocks** – suporte a `{{#if varName}} ... {{/if}}` e `{{#unless varName}} ... {{/unless}}`
- [ ] **Loop blocks** – suporte a `{{#each items}} ... {{/each}}` para seções repetitivas
- [ ] **Partials / includes** – `{{> partialName}}` para snippets compartilhados entre templates de um mesmo pack

### 2.2 Helpers Built-in

- [ ] **String helpers** – `{{upper varName}}`, `{{lower varName}}`, `{{camelCase varName}}`, `{{pascalCase varName}}`, `{{kebabCase varName}}`, `{{snakeCase varName}}`
- [ ] **Helpers de data** – `{{year}}`, `{{date}}` disponíveis automaticamente em qualquer template

### 2.3 Segurança e Debugging

- [ ] **Avisos de variáveis não resolvidas** – coletar e exibir `{{varName}}` não substituídos após geração (ao invés de passar silenciosamente)
- [ ] **Strict mode para variáveis** – flag `--strict-vars` ou configuração no manifest que aborta geração se qualquer variável ficar sem valor
- [ ] **Glob negation no `.bootcraftignore`** – suporte a `!path/to/include` para re-incluir subsets de paths ignorados

---

## Fase 3 – Sistema de Manifests Maduro

> **Meta:** Packs devem ser auto-descritivos, declarativos e validáveis. O `InitService` não deve hardcodar nenhuma lógica de geração.

### 3.1 Manifests Declarativos

- [ ] **`variables` declaration no manifest** – declarar variáveis esperadas com tipo, default e descrição; validar na carga do manifest
  ```yaml
  variables:
    - name: projectName
      type: string
      required: true
      description: "Nome do serviço (kebab-case)"
    - name: nodeVersion
      type: string
      default: "20"
  ```
- [ ] **`capabilities` no manifest** – declarar capabilities do pack com id, nome, descrição e `default: true/false`
- [ ] **`steps` no manifest** – packs declaram seus próprios steps; `InitService` executa o que o manifest define (não hardcoded)
- [ ] **`requires` / `conflicts` entre packs** – express compatibilidade antes de iniciar geração; falha rápida e clara
- [ ] **`presets` no manifest** – grupos nomeados de valores padrão para capabilities e variáveis
- [ ] **Validação do `templateRoot`** – erro claro se o diretório declarado no manifest não existir

### 3.2 Alinhamento do Schema Zod

- [ ] **Atualizar schemas Zod** para cobrir `variables`, `capabilities`, `steps`, `requires`, `conflicts`, `presets`
- [ ] **Mensagens de erro amigáveis** – erros de validação Zod devem apontar campo exato e valor inválido com sugestão

---

## Fase 4 – Pipeline de Geração Completo

> **Meta:** Implementar o pipeline canônico: Baseline → Stack → Persistence → Messaging → Docs → State → Doctor. Cada stage é opcional exceto Baseline e State.

### 4.1 Comando `generate`

- [ ] **`bootcraft generate`** – comando para aplicar packs adicionais em projeto já inicializado; lê state.json, resolve packs pendentes, executa stages opcionais
- [ ] **Sub-stages do `generate`**:
  - [ ] `generate stack` – selecionar e aplicar pack de stack (TypeScript/Node, Go, Python/FastAPI)
  - [ ] `generate persistence` – aplicar pack de persistência (PostgreSQL, MongoDB, DynamoDB)
  - [ ] `generate messaging` – aplicar pack de mensageria (Kafka, RabbitMQ, SQS)
  - [ ] `generate docs` – aplicar pack de documentação (OpenAPI spec, ADR templates)

### 4.2 Orquestração Multi-Pack

- [ ] **Resolução de dependências** – ordenar packs respeitando `requires` antes de iniciar qualquer step
- [ ] **Validação de conflicts** – detectar packs incompatíveis antes de gerar qualquer arquivo
- [ ] **Rollback em falha** – se qualquer step lançar erro, desfazer arquivos escritos e restaurar estado anterior

### 4.3 Steps Adicionais

- [ ] **`mergeYamlStep`** – deep-merge de arquivos YAML (docker-compose, manifests Kubernetes), análogo ao `mergeJsonStep` existente

---

## Fase 5 – Pack Management

> **Meta:** Usuário deve poder gerenciar o catálogo de packs de forma explícita, sem depender do `init` para registrar.

- [ ] **`bootcraft pack list`** – listar packs registrados em `~/.bootcraft/registry.json` com id, versão e timestamp
- [ ] **`bootcraft pack info <id>`** – mostrar detalhes completos do manifest: capabilities, variables, steps, presets
- [ ] **`bootcraft pack add <path>`** – registrar pack local como operação standalone (separado do `init`)
- [ ] **`bootcraft pack remove <id>`** – remover pack do registry
- [ ] **Semantic version comparison** – ao resolver pack por id, selecionar maior versão semver compatível
- [ ] **Deduplicação por hash** – detectar quando dois paths locais têm mesmo hash de conteúdo e evitar entradas duplicadas no registry

---

## Fase 6 – Packs Reais (Conteúdo dos Stacks)

> **Meta:** Bootcraft deve ter packs concretos que geram projetos reais. Sem isso, é só um framework vazio.

### 6.1 `baseline` pack (v0.1.0)

- [ ] **Templates completos**: estrutura Clean Architecture, `README.md` com seção de decisões, `ADR-0001-initial-architecture.md`, `.env.example`, `.gitignore`
- [ ] **Health endpoint scaffolding**: `src/interfaces/http/health.ts` com `/health` e `/ready`
- [ ] **Graceful shutdown**: hook de shutdown na inicialização da aplicação

### 6.2 `stack-typescript-node` pack (v1.0.0)

- [ ] **`package.json`** com scripts: `build`, `start`, `dev`, `test`, `lint`, `typecheck`
- [ ] **`tsconfig.json`** opinativo (strict, paths, decorators)
- [ ] **ESLint + Prettier** configurados
- [ ] **Vitest** como test runner com config base
- [ ] **Preset `minimal`**: sem framework web (apenas Node.js puro)
- [ ] **Preset `nestjs`**: scaffolding inicial com NestJS
- [ ] **CI básico**: `.github/workflows/ci.yml` com build, lint, test

### 6.3 `persistence-postgres` pack (v1.0.0)

- [ ] **Conexão**: `src/infra/database/connection.ts` com pool de conexão
- [ ] **Repository interface**: `src/domain/repositories/base-repository.ts` (porta)
- [ ] **PostgreSQL adapter**: `src/infra/database/postgres-adapter.ts` (adaptador)
- [ ] **Migrations folder**: `migrations/` com README de convenções
- [ ] **`.env.example`** atualizado com variáveis de banco
- [ ] **Integration test utility**: helper para subir banco em teste

### 6.4 `docs-openapi` pack (v1.0.0)

- [ ] **`docs/api/openapi.yaml`** com template inicial válido (info, paths /health)
- [ ] **ADR template**: `docs/architecture/ADR-TEMPLATE.md`

---

## Fase 7 – Doctor Maduro

> **Meta:** Doctor deve ser a fonte da verdade sobre saúde do projeto — data-driven, extensível e com capacidade de auto-correção.

- [ ] **Checks data-driven** – mover definições de checks para estrutura de configuração; novos checks sem modificar `DoctorService`
- [ ] **Validar conteúdo do OpenAPI** – checar que `openapi.yaml` tem pelo menos um path e um info block válido (não apenas existência)
- [ ] **Validar conteúdo do ADR** – checar que ADR contém seções obrigatórias (Context, Decision, Consequences)
- [ ] **Dependency doctor check** – verificar que dependências do `package.json` declaradas pelos packs estão instaladas
- [ ] **TypeScript compilation check** – rodar `tsc --noEmit` como check e reportar erros de compilação
- [ ] **Test pyramid check** – verificar `tests/unit`, `tests/integration`, `tests/e2e`
- [ ] **`--fix` flag no `doctor`** – para checks com auto-fix (diretório faltando, etc.), criar artifact e re-rodar check

---

## Fase 8 – State & Registry Avançado

> **Meta:** O state.json deve ser auditável e migrável. O registry deve suportar evolução.

- [ ] **Step-level execution history no state** – registrar cada step com nome, pack id, timestamp e outcome
- [ ] **Per-pack capability metadata no state** – quais packs contribuíram quais capabilities para doctor poder cruzar referências
- [ ] **State schema migration** – quando `schemaVersion` está desatualizado, rodar migração antes de usar
- [ ] **Remote registry** – `BOOTCRAFT_REGISTRY_URL` aponta para endpoint HTTP; baixar e cachear metadata de packs remotamente

---

## Fase 9 – Qualidade e Maturidade

> **Meta:** Bootcraft deve ser confiável o suficiente para uso real em times. Zero regressões toleradas.

- [ ] **Property-based tests para `mergeJsonStep`** – usar `fast-check` para fuzzar inputs e validar invariantes de deep-merge
- [ ] **ESM dual-export** – `tsup.config.ts` emitindo CJS + ESM com declarações de tipo (`dts: true`)
- [ ] **Benchmark de geração** – medir tempo de `init` de ponta a ponta; garantir < 5s para baseline pack

---

## Critérios de "Pronto" por Fase

| Fase | Critério de Conclusão |
|------|----------------------|
| 1 | `bootcraft init --pack ./fixtures/baseline-pack --out /tmp/myservice` funciona; E2E passa; doctor valida projeto gerado |
| 2 | Template com `{{#if}}`, `{{#each}}` e helpers de string funciona nos fixtures |
| 3 | Manifest declara variables e capabilities; Zod valida; InitService lê steps do manifest |
| 4 | `bootcraft generate stack` aplica `stack-typescript-node` em projeto já inicializado; rollback funciona |
| 5 | `bootcraft pack list/info/add/remove` operacionais; sem duplicatas no registry |
| 6 | Projeto gerado com `baseline` + `stack-typescript-node` compila, testa e tem CI funcional |
| 7 | Doctor tem 10+ checks data-driven; `--fix` corrige checks com auto-fix |
| 8 | State de um projeto com 3 packs tem histórico completo de steps e capabilities |
| 9 | Coverage ≥ 80%; zero regressões; binário publicável via npm |

---

## Antipadrões a Evitar

- Gerar código sem decisão explícita registrada
- Hardcodar lógica de geração fora dos manifests
- Templates que assumem valores sem declarar variáveis
- Doctor que só verifica existência de arquivo (não conteúdo)
- Packs sem `capabilities` declaradas (inauditável)
- Projetos que geram mas não compilam/rodam no dia 1
