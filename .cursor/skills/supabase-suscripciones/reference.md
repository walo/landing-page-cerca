# Configuración MCP Supabase — Proyecto Suscripciones

## Configurar el MCP con el proyecto

Para que el MCP de Supabase opere solo sobre el proyecto **suscripciones**, añade `--project-ref` en los args cuando uses `@supabase/mcp-server-supabase` vía npx.

### Via mcp.json (command + args)

```json
"supabase-mcp-server": {
  "command": "npx",
  "args": [
    "-y",
    "@supabase/mcp-server-supabase@latest",
    "--project-ref",
    "fervyhznyunpyunevmzb",
    "--access-token",
    "<tu-access-token>"
  ],
  "env": {}
}
```

### Via URL (streamableHttp)

Si usas la URL del servidor HTTP:

```
https://mcp.supabase.com/mcp?project_ref=fervyhznyunpyunevmzb
```

## Credenciales del proyecto (environment.ts)

- **URL**: `https://fervyhznyunpyunevmzb.supabase.co`
- **anon key**: Usar la de `environment.ts` del frontend (no exponer `service_role`)
