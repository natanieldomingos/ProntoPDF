# 📱 ProntoPDF - Roadmap de Evolução (Feb 2026)

## ✅ Implementado (Sprint 1-2)

### 🎨 Design System (Sprint 1)
- [x] Material 3 color tokens completos (light/dark mode)
- [x] Tipografia escalada (Display, Headline, Title, Body, Label)
- [x] Sistema de sombras (elevation 0-5)
- [x] Radius consistente (12px base, com variações)
- [x] Focus rings acessíveis (2px outline)
- [x] Suporte a `prefers-reduced-motion`
- [x] CSS variables para tema dinâmico

**Arquivo:** `client/src/index.css` (340+ linhas)

### 🧭 Navegação Responsiva (Sprint 2)
- [x] AppShell adaptativo mobile (<600dp) vs desktop (≥600dp)
- [x] BottomNav Material com 4 itens, indicador ativo com top border + bg
- [x] Sidebar para desktop (fixed left, 16rem, com logo + items + user footer)
- [x] Transições suaves (animate-in fade-in 200ms)
- [x] Acessibilidade: aria-current, focus rings, touch targets 48x48

**Arquivos:** 
- `client/src/components/app-shell.tsx`
- `client/src/components/bottom-nav.tsx`
- `client/src/components/sidebar-nav.tsx` (novo)

### 📄 Páginas Reestilizadas (Sprint 3)

#### Home (home.tsx)
- [x] Cards de ação primária (Digitalizar) e secundária (Importar) com hover effects
- [x] Search bar com ícone integrado
- [x] Grid responsivo de documentos recentes (2 col desktop, 1 mobile)
- [x] Empty states didáticos com CTA clara
- [x] Dica rápida sobre OCR (desktop only)

#### Files (files.tsx)
- [x] Search bar sticky (top: 0, z-20)
- [x] Grid de cards desktop (3 col, 2 col, 1 col responsivo)
- [x] Menu de ações (•••) em dropdown dentro de card
- [x] Lista simples para mobile
- [x] Cards com icon, nome, páginas, menu de ações
- [x] Botão primário "Abrir" em cards (quando menu está fechado)

#### Account (account.tsx)
- [x] Seções bem definidas (Perfil, Login, Cloud Storage)
- [x] Cards com seções (PDFs + Projetos editáveis)
- [x] OAuth + magic link com UX clara
- [x] Import manual (.zip) com drag-drop visual
- [x] Color-coded icons por tipo (Cloud: tertiary, etc)

### 🎥 Scanner (scanner.tsx)
- [x] **Permission request screen ANTES de montar Webcam**
  - Explicação clara: "Permitimos acesso à câmera para digitalizar"
  - O que vamos fazer: ✓ Capturar, Detectar bordas, OCR
  - Botão "Permitir câmera" (dispara `getUserMedia()`)
- [x] Fallback se câmera negada → opção de importar arquivo
- [x] Grid responsivo de páginas (3 col desktop, 2 mobile)
- [x] Cards de página com status badges (⏳ Melhorando, ✓ Detectado, ◐ Manual)
- [x] Header + footer sticky com navegação Clara
- [x] Fila de processamento para evitar travamentos

---

## 📋 Ainda a Fazer

### 🎨 Polish UI (Sprint 4)
- [ ] Export (export.tsx): refatorar presets em cards, progresso real com barra
- [ ] Edit (edit.tsx): melhorar UI de texto OCR, preparar para anotações
- [ ] Help (help.tsx): conteúdo bem organizado com links

### 🧪 Testes & Deploy
- [ ] Compilar TypeScript sem erros
- [ ] Testar mobile (<600dp): Home, Files, Scanner, Account
- [ ] Testar desktop (≥600dp): sidebar, grid layouts, two-pane
- [ ] Validar acessibilidade: keyboard nav, screen reader, contraste
- [ ] Performance: Lighthouse (Core Web Vitals)
- [ ] Build & deploy no Cloudflare Pages

### 🚀 Futuro (P2-P3)
- [ ] Templates (rota /create): Currículo, Portfólio, Carta
- [ ] Editor PDF avançado: anotações, marca-texto, assinatura
- [ ] Busca por OCR em biblioteca
- [ ] Pastas/coleções
- [ ] Compartilhamento com link público

---

## 🛠️ Stack & Arquitetura

### Dependencies (sem mudanças)
- React 18 + Wouter (router)
- TailwindCSS + shadcn/ui (components)
- Supabase (auth + storage)
- PDF.js / jsPDF (processing)
- TanStack Query (data fetching)

