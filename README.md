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

## Deploy na Netlify

### Configuração de build

- **Build command**: `npm run build:client`
- **Publish directory**: `dist/public`

### SPA redirects

Para rotas client-side funcionarem em refresh/deep-link, mantenha o arquivo de redirects:

```txt
/* /index.html 200
```

---

## Login com Google/X + acesso em vários dispositivos (Supabase)

O app tem uma aba **Conta** que permite:

- Entrar com **Google** ou **X (Twitter)**
- Salvar **PDFs** na nuvem e baixar depois no PC
- Salvar um **Projeto editável** (pacote `.zip`) para importar e continuar editando em outro aparelho

### 1) Criar projeto no Supabase

1. Crie um projeto no Supabase.
2. Copie:
   - **Project URL**
   - **Anon public key**

### 2) Configurar provedores de login

No painel do Supabase, em **Authentication → Providers**, habilite:

- **Google**
- **Twitter (X)**

Adicione as Redirect URLs (exemplos):

- `https://SEU-SITE.netlify.app/auth/callback`
- `http://localhost:5000/auth/callback`

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
  and storage.foldername(name)[2] = auth.uid()::text
);

-- INSERT
create policy "insert own prontopdf files"
on storage.objects for insert
with check (
  bucket_id = 'prontopdf'
  and storage.foldername(name)[2] = auth.uid()::text
);

-- UPDATE
create policy "update own prontopdf files"
on storage.objects for update
using (
  bucket_id = 'prontopdf'
  and storage.foldername(name)[2] = auth.uid()::text
)
with check (
  bucket_id = 'prontopdf'
  and storage.foldername(name)[2] = auth.uid()::text
);

-- DELETE
create policy "delete own prontopdf files"
on storage.objects for delete
using (
  bucket_id = 'prontopdf'
  and storage.foldername(name)[2] = auth.uid()::text
);
```

### 5) Variáveis de ambiente (Netlify)

No Netlify (Site settings → Environment variables):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- (opcional) `VITE_SUPABASE_BUCKET` (padrão: `prontopdf`)

Pronto: a aba **Conta** passa a funcionar.

Este projeto já inclui `client/public/_redirects`, que deve ser publicado junto ao build.

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
