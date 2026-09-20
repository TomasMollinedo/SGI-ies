import { createZodDto } from 'nestjs-zod';
import { createUnidadFuncionalSchema } from './create-unidad-funcional.dto';

// Una unidad no cambia de proyecto: alteraría el presupuesto de los dos y la
// unicidad del identificador. Tampoco hay `presupuesto` ni auditoría en el
// body: Zod descarta cualquier clave que no esté declarada.
export const updateUnidadFuncionalSchema = createUnidadFuncionalSchema
  .omit({ FK_proyecto: true })
  .partial();

export class UpdateUnidadFuncionalDto extends createZodDto(
  updateUnidadFuncionalSchema,
) {}