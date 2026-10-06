/**
 * Silueta de una `TarjetaProyectoDestacado` mientras cargan los destacados.
 * Mismo alto y misma grilla que la tarjeta real, para que al llegar los datos
 * no salte el layout. (El skeleton de `DataTable` es de filas de tabla, no
 * sirve acá.)
 */
export function TarjetaProyectoSkeleton() {
  return (
    <div aria-hidden="true" className="border-light/15 flex flex-col border">
      <span className="bg-primary/40 h-1 w-full" />
      <div className="bg-light/10 aspect-4/3 animate-pulse" />
      <div className="flex flex-col gap-3 p-5">
        <span className="bg-light/10 h-5 w-2/3 animate-pulse rounded" />
        <span className="bg-light/10 h-4 w-1/2 animate-pulse rounded" />
        <span className="bg-light/10 h-3 w-1/3 animate-pulse rounded" />
        <span className="bg-light/10 mt-2 h-6 w-2/5 animate-pulse rounded" />
      </div>
    </div>
  )
}
