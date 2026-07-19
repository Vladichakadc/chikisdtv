---
name: emilkowalski
description: Skill de Emil Kowalski para diseño de UI/UX moderno - componentes elegantes y animaciones fluidas
type: designer
tags:
  - ui-design
  - ux
  - components
  - animations
  - frontend
  - react
---

# Emil Kowalski - Modern UI Design Skill 🎨

Skill especializado en creación de interfaces modernas, componentes elegantes y animaciones fluidas inspiradas en las mejores prácticas de Emil Kowalski.

## Filosofía

- ✨ **Simplicidad elegante** - Menos es más
- 🎯 **Propósito claro** - Cada píxel cuenta
- 🚀 **Performance** - Animaciones suaves
- ♿ **Accesibilidad** - Inclusive design
- 📱 **Responsive** - Funciona en todos los dispositivos

## Características

### 1. Componentes Modernos
- Botones con micro-interacciones
- Inputs elegantes con estados
- Cartas adaptativas
- Modales y overlays
- Navbars responsivas

### 2. Animaciones Fluidas
- Transiciones CSS optimizadas
- Spring animations
- Scroll-triggered effects
- Gesture-based interactions
- Page transitions

### 3. Diseño Profesional
- Tipografía elegida cuidadosamente
- Espaciado armonioso
- Paletas de color coherentes
- Iconografía consistente
- Temas light/dark

### 4. Experiencia de Usuario
- Feedback visual claro
- Loading states elegantes
- Error messages amigables
- Empty states creativos
- Skeleton screens

## Uso

### Crear Componente Elegante
```bash
/emilkowalski create-component button
  --style modern
  --animations true
  --accessibility wcag-aa
```

### Diseñar Página Completa
```bash
/emilkowalski design-page
  --name "dashboard"
  --theme minimal
  --framework react
```

### Agregar Animaciones
```bash
/emilkowalski animate
  --component "card"
  --effect "fade-slide"
  --duration 300ms
  --easing "ease-out-cubic"
```

### Validar Accesibilidad
```bash
/emilkowalski validate-a11y
  --file src/components/
  --standard wcag-aa
```

## Componentes Prediseñados

### Botones
```jsx
// Variantes
- Primary (CTA)
- Secondary (Secundaria)
- Ghost (Minimal)
- Destructive (Danger)

// Estados
- Default
- Hover
- Active
- Disabled
- Loading
```

### Inputs
```jsx
// Tipos
- Text
- Email
- Password
- Search
- Textarea

// Características
- Placeholder elegante
- Validación visual
- Estados de error
- Iconos integrados
- Autocompletado
```

### Tarjetas
```jsx
// Estilos
- Elevated (Sombra)
- Outlined (Borde)
- Filled (Fondo)
- Minimal (Simple)

// Interacciones
- Hover elevation
- Ripple effects
- Smooth transitions
```

## Paletas de Color

### Moderno Minimalista
```
Primary:   #000000 (Negro)
Secondary: #FFFFFF (Blanco)
Accent:    #0066FF (Azul)
Gray:      #F5F5F5 → #1A1A1A (Escala)
```

### Neomórfico
```
Surface:   #E0E5EC
Highlight: #FFFFFF
Shadow:    #A3B1C6
Accent:    #667EEA
```

### Glassmorphism
```
Base:      Translúcido
Blur:      20px
Border:    Gradiente sutil
Backdrop:  Efecto vidrio
```

## Animaciones Preseteadas

### Fade & Scale
```css
@keyframes fadeScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Slide In
```css
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Bounce
```css
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

## Temas

### Light Theme
```json
{
  "primary": "#0066FF",
  "background": "#FFFFFF",
  "surface": "#F5F5F5",
  "text": "#1A1A1A",
  "border": "#E0E0E0"
}
```

### Dark Theme
```json
{
  "primary": "#4D9FFF",
  "background": "#0A0E27",
  "surface": "#1A1F3A",
  "text": "#F5F5F5",
  "border": "#2A3050"
}
```

## Casos de Uso

### Crear Dashboard Elegante
```bash
/emilkowalski design-page
  --type dashboard
  --components "card,chart,table"
  --theme modern
  --dark-mode true
```

### Diseñar Landing Page
```bash
/emilkowalski design-page
  --type landing
  --sections "hero,features,cta,footer"
  --animations premium
  --responsive mobile-first
```

### Componentizar UI Existente
```bash
/emilkowalski refactor-ui
  --file src/pages/
  --extract-components true
  --style modern
  --add-animations true
```

## Checklist de Calidad

- [ ] Tipografía coherente
- [ ] Espaciado armónico
- [ ] Colores accesibles (WCAG AA)
- [ ] Animaciones suaves (60fps)
- [ ] Estados completos
- [ ] Responsive en todos los breakpoints
- [ ] Modo dark soportado
- [ ] Feedback visual claro
- [ ] Interacciones intuitivas
- [ ] Performance optimizado

## Integración React

### Componente Elegante
```jsx
import { motion } from 'framer-motion';

export const ElegantButton = ({ children, ...props }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: 'spring', stiffness: 400 }}
    className="elegant-button"
    {...props}
  >
    {children}
  </motion.button>
);
```

### Animación Página
```jsx
const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

<motion.div
  initial="hidden"
  animate="visible"
  variants={pageVariants}
  transition={{ duration: 0.5 }}
>
  {/* Contenido */}
</motion.div>
```

## Recursos Recomendados

- 📚 **Framer Motion** - Animaciones React
- 🎨 **Tailwind CSS** - Utilidades de estilo
- ♿ **Radix UI** - Componentes accesibles
- 🌈 **ColorBox** - Paletas de color
- 🚀 **Vercel** - Hosting optimizado

## Vea También

- `/impeccable` - Código limpio para componentes
- `/review` - Validar UI code
- `/taste-skill` - Mejorar gustos de diseño
- `/claude-men` - Aprender UI/UX
