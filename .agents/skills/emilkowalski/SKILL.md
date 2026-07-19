---
name: emilkowalski
description: Skill de Emil Kowalski para diseño de UI/UX moderno - componentes elegantes y animaciones fluidas. Actívalo cuando el usuario pida crear componentes React modernos, diseñar interfaces elegantes, agregar animaciones fluidas con Framer Motion, o cuando quiera elevar la calidad visual de su UI al nivel de productos premium como Vercel, Linear o Raycast.
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
- 🚀 **Performance** - Animaciones suaves a 60fps
- ♿ **Accesibilidad** - Inclusive design (WCAG AA)
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
- Spring animations con Framer Motion
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

## Componentes Prediseñados

### Botones
```jsx
// Variantes
- Primary (CTA)
- Secondary (Secundaria)
- Ghost (Minimal)
- Destructive (Danger)

// Estados
- Default, Hover, Active, Disabled, Loading
```

### Animaciones Preseteadas

#### Fade & Scale
```css
@keyframes fadeScale {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
```

#### Slide In Up
```css
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

## Integración React

### Componente Elegante con Framer Motion
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

### Animación de Página
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

## Temas

### Dark Theme (Preferido)
```json
{
  "primary": "#4D9FFF",
  "background": "#0A0E27",
  "surface": "#1A1F3A",
  "text": "#F5F5F5",
  "border": "#2A3050"
}
```

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

## Checklist de Calidad

- [ ] Tipografía coherente
- [ ] Espaciado armónico
- [ ] Colores accesibles (WCAG AA)
- [ ] Animaciones suaves (60fps)
- [ ] Estados completos (hover, focus, active, disabled)
- [ ] Responsive en todos los breakpoints
- [ ] Modo dark soportado
- [ ] Feedback visual claro
- [ ] Interacciones intuitivas
- [ ] Performance optimizado

## Recursos Recomendados

- 📚 **Framer Motion** - Animaciones React
- ♿ **Radix UI** - Componentes accesibles
- 🌈 **ColorBox** - Paletas de color

## Vea También

- `/impeccable` - Código limpio para componentes
- `/review` - Validar UI code
- `/taste-skill` - Mejorar gustos de diseño
- `/claude-men` - Aprender UI/UX
