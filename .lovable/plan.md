## Resumen

Transformar la app de bug tracker en un **Sistema de Gestión de Viáticos** personal (por usuario, sin aprobaciones). Se elimina todo el dominio de bugs/proyectos/equipos y se construye desde cero el módulo de viáticos con su esquema, páginas y componentes propios. Se conserva la autenticación, el theme, la estructura visual (sidebar, header) y la subida de archivos.

## Cambios en la base de datos (Lovable Cloud)

Eliminar tablas y artefactos del bug tracker:
- `bugs`, `comments`, `attachments`, `activity_log`, `projects`, `invitations`, `company_settings`, `notification_preferences`
- Función `generate_tracking_id`, secuencia `bug_tracking_seq`, función `get_team_members`
- Bucket de storage `bug-attachments`

Se conservan: `profiles`, `user_roles`, `has_role`, `handle_new_user`, `update_updated_at_column`, bucket `avatars`.

Crear nuevas tablas:

- **`budgets`** — presupuesto del usuario
  - `user_id`, `name` ("Viáticos Q1", etc.), `max_amount` (numeric), `currency` (default 'ARS'), `is_active` (bool), timestamps
  - RLS: cada usuario CRUD solo lo suyo (`auth.uid() = user_id`)

- **`expense_categories`** — catálogo por usuario (con seed: Comida, Transporte, Alojamiento, Combustible, Otros)
  - `user_id`, `name`, `icon` (lucide name), `color` (hsl token)
  - RLS: por usuario

- **`expenses`** — gastos
  - `budget_id` (FK), `user_id`, `category_id` (FK nullable), `amount`, `description`, `expense_date`, `receipt_url` (text), timestamps
  - RLS: por usuario

Crear bucket de storage **`receipts`** (privado) con políticas: usuario sube/lee/borra solo en carpeta `{auth.uid()}/...`.

Trigger: al crear un nuevo perfil (`handle_new_user`), insertar también las 5 categorías por defecto del usuario.

Todas las tablas con `GRANT` para `authenticated` y `service_role`, RLS habilitado.

## Cambios en el frontend

Rutas (en `App.tsx`):
- `/` — Landing (rediseñada para viáticos)
- `/auth` — sin cambios
- `/dashboard` — resumen: presupuesto activo, saldo disponible, % consumido (barra de progreso), últimos gastos, gráfico por categoría
- `/budgets` — listar/crear/editar presupuestos, marcar uno como activo
- `/expenses` — listado completo con búsqueda y filtros (categoría, rango de fechas, monto)
- `/expenses/new` — formulario: monto, categoría, descripción, fecha, subir comprobante (imagen/PDF)
- `/expenses/:id` — detalle, editar, eliminar, ver/descargar comprobante
- `/categories` — gestionar categorías propias
- `/settings` — simplificado: perfil + moneda preferida

Componentes nuevos:
- `BudgetCard`, `BudgetProgress` (barra con % consumido y colores: verde <70%, amarillo 70-90%, rojo >90%)
- `ExpenseForm`, `ExpenseTable`, `ExpenseFilters`
- `CategoryBadge`, `ReceiptUpload` (con preview de imagen)
- `StatsCards` para el dashboard

Eliminar páginas y componentes del bug tracker: `BugCreate`, `BugDetail`, `BugList`, `Analytics`, todo `src/components/bugs/*` y similares. Actualizar sidebar/navegación.

Conservar: `AuthContext`, `ProtectedRoute`, `ThemeProvider`, layout con sidebar, sistema de toasts, componentes UI de shadcn.

## Detalles técnicos

- Stack actual: React + Vite + Tailwind + shadcn + React Query + Supabase. Sin cambios.
- Cálculos: saldo = `max_amount - SUM(expenses.amount)` para el presupuesto activo. Hacerlo en el cliente (React Query) sobre los gastos filtrados por `budget_id`.
- Validación de formularios con `react-hook-form` + `zod` (ya en proyecto).
- Subida de comprobantes: `supabase.storage.from('receipts').upload(\`${user.id}/${budget_id}/${uuid}\`, file)`, guardar el path en `expenses.receipt_url`.
- Idioma: UI en **español** (textos, labels, mensajes).
- Diseño: mantener el dark theme actual, paleta basada en tokens semánticos existentes; acento financiero (verde/dorado) para montos positivos, rojo para sobre-consumo.

## Orden de implementación

1. Migración SQL: drop de tablas viejas + create de nuevas + bucket `receipts` + trigger seed de categorías.
2. Limpiar `App.tsx`, eliminar páginas y componentes de bugs.
3. Crear hooks: `useBudgets`, `useExpenses`, `useCategories`.
4. Construir páginas en orden: Budgets → Expenses → Dashboard → Categories → Landing → Settings.
5. Actualizar sidebar y navegación.
6. Verificar el flujo end-to-end con Playwright.