### CSS Approach
- **Tailwind config**: `--radius`, `--color-*`, `--font-*` via @theme inline
- **Utilities**: `.shadow-elevation-*`, `.text-*`, `.sr-only`, `.touch-target`
- **Responsive**: `useIsMobile()` hook (768px breakpoint)
- **Dark mode**: `@media (prefers-color-scheme: dark)`

### Components
- **Shared UI**: `client/src/components/ui/` (button, card, dialog, etc - shadcn)
- **Layout**: `app-shell.tsx`, `bottom-nav.tsx`, `sidebar-nav.tsx`
- **Custom**: `camera-view.tsx`, `image-editor.tsx`

---

## 📱 Mobile vs Desktop (Key Differences)

### Mobile (<600dp)
- BottomNav (4 items): Início, Arquivos, Conta, Ajuda
- Single app-shell layout: `pb-[calc(4rem + safe-area-inset-bottom)]`
- Scanner: Permission screen → Camera → full-bleed
- Files: List view (1 column), search sticky
- Home: Actions in 1 column
- Account: Single column, compact

### Desktop (≥600dp)
- Sidebar (16rem, fixed left): logo, items, user footer
- AppShell: `ml-[16rem]` main, max-w-7xl content
- Files: Grid (3 col), search sticky, cards with menu
- Home: 2 col grid, dica rápida em side panel
- Scanner: Grid (3 col), cleaner header
- Account: Full width, 2 col sections

---

## 🎯 Checklist de Aceitação

### Funcionalidade
- [ ] Abrir documento sempre abre Viewer (nunca "volta para câmera")
- [ ] Home sem documentos mostra empty state + CTA clara
- [ ] Files permite renomear, exportar, excluir, salvar na nuvem
- [ ] Scanner pede permissão só ao clicar "Escanear"
- [ ] Export com progresso visual claro
- [ ] Account com seções bem definidas

### UX/Design
- [ ] Material 3 tokens em uso (cores, blur, shadows, motion)
- [ ] Responsive: <600dp (mobile) vs ≥600dp (desktop) UX diferente
- [ ] Transições suaves (<400ms)
- [ ] Textos PT-BR, sem jargão

### Acessibilidade
- [ ] Focus ring visível (2px outline)
- [ ] Aria-label, aria-current
- [ ] Contraste WCAG AA (4.5:1 texto)
- [ ] Touch targets 48x48
- [ ] Keyboard navigation completa

### Performance
- [ ] Sem loops de processamento
- [ ] Cancel/timeout em operações longas
- [ ] Lazy-load de rotas pesadas
- [ ] Lighthouse >80 mobile, >90 desktop

---

## 🚀 Como Testar Manualmente

### Mobile (<600dp)
```bash
# Chrome DevTools: iPhone 12 (390x844)
1. Home: Vê cartões grandes, busca, recentes
2. Clica "Digitalizar" → Permission screen
3. Permite câmera → Full-bleed camera view
4. Captura → Volta a Review com thumbnails
5. Files: Lista simples
6. Account: Login flow, cloud section
```

### Desktop (≥600dp)
```bash
# Chrome 1920x1080
1. Vê Sidebar esquerda (16rem, fixo)
2. Home: Cards de ação, grid 2 col reciados
3. Files: Grid 3 col, menu de ações, search sticky
4. Scanner: Grid 3 col, header claro
5. Account: Seções lado a lado (PDFs + Projetos)
```

---

## 📝 Notas Técnicas

### Responsividade
- Breakpoint: `768px` (use `useIsMobile()`)
- Função retorna `true` se `width < 768`
- Em pages: condicionar layout com `isMobile ? ... : ...`

### Design Tokens
- Cores: `--color-primary`, `--color-surface`, `--color-error`, etc
- Typography: `--text-headline-large`, `.text-body-medium`, etc
- Shadows: `.shadow-elevation-1` a `.shadow-elevation-5`
- Radius: `--radius: 12px` (base), `.rounded-lg` (~8px), `.rounded-full`

### CSS Classes (Tailwind)
- Usam variáveis CSS: `bg-[var(--color-primary)]` → simplificado para `bg-primary`
- Sombras: `shadow-elevation-2` em vez de `shadow-md`
- Focus: `focus-visible:outline-2 focus-visible:outline-offset-2`
- Motion: respecta `prefers-reduced-motion`

---

## 🔗 Referências

- [Material 3 Design](https://m3.material.io/)
- [NN/g Heurísticas](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Wouter Router](https://github.com/molefrog/wouter)
- [TailwindCSS](https://tailwindcss.com/)
- [Supabase Docs](https://supabase.com/docs)

---

**Status:** 🟢 Sprint 1-3 ✅ | 🟡 Sprint 4 (partial) | 🔴 Sprint 5+ (future)

**Última atualização:** Feb 15, 2026
