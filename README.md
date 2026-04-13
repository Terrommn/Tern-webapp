# Tern Webapp

Aplicacion Next.js para SteelFlow Pro: panel industrial para clientes,
ordenes, productos y simulacion 3D.

## Requisitos

- Node.js 20.9 o superior
- npm
- Variables publicas de Supabase si se usara la base de datos real

## Variables de entorno

Crea un archivo `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Tambien se acepta `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` como alias
de la llave anonima.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Desarrollo

El servidor local inicia en `http://localhost:3000`.

La aplicacion usa App Router, Tailwind CSS 4, Supabase SSR y React Three
Fiber para el simulador.
