# Pronto-PDF-Scan

Aplicação web para captura de documentos, OCR e exportação em formatos pesquisáveis.

## Instalação local

### Pré-requisitos

- Node.js 20+
- npm 10+

### Passos

```bash
npm install
```

## Desenvolvimento local (client)

Suba o front-end em modo de desenvolvimento:

```bash
npm run dev:client
```

Por padrão o Vite inicia em `http://localhost:5000`.

## Checagem de tipos

Execute validação TypeScript do projeto:

```bash
npm run check
```

## Build do client

Gere artefatos de produção do front-end:

```bash
npm run build:client
```

A saída é gerada em `dist/public`.

## Deploy no Cloudflare Pages

### Configuração de build

- **Build command**: `npm run build:client`
- **Build output directory**: `dist/public`
- **Node.js version**: 22.x ou superior

### Passo a passo

1. Conecte seu repositório Git ao Cloudflare Pages
2. Configure a variável de ambiente `Node_ENV` como `production`
3. O Cloudflare automaticamente detectará o build command e output directory via `wrangler.toml`
4. As redireções SPA estão configuradas em `client/public/_redirects`
5. Os headers de segurança estão em `client/public/_headers`

### SPA redirects

Para rotas client-side funcionarem em refresh/deep-link:

```txt
/* /index.html 200
```

Este arquivo já existe em `client/public/_redirects`.

---

## Login por e-mail + Google/Microsoft + acesso em vários dispositivos (Supabase)

O app tem uma aba **Conta** que permite:

- Entrar com **e-mail (link mágico)**, **Google** ou **Microsoft**
- Salvar **PDFs** na nuvem e baixar depois no PC
- Salvar um **Projeto editável** (pacote `.zip`) para importar e continuar editando em outro aparelho

### 1) Criar projeto no Supabase

1. Crie um projeto no Supabase.
2. Copie:
   - **Project URL**
   - **Anon public key**

### 2) Configurar provedores de login

No painel do Supabase, em **Authentication → Providers**, habilite:

- **Email** (para login por link/magic link)
- **Google**
- **Azure** (Microsoft)

Adicione as Redirect URLs (exemplos):

- `https://seu-site.pages.dev/auth/callback`
- `http://localhost:5173/auth/callback`

### 3) Criar bucket de Storage

Crie um bucket privado chamado **`prontopdf`**.

O app salva arquivos assim:

- `users/<userId>/pdf/<docId>.pdf`
- `users/<userId>/bundle/<docId>.zip`

### 4) Políticas de segurança (Storage + RLS)

No Supabase, habilite RLS e aplique políticas para permitir que cada usuário acesse só os próprios arquivos.

Exemplo (ajuste se mudar o nome do bucket):

```sql
-- Bucket: prontopdf (PRIVATE)

-- SELECT
create policy "read own prontopdf files"
on storage.objects for select
using (
  bucket_id = 'prontopdf'
  and storage.foldername(name)[1] = 'users'
  and storage.foldername(name)[2] = auth.uid()::text
);

-- INSERT
create policy "insert own prontopdf files"
on storage.objects for insert
with check (
  bucket_id = 'prontopdf'
  and storage.foldername(name)[1] = 'users'
  and storage.foldername(name)[2] = auth.uid()::text
);

-- UPDATE
create policy "update own prontopdf files"
on storage.objects for update
using (
  bucket_id = 'prontopdf'
  and storage.foldername(name)[1] = 'users'
  and storage.foldername(name)[2] = auth.uid()::text
)
with check (
  bucket_id = 'prontopdf'
  and storage.foldername(name)[1] = 'users'
  and storage.foldername(name)[2] = auth.uid()::text
);

-- DELETE
create policy "delete own prontopdf files"
on storage.objects for delete
using (
  bucket_id = 'prontopdf'
  and storage.foldername(name)[1] = 'users'
  and storage.foldername(name)[2] = auth.uid()::text
);
```

### 5) Variáveis de ambiente (Cloudflare Pages)

No Cloudflare Pages (Settings → Environment variables):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- (opcional) `VITE_SUPABASE_BUCKET` (padrão: `prontopdf`)

Proto: a aba **Conta** passa a funcionar.

## Samples para testes desktop

A pasta `samples/` contém imagens de documentos de exemplo para testes locais no desktop:

- `samples/doc-fatura-a4.svg`
- `samples/doc-contrato-rgb.svg`
- `samples/doc-recibo-movel.svg`

Use esses arquivos para validar importação, recorte, OCR e exportações.

## Checklist de aceite

- [ ] Captura com fluxo completo de **3 páginas**.
- [ ] Edição de OCR por página (corrigir texto e salvar).
- [ ] Exportação de **PDF pesquisável**.
- [ ] Exportação de **DOCX** e **HTML**.
- [ ] Funcionamento **offline/PWA** após instalação.
