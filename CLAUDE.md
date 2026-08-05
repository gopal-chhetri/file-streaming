# CLAUDE.md: Agent Instructions

## Project Structure

```
file-streaming/
├── backend/               ← NestJS API
│   ├── src/               ← application modules
│   ├── test/              ← unit + e2e tests
│   ├── package.json
│   ├── nest-cli.json
│   └── tsconfig*.json
├── frontend/              ← React + Vite app (Phase 8)
├── deployments/
│   ├── local-dev/         ← Docker Compose for local development
│   │   ├── compose.yml
│   │   ├── Dockerfile.backend
│   │   └── .env.example
│   └── production/        ← production deployment configs
├── .claude/               ← specs, architecture, phases
└── Makefile               ← convenience commands
```

Before any code changes, read these files in order:

1. `.claude/PRD.md`: product requirements
2. `.claude/ARCHITECTURE.md`: tech stack, data flow, deployment
3. `.claude/DESIGN.md`: UI/UX design references
4. `.claude/PHASES.md`: build phase checklist
5. `.claude/RULES.md`: coding conventions and constraints
6. `.claude/MEMORY.md`: current session progress
    After each session, update `.claude/MEMORY.md` with progress made.
