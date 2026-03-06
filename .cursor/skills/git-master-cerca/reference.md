# Git Master Cerca — Referencia Detallada

## GitHub MCP — Herramientas Disponibles

**Servidor**: `user-github`. Usar `call_mcp_tool` con `server: "user-github"`.

### create_branch
Crea rama en el remoto.
```json
{
  "owner": "org-o-usuario",
  "repo": "nombre-repo",
  "branch": "feature/nombre-funcionalidad",
  "from_branch": "develop"
}
```

### create_pull_request
Crea PR.
```json
{
  "owner": "org-o-usuario",
  "repo": "nombre-repo",
  "title": "feat(module): descripción",
  "head": "feature/nombre",
  "base": "develop",
  "body": "## Qué\n...\n## Por qué\n...\n## Cómo\n...\n## Testing\n..."
}
```

### list_pull_requests
Lista PRs por estado/base/head.
```json
{
  "owner": "org-o-usuario",
  "repo": "nombre-repo",
  "state": "open",
  "base": "develop",
  "head": "org:feature/nombre"
}
```

### merge_pull_request
Fusiona PR.
```json
{
  "owner": "org-o-usuario",
  "repo": "nombre-repo",
  "pull_number": 42,
  "merge_method": "merge",
  "commit_title": "feat(module): descripción"
}
```

### push_files
Push de archivos (commit directo).
```json
{
  "owner": "org-o-usuario",
  "repo": "nombre-repo",
  "branch": "feature/nombre",
  "files": [{"path": "ruta/archivo.ts", "content": "..."}],
  "message": "feat(module): descripción"
}
```

### list_commits
Lista commits de una rama.
```json
{
  "owner": "org-o-usuario",
  "repo": "nombre-repo",
  "sha": "develop"
}
```

## Workflow Feature (MCP)

1. **Crear rama**: `create_branch` con `from_branch: "develop"`, `branch: "feature/nombre"`.
2. **Desarrollar**: commits locales o `push_files` si aplica.
3. **Crear PR**: `create_pull_request` con `head: "feature/nombre"`, `base: "develop"`.
4. **Revisar**: `get_pull_request`, `list_pull_requests`.
5. **Merge**: `merge_pull_request` con `merge_method: "merge"`.

## Workflow Hotfix (MCP)

1. **Crear rama**: `create_branch` con `from_branch: "main"`, `branch: "hotfix/nombre"`.
2. **Corregir**: commits `fix:`.
3. **PR a main**: `create_pull_request` → `merge_pull_request`.
4. **PR a develop**: `create_pull_request` (head: hotfix, base: develop) → merge.

## Workflow Release (MCP + Terminal)

1. **PR develop → main**: `create_pull_request` → `merge_pull_request`.
2. **Tags** (solo terminal, no MCP): `git tag -a v1.0.0 -m "Release v1.0.0"` y `git push origin v1.0.0`.

## Workflows Manuales (Terminal)

Usar cuando no hay MCP o se prefiere control manual.

### Feature (Terminal)
```bash
git checkout develop && git pull origin develop
git checkout -b feature/nombre-funcionalidad
git add . && git commit -m "feat(module): descripción clara"
git push origin feature/nombre-funcionalidad
# Crear PR en GitHub: feature/nombre → develop
# Code Review → Merge → Eliminar rama
```

### Hotfix (Terminal)
```bash
git checkout main && git pull origin main
git checkout -b hotfix/nombre-error
git add . && git commit -m "fix(critical): descripción del error"
git push origin hotfix/nombre-error
# PR hotfix → main en GitHub → merge
git checkout main && git pull origin main
git checkout develop && git merge --no-ff hotfix/nombre-error && git push origin develop
git branch -d hotfix/nombre-error
```

### Release (Terminal)
```bash
git checkout develop && git pull origin develop
# PR develop → main en GitHub, tests, merge
git checkout main && git pull origin main
git tag -a v1.0.0 -m "Release v1.0.0: Gateway SaaS"
git push origin v1.0.0
```

### Sync local
```bash
git checkout develop && git pull --rebase origin develop
```

## Alias Git
```bash
git config --global alias.cmt '!f() { git add . && git commit -m "$1"; }; f'
# Uso: git cmt "feat(module): descripción"
```

## Gestión de PRs

**Descripción**: Qué, Por qué, Cómo, Testing.
**Registro en Notion**: Fecha, rama, commits, archivos modificados, propósito.
