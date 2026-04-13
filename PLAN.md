# Plan: JSON De Tarima Para Unity

## Summary
Implementar un contrato JSON estable para Unity en `src/lib/pallet-calculator.ts`, construido desde los cálculos existentes `calculatePalletLayout` y `calculateMultiProductPalletLayout`. El JSON será puro/en memoria, no se guardará en Supabase ni se mandará todavía al WebGL.

## Key Changes
- Mantener intactas las funciones actuales:
  - `calculatePalletLayout(product, weight)`
  - `calculateMultiProductPalletLayout(lines)`
- Agregar un adapter exportado para Unity, por ejemplo:
  - `createUnityPalletPayloadFromLayout(layout)`
  - `createUnityPalletPayloadFromMultiProductLayout(layout)`
  - o un wrapper único `createUnityPalletPayload(input)` si encaja mejor con los tipos.
- Definir un tipo nuevo `UnityPalletPayload` con:
  - `version`
  - `units`: dimensiones reales en `mm` y transforms en `m`
  - `pallets[]`
  - `pieces[]` individuales por tarima
  - `summary` con peso total, número de tarimas y número de piezas
- Usar sistema de coordenadas Unity:
  - origen al centro de cada tarima
  - `x = ancho`
  - `y = altura`
  - `z = largo`
  - posiciones en metros para render
  - dimensiones originales en mm conservadas para trazabilidad

## Integration Points
- En órdenes existentes: generar el payload Unity desde la orden seleccionada usando el producto y peso de esa línea.
- En creación multi-producto: generar el payload Unity desde el preview actual de `calculateMultiProductPalletLayout`.
- No integrar `SendMessage`, `react-unity-webgl` ni persistencia en BD en esta tarea.
- Dejar el payload disponible como objeto importable/consumible por el componente que luego conecte Unity.

## Test Plan
- Agregar validaciones determinísticas para el adapter con casos de:
  - un solo producto
  - múltiples productos
  - varias tarimas
  - dimensiones nulas con fallbacks
  - pesos inválidos o cero
- Si no hay runner de tests configurado, verificar mínimo con:
  - `npm.cmd run lint`
  - `npm.cmd run build`
- Confirmar que el adapter no llama Supabase ni escribe en BD.

## Assumptions
- Unity necesita piezas individuales, no solo resumen agrupado.
- El contrato nuevo es preferible al formato actual porque Unity requiere posiciones y transforms.
- El JSON debe incluir mm y metros.
- El adapter se implementa ahora; el envío real a Unity queda para una tarea posterior.
