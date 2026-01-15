# Guia de Uso - weirdnet Deploy System

## Visão Geral

O sistema de deploy do weirdnet foi simplificado em um único script: `./uni`. Este script processa novos links, faz deduplicação automática, normaliza dados e faz deploy dos sites `directory.weirdnet.org` e `links.weirdnet.org`.

## Estrutura de Arquivos

```
weirdscripts/
├── uni                    # Script principal (bash wrapper)
├── dir.txt                # Fila de links para directory (isDirectory: true)
├── links.txt              # Fila de links para links (isDirectory: false)
├── processed/             # Arquivos processados (backup automático)
└── tools/
    └── uni.mjs            # Script Node.js principal
```

## Como Adicionar Novos Links

### 1. Editar os Arquivos de Fila

Edite `dir.txt` ou `links.txt` (ou ambos) no diretório `weirdscripts/`.

**Formato obrigatório:**

```
categoria: tag1, tag2, tag3
https://exemplo.com: Título do Site: Descrição completa do site aqui.
https://outro.com: Outro Site: Outra descrição.
```

### 2. Regras Importantes

- **Primeira linha**: Deve ser a categoria e tags (sem `http://` ou `https://`)
- **Formato**: `categoria: tag1, tag2, tag3`
- **Linhas de links**: `URL: Título: Descrição`
- **Delimitador**: Use `: ` (dois pontos + espaço) para separar URL, Título e Descrição
- **URLs**: Devem começar com `http://` ou `https://`
- **Comentários**: Linhas começando com `#` são ignoradas
- **Linhas vazias**: São ignoradas

### 3. Exemplo Completo

```txt
archive: vintage, web-history
https://fogcam.org: FogCam (The Oldest Webcam): Recognized as the world's oldest operating webcam still in existence. Started by students at San Francisco State University, it continues to broadcast live images of the campus, maintaining its original 1994 layout and low-resolution aesthetic.
https://archive.org: Wayback Machine (Internet Archive): The ultimate tool for browsing the old internet. It hosts billions of archived versions of sites that are no longer online, allowing you to "travel back in time" to any specific year.
```

### 4. Diferença entre `dir.txt` e `links.txt`

- **`dir.txt`**: Links adicionados aqui terão `isDirectory: true` e aparecerão destacados no `directory.weirdnet.org`
- **`links.txt`**: Links adicionados aqui terão `isDirectory: false` (mas não demove links que já são `true`)

**Importante**: Ambos os arquivos processam links que aparecem em **ambos os sites** (`directory.weirdnet.org` e `links.weirdnet.org`). A diferença é apenas no flag `isDirectory`.

## Executando o Deploy

### Comando Básico

```bash
cd /home/weirdnet/_src/weirdscripts
./uni
```

### Com Reload do Nginx

```bash
./uni --reload-nginx
```

### Sem Health Checks

```bash
./uni --no-check
```

### Combinando Flags

```bash
./uni --reload-nginx --no-check
```

## O que Acontece Durante o Deploy

O script `./uni` executa as seguintes etapas na ordem:

1. **Deduplicação**: Remove links duplicados (mesma URL), mantendo o mais antigo
2. **Normalização**: Garante que todos os links tenham `id` e datas no formato `YYYY-MM-DD`
3. **Processamento de Filas**:
   - Lê `dir.txt` e processa links com `isDirectory: true`
   - Lê `links.txt` e processa links com `isDirectory: false`
4. **Build**: Gera os sites estáticos usando Eleventy
   - `directory.weirdnet.org`
   - `links.weirdnet.org`
5. **Deploy**: Copia arquivos para os diretórios de produção via rsync
6. **Health Checks**: Verifica se os sites estão respondendo (se não usar `--no-check`)
7. **Reload Nginx**: Recarrega o nginx (se usar `--reload-nginx`)
8. **Limpeza**: Arquiva e limpa os arquivos `dir.txt` e `links.txt` processados

## Segurança e Validações

O sistema possui várias proteções:

- **Nunca apaga links únicos**: Apenas remove duplicados (mesma URL)
- **Preserva datas originais**: `addedAt` original é sempre mantido
- **Validações de segurança**: Verifica que nenhum link foi perdido durante o processamento
- **Backups automáticos**: Cria backup de `links.json` antes de cada escrita
- **Arquivos processados**: `dir.txt` e `links.txt` são arquivados em `processed/` antes de serem limpos

## Verificando se Funcionou

### 1. Verificar Logs do Deploy

O script mostra mensagens como:

