# 🧪 Guia de Testes Manual - ProntoPDF v1.1

## 📱 +eMobile (< 600px: iPhone 12, Galaxy S21)

### Home
- [ ] Vê título "Bem-vindo ao ProntoPDF"
- [ ] Vê 2 cards de ação stacked verticalmente (Digitalizar + Importar)
- [ ] Cards tem shadow e efeito hover
- [ ] Search bar está preto com ícone de lupa
- [ ] Seção "Últimos documentos" em grid 1 col
- [ ] Empty state mostra ícone + mensagem + CTA "Digitalizar primeiro documento"

### Digitalizar (Scanner)
- [ ] Clica "Digitalizar" → vai para `/doc/{id}/camera`
- [ ] **NOVO:** Vê tela de permissão (não a câmera direto)
  - Ícone de câmera grande (primária)
  - Texto: "Usar câmera para escanear"
  - Lista: ✓ Capturar, ✓ Detectar bordas, ✓ Reconhecer texto
  - Botões: "Permitir câmera" + "Cancelar"
- [ ] Clica "Permitir câmera" → Browser pede permissão
- [ ] Permite → Câmera full-bleed monta
- [ ] Full-bleed view: view-finder, botão capture (branco grande)
- [ ] Captura → loader "Salvando…" → volta para Review
- [ ] Review mostra grid 2 col de páginas

### Files
- [ ] Vê search sticky no topo (position: sticky, top: 0, z-20)
- [ ] Cada doc é um card com:
  - [ ] Icon de arquivo (primária)
  - [ ] Nome truncado
  - [ ] Número de páginas
  - [ ] Data de atualização
- [ ] Cards têm touchable tap area (48x48 mínimo)
- [ ] Tap para abrir → viewer

### Account
- [ ] Vê seção "Conectado" com email
- [ ] Botão "Desconectar"
- [ ] Seção "Minha nuvem"
  - [ ] Subseção "PDFs salvos" com lista
  - [ ] Subseção "Projetos editáveis" com lista
- [ ] Option "Importar pacote manual (.zip)"
  - [ ] Click → file picker
  - [ ] Seleciona .zip → importa

### Dark Mode
- [ ] Abre Settings do dispositivo
- [ ] Muda para "Dark" ou "Dark theme"
- [ ] App inteiro fica dark (background → preto, text → branco)
- [ ] Transição smooth (200ms)

---

## 🖥️ Desktop (≥ 1200px)

### Layout Global
- [ ] **Sidebar esquerda fixa** (16rem, 256px)
  - [ ] Logo + "ProntoPDF" + "v1.0"
  - [ ] 4 itens: Início, Arquivos, Conta, Ajuda
  - [ ] Item ativo tem bg-primary/10 + text-primary
  - [ ] User section no footer: email + botão "Sair"
- [ ] **Main content** ocupa resto da tela
  - [ ] Padding left não colide com sidebar
  - [ ] Conteúdo max-w-7xl centralizado

### Home
- [ ] Header com tagline
- [ ] 2 action cards lado a lado
  - [ ] Scan: primária, ~50% width, hover -translate-y-1
  - [ ] Import: secondary, ~50% width
- [ ] Search abaixo
- [ ] Grid **2 colunas** de recentes (não 1)
- [ ] Section "Dica rápida" com Zap icon + info sobre OCR

### Files
- [ ] Search sticky (position: sticky, z-20)
- [ ] Grid **3 colunas** de cards
- [ ] Card com menu (•••) em dropdown:
  - [ ] Renomear
  - [ ] Salvar na nuvem
  - [ ] Excluir (text-error)
- [ ] Cada card mostra footer com data "Atualizado em xx/xx"

### Scanner (Review)
- [ ] Header com "Revisar", "Editar", "Exportar" tabs
- [ ] Grid **3 colunas** de páginas
- [ ] Card de página com:
  - [ ] Imagem grande (aspect-[3/4])
  - [ ] Hover shows: Edit + Delete buttons
  - [ ] Badge no canto inferior (número da página)
  - [ ] Badge no canto superior (status: ⏳ Melhorando, ✓ Detectado, ◐ Manual)

### Account
- [ ] 2 seções lado a lado (não stacked)
- [ ] Seção 1: Perfil (user info + logout)
- [ ] Seção 2: Cloud Storage
  - [ ] PDFs em grid/list
  - [ ] Projetos em grid/list
  - [ ] Botão "Atualizar"

### Accessibility
- [ ] Tab navigation: Skip nav → Home → Files → Account
- [ ] Botões têm focus ring (outline-2 outline-primary)
- [ ] Links têm focus ring
- [ ] Inputs têm focus ring
- [ ] Sidebar items têm focus ring

---

## 🌓 Dark Mode Tests

### Light Mode (default)
- [ ] Background: #faf8f6 (hsl(0 0% 98%))
- [ ] Text foreground: #1a1a1a (hsl(0 0% 10%))
- [ ] Surface: white (hsl(0 0% 100%))
- [ ] Primary: Swiss Red (hsl(0 72% 51%))

### Dark Mode
- [ ] Background: #0f0f0f (hsl(0 0% 6%))
- [ ] Text foreground: #f7f7f7 (hsl(0 0% 97%))
- [ ] Surface: #1f1f1f (hsl(0 0% 12%))
- [ ] Primary: lighter red (hsl(0 72% 65%))
- [ ] Transição suave (color 200ms timing)

