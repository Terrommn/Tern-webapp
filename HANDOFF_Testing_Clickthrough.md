# TerniumFlow Gamification - Manual Testing Handoff

**Para:** Claude Code Chrome Extension (o cualquier LLM con acceso al navegador)
**App URL:** http://localhost:3000
**Fecha:** 2026-04-28

---

## CREDENCIALES DE ACCESO

La app usa Supabase Auth real. Necesitas un usuario registrado en la base de datos.

- **Página de login:** http://localhost:3000/login
- **Campos:** Email + Password
- **Roles:** `admin` (acceso total) o `operator` (acceso limitado)

> Si no tienes credenciales, revisa la tabla `auth.users` en Supabase o pide al equipo las credenciales de demo.

---

## NAVEGACION (Sidebar)

La sidebar tiene estos enlaces según el rol:

### Rol: Admin
| Ruta | Label | Icono | Que hace |
|---|---|---|---|
| `/` | Dashboard | space_dashboard | Panel principal con KPIs y resumen de gamificacion |
| `/clientes` | Clients | groups | Directorio de clientes - CREAR CLIENTE da XP |
| `/ordenes` | Orders | receipt_long | Workspace de ordenes - CREAR/COMPLETAR ORDEN da XP |
| `/productos` | Products | inventory_2 | Catalogo de productos - CREAR/EDITAR PRODUCTO da XP |
| `/simulador` | Simulador | view_in_ar | Simulador 3D |

### Rol: Operator
| Ruta | Label | Icono | Que hace |
|---|---|---|---|
| `/ordenes` | Orders | receipt_long | Workspace de ordenes |
| `/simulador` | Simulador | view_in_ar | Simulador 3D |
| `/progreso` | Mi Progreso | emoji_events | Dashboard de gamificacion personal |
| `/desafios` | Desafios | local_fire_department | Desafios diarios/semanales/mensuales |
| `/misiones` | Misiones | military_tech | Quests y onboarding |

---

## FLUJOS DE PRUEBA - XP AWARDS

### TEST 1: Crear una orden (25 XP)
1. Ir a `/ordenes`
2. Buscar boton de crear nueva orden (puede ser un "+" o "Nueva Orden")
3. Llenar los campos requeridos del formulario
4. Hacer submit/guardar
5. **Verificar:** Debe aparecer un toast en esquina inferior derecha mostrando "+25 XP" con descripcion "Orden creada"
6. **Verificar:** Si vas a `/progreso`, el XP total debe haber subido 25

### TEST 2: Completar/marcar orden como CUM (XP)
1. Ir a `/ordenes`
2. Encontrar una orden existente
3. Buscar opcion de marcarla como CUM (completada/cumplida)
4. Hacer click en marcar CUM
5. **Verificar:** Toast de XP debe aparecer

### TEST 3: Crear un cliente (30 XP)
1. Ir a `/clientes`
2. Buscar boton de crear nuevo cliente
3. Llenar el formulario con datos del cliente
4. Hacer submit/guardar
5. **Verificar:** Toast "+30 XP" con "Cliente creado"

### TEST 4: Crear un producto (30 XP)
1. Ir a `/productos`
2. Buscar boton de crear nuevo producto
3. Llenar el formulario
4. Hacer submit/guardar
5. **Verificar:** Toast "+30 XP" con "Producto creado"

### TEST 5: Actualizar un producto (20 XP)
1. Ir a `/productos`
2. Seleccionar un producto existente
3. Editar algun campo
4. Guardar cambios
5. **Verificar:** Toast "+20 XP" con "Producto actualizado"

---

## FLUJOS DE PRUEBA - PAGINAS DE GAMIFICACION

### TEST 6: Dashboard principal (`/`)
1. Ir a `/`
2. Buscar en el sidebar derecho la tarjeta de "Gamification Summary"
3. **Verificar que muestra:**
   - Nivel actual (ej: "Nivel 3")
   - Titulo (ej: "Tecnico de Fundicion")
   - XP actual
   - Dias de racha (streak)
   - Barra de progreso al siguiente nivel
4. Hacer click en el link a `/progreso` si existe

### TEST 7: Pagina Mi Progreso (`/progreso`)
1. Ir a `/progreso`
2. **Verificar que se renderizan estas secciones:**
   - Hero card con nivel, titulo y XP
   - 4 stat cards: Nivel, XP Total, Racha, Logros
   - Grafica de barras de XP (ultimos 30 dias)
   - Mastery Paths (3 caminos: Order Flow, Client Relations, Product Specialist)
   - Grid de Logros (con filtros por categoria)
   - Records Personales
   - Actividad Reciente (ultimos 15 eventos XP)
3. **Probar filtros de logros:** Click en cada tab de categoria (Todos, Ordenes, Clientes, Productos, Sistema, Consistencia)
4. **Verificar:** Los logros desbloqueados deben tener color, los bloqueados aparecen grises o con candado