```
[deduplicate] Cleaned 119 -> 104 links (removed 15 duplicate(s), preserved 104 unique URLs)
[OK] Directory JSON updated. added=7 updated=0 total=111
[OK] Links JSON updated. added=0 updated=0 total=111
[RUN] build directory...
[RUN] build links...
[RUN] deploy directory (rsync)...
[RUN] deploy links (rsync)...
[OK] Deploy completo!
```

### 2. Verificar os Sites

- `https://directory.weirdnet.org` - Deve mostrar os novos links
- `https://links.weirdnet.org` - Deve mostrar os novos links e estatísticas corretas

### 3. Verificar Estatísticas

No site `links.weirdnet.org`, as estatísticas devem mostrar:
- **today**: Número de links adicionados hoje
- **this month**: Número de links adicionados este mês
- **latest**: Data do link mais recente
- **total**: Total de links

## Atualizando Links Existentes

Para atualizar um link existente, simplesmente adicione-o novamente na fila com as novas informações. O sistema irá:

- **Atualizar** o link se a URL já existir (mesma URL, case-insensitive)
- **Mesclar metadados**: Tags, categorias, descrições serão mescladas
- **Preservar data original**: `addedAt` original é mantido
- **Atualizar `isDirectory`**: Se adicionar em `dir.txt`, o link será marcado como `isDirectory: true`

## Troubleshooting

### Links não aparecem nos sites

1. Verifique se os links foram processados (arquivos `dir.txt` e `links.txt` foram limpos)
2. Verifique se o build foi executado com sucesso (procure por erros nos logs)
3. Verifique se o deploy foi executado (procure por mensagens de rsync)
4. Verifique se os links têm `id`, `url` e `title` válidos

### Estatísticas mostram 0 para "today"

- Verifique se a data dos links está no formato `YYYY-MM-DD`
- Verifique se a data corresponde à data atual (timezone de São Paulo)
- Execute `node weirdscripts/tools/test-stats.mjs` para diagnosticar

### Erro de parsing

- Verifique se a primeira linha é a categoria (sem `http://` ou `https://`)
- Verifique se as URLs começam com `http://` ou `https://`
- Verifique se está usando `: ` (dois pontos + espaço) como delimitador
- Verifique se não há caracteres especiais que quebrem o formato

### Links duplicados aparecem

O sistema faz deduplicação automática, mas se ainda aparecerem duplicados:

1. Execute `./uni` novamente (a deduplicação roda automaticamente)
2. Verifique se as URLs são realmente diferentes (case-sensitive na comparação, mas normalizadas internamente)

## Arquivos Processados

Após o processamento bem-sucedido, os arquivos `dir.txt` e `links.txt` são:

1. **Arquivados** em `weirdscripts/processed/` com timestamp
2. **Limpados** (ficam vazios)

Os arquivos processados ficam em `weirdscripts/processed/` para referência futura.

## Estrutura de Dados

Os links são armazenados em `data/links.json` com a seguinte estrutura:

```json
{
  "id": "slug-do-link",
  "url": "https://exemplo.com",
  "title": "Título do Site",
  "desc": "Descrição completa",
  "category": "categoria",
  "tags": ["tag1", "tag2"],
  "addedAt": "2026-01-15",
  "isDirectory": true
}
```

## Comandos Úteis

### Ver links mais recentes

```bash
jq '.[0:5] | .[] | {title, addedAt, url}' /home/weirdnet/_src/data/links.json
```

### Contar links por data

```bash
jq '.[] | .addedAt' /home/weirdnet/_src/data/links.json | sort | uniq -c
```

### Verificar links duplicados

```bash
jq -r '.[] | .url' /home/weirdnet/_src/data/links.json | tr '[:upper:]' '[:lower:]' | sort | uniq -d
```

### Testar parsing localmente

```bash
cd /home/weirdnet/_src/weirdscripts
node tools/test-parse.mjs
```

### Testar estatísticas

```bash
cd /home/weirdnet/_src
node weirdscripts/tools/test-stats.mjs
```

## Notas Importantes

- **Nunca edite `links.json` manualmente**: Use sempre os arquivos de fila (`dir.txt` e `links.txt`)
- **Backups automáticos**: Backups de `links.json` são criados em `data/backups/` antes de cada escrita
- **Gitignore**: `dir.txt` e `links.txt` estão no `.gitignore` (não são versionados)
- **Arquivos processados**: Ficam em `processed/` e também não são versionados
- **Timezones**: Todas as datas usam timezone de São Paulo (America/Sao_Paulo)

## Suporte

Em caso de problemas:

1. Verifique os logs do deploy
2. Verifique os arquivos de backup em `data/backups/`
3. Verifique os arquivos processados em `weirdscripts/processed/`
4. Execute os scripts de teste para diagnosticar