---

## ⚡ Performance Checks

### Permissão de Câmera
- [ ] **NÃO** pede permissão ao carregar Home
- [ ] **NÃO** pede permissão ao carregar Files
- [ ] **SIM**, pede ao navegar para `/doc/{id}/camera`
  - [ ] Mostra permission screen (não câmera direto)
  - [ ] Só monta Webcam após "Permitir câmera" click
  - [ ] Se negar, oferece fallback "Importar arquivo"

### Processamento
- [ ] Câmera não trava ao capturar (fast response)
- [ ] OCR roda em segundo plano (progress visible)
- [ ] Múltiplas páginas: processadas em fila (não paralelo)
- [ ] UI sempre responsiva (não freeze)

### Navegação
- [ ] Home → Files (0.2s load)
- [ ] Files → Documento (abrir viewer, 0.5s max)
- [ ] Scanner → Capturar → Review (instant)

---

## 🎨 Visual Checks

### Colors (Light Mode)
- [ ] Primary (Swiss Red): #d93c4a (hsl(0 72% 51%))
- [ ] Secondary (Gray): #b2b2b2 (hsl(0 0% 70%))
- [ ] Error (Red): #c85a5a (hsl(3 90% 63%))
- [ ] Border: #dcdcdc (hsl(0 0% 88%))

### Shadows
- [ ] Cards: shadow-elevation-1 (subtle)
- [ ] Hovered cards: shadow-elevation-3 (raised)
- [ ] Header/Footer: shadow-elevation-1

### Typography
- [ ] H1 (Home title): 2xl/3xl bold + headline-large class
- [ ] Body text: 1rem line-height-relaxed
- [ ] Label text: 0.875rem uppercase

### Spacing
- [ ] Header padding: 1.5rem (6)
- [ ] Card padding: 1.5rem (6)
- [ ] Gap entre cards: 1rem (4)
- [ ] Safe area respected (mobile bottom nav + pb)

---

## 🔄 State Management

### Scanner Page State
- [ ] permissionState: idle → requesting → granted | denied
- [ ] Pages load correctly
- [ ] Page deletion removes from grid
- [ ] Page reorder via drag (if implemented)

### Files Page State
- [ ] Search updates list in real-time
- [ ] Rename opens prompt, updates list
- [ ] Delete asks confirmation
- [ ] Save to cloud shows loading state

### Account Page State
- [ ] Login/logout transitions smooth
- [ ] Cloud storage list loads on mount
- [ ] Download/import shows progress

---

## 🚨 Error States

### Camera Errors
- [ ] Permission denied → Shows "Câmera não disponível" screen
  - [ ] Option to import file instead
  - [ ] Cancel button goes back
- [ ] Device has no camera → Shows same fallback

### Network Errors
- [ ] Saving to cloud failed → Toast "Falha ao salvar"
- [ ] Cloud list failed → Toast "Não foi possível carregar"

### Empty States
- [ ] Home: No documents → Shows empty illustration + "Comece digitalizando"
- [ ] Files: No documents → Shows empty illustration + link to Home
- [ ] Scanner: No pages → Shows "Nenhuma página ainda"

---

## 📋 Checklist de Aceitação Final

### Funcionalidade
- [ ] Home: scanner link, import, search, recentes grid
- [ ] Files: search, grid (desktop) + list (mobile), actions menu
- [ ] Scanner: permission screen (novo!), capture, grid, review
- [ ] Account: login, cloud section, import
- [ ] All routes: responsive mobile/desktop

### Design
- [ ] Material 3 colors used (primary, secondary, error, surface, etc)
- [ ] Shadows: elevation-1, 2, 3 visible
- [ ] Typography: headline-large, title-medium, body-medium sizes visible
- [ ] Border radius: 12px default, 8px smaller, consistent
- [ ] Dark mode: auto-detect, smooth transition

### UX
- [ ] Mobile (<600): Single column, BottomNav, no sidebar
- [ ] Desktop (≥600): Sidebar, grid layouts, two-pane elements
- [ ] Permission flow: request → grant/deny → camera/fallback
- [ ] Hover effects: cards lift on hover, buttons change color
- [ ] Transitions: smooth 200-300ms, no jank

### A11y
- [ ] Focus rings: visible on all interactive elements
- [ ] Contrast: dark text on light bg ≥ 4.5:1
- [ ] Touch targets: buttons/cards ≥ 48x48
- [ ] Aria attrs: aria-label, aria-current (nav)
- [ ] Keyboard nav: Tab through all elements

### Performance
- [ ] No camera permission on page load
- [ ] Processing in background (OCR, Image ops)
- [ ] No infinite loops or UI freezes
- [ ] Lazy load deep routes

---

## 📝 Notes

- **Viewport emulation:** Use Chrome DevTools "Device Toggle" for mobile testing
- **Dark mode toggle:** DevTools Settings > Rendering > Emulate CSS media feature: prefers-color-scheme
- **Network simulation:** Chrome DevTools Network > "Slow 3G" for performance check
- **Accessibility audit:** Chrome DevTools > Lighthouse > Accessibility

---

**Last Updated:** Feb 15, 2026
**Version:** 1.1 (Material 3 Redesign)
