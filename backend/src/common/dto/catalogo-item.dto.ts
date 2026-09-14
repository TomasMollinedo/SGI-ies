import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Item de catálogo genérico para poblar un `<select>` del frontend: `id` es
 * el valor que acepta la base de datos (lo que viaja de vuelta al crear o
 * editar un registro), `code` es la etiqueta legible que se le muestra al
 * usuario, y `metadata` es un objeto libre para datos extra que un catálogo
 * puntual necesite más adelante (por ejemplo, un color o un ícono) — queda
 * vacío en catálogos simples como Condición frente al IVA.
 *
 * No vive en ningún módulo de negocio a propósito: es la forma que usa
 * cualquier endpoint de catálogo (valores de un enum, tablas de referencia
 * chicas) de cualquier dominio, para que el frontend arme todos sus
 * `<select>` contra la misma estructura de dato.
 */
export const catalogoItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export class CatalogoItemDto extends createZodDto(catalogoItemSchema) {}