### TEST 8: Pagina Desafios (`/desafios`)
1. Ir a `/desafios`
2. **Verificar 3 secciones:**
   - Desafios Diarios (icono fuego)
   - Desafios Semanales (icono target)
   - Desafios Mensuales (icono corona)
3. Cada desafio debe mostrar:
   - Nombre y descripcion
   - Barra de progreso
   - Tier badge (bronze/silver/gold)
   - Recompensa XP
4. **Verificar sidebar:** Stats de desafios completados

### TEST 9: Pagina Misiones (`/misiones`)
1. Ir a `/misiones`
2. **Verificar:**
   - Hero card con rango actual y narrativa
   - Barra de progreso XP al siguiente rango
   - Quests activas agrupadas por tipo (semanal, mensual, estacional)
   - Progreso de Onboarding (pasos numerados con badges de estado)
   - Quests completadas (historial)
   - Seccion "La Historia Hasta Ahora" con narrativas pasadas

---

## FLUJOS DE PRUEBA - COMPONENTES UI

### TEST 10: XP Toast (notificacion)
1. Realizar cualquier accion que de XP (crear orden, cliente, producto)
2. **Verificar:**
   - Toast aparece en esquina inferior derecha
   - Muestra icono de rayo
   - Muestra "+XX XP" en color primario (rojo)
   - Muestra descripcion de la accion
   - Se auto-cierra en ~3 segundos
   - Si haces varias acciones rapido, se apilan (max 3 visibles)

### TEST 11: Level Up
1. Si el usuario esta cerca de subir de nivel, realizar acciones hasta acumular suficiente XP
2. **Verificar:** Al subir de nivel debe haber una notificacion especial (level up)

### TEST 12: Streak (Racha)
1. El sistema verifica racha al cargar la app (via GamificationProvider)
2. **Verificar en `/progreso`:** Los dias de racha deben ser >= 1 si has usado la app hoy
3. **Verificar en Dashboard (`/`):** La tarjeta de gamificacion muestra dias de racha

---

## TABLA DE XP POR ACCION

| Accion | XP | Donde se dispara |
|---|---|---|
| Crear orden | 25 | `/ordenes` → formulario nueva orden |
| Completar orden (CUM) | variable | `/ordenes` → marcar como CUM |
| Crear cliente | 30 | `/clientes` → formulario nuevo cliente |
| Crear producto | 30 | `/productos` → formulario nuevo producto |
| Actualizar producto | 20 | `/productos` → editar producto existente |
| Login diario | 10 | Automatico al cargar la app |

---

## QUE REPORTAR SI ALGO FALLA

Para cada fallo reporta:
1. **Ruta/URL** donde estabas
2. **Accion exacta** que realizaste (que boton, que formulario)
3. **Que esperabas** (ej: "toast de +25 XP")
4. **Que paso** (ej: "no aparecio nada" o "error en consola")
5. **Consola del navegador** — abre DevTools (F12) → Console y copia cualquier error rojo

### Errores comunes esperados:
- `"must be used inside <GamificationProvider>"` → El Provider no esta montado (ya deberia estar fix)
- `"user is null"` → No hay sesion activa, vuelve a hacer login
- `"relation user_profiles does not exist"` → El schema de gamificacion no se ha corrido en Supabase
- Toast no aparece pero XP si se guarda → Problema de UI, no de logica
- Toast aparece pero XP no se guarda → Problema de backend/Supabase

---

## SETUP PREVIO NECESARIO

Antes de probar, asegurate de:
1. `npm run dev` esta corriendo (http://localhost:3000)
2. El schema `gamification-schema.sql` ya se ejecuto en Supabase
3. Hay al menos un usuario en `auth.users` con su `user_profiles` correspondiente
4. `.env.local` tiene las variables de Supabase correctas

---

## ARCHIVOS CLAVE (por si necesitas debug)

| Archivo | Que hace |
|---|---|
| `src/components/steelflow/GamificationProvider.tsx` | Contexto global, awardXP, toasts |
| `src/lib/gamification.ts` | Logica core: XP, niveles, rings, streaks |
| `src/components/steelflow/OrdersWorkspace.tsx` | Workspace ordenes (awardXP on create/CUM) |
| `src/components/steelflow/ClientsDirectory.tsx` | Directorio clientes (awardXP on create) |
| `src/components/steelflow/ProductsWorkspace.tsx` | Workspace productos (awardXP on create/update) |
| `src/components/steelflow/XPToast.tsx` | Componente toast de XP |
| `src/app/progreso/page.tsx` | Pagina de progreso |
| `src/app/desafios/page.tsx` | Pagina de desafios |
| `src/app/misiones/page.tsx` | Pagina de misiones |
| `gamification-schema.sql` | Schema completo de BD |
