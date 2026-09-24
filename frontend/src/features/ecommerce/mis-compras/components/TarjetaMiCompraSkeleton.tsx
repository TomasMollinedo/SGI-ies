/** Silueta de una `TarjetaMiCompra` mientras carga la página de "Mis compras". */
export function TarjetaMiCompraSkeleton() {
  return (
    <div aria-hidden="true" className="border-light/15 flex flex-col border">
      <span className="bg-primary/40 h-1 w-full" />
      <div className="flex flex-col gap-3 p-5">
        <span className="bg-light/10 h-5 w-2/3 animate-pulse rounded" />
        <span className="bg-light/10 h-4 w-1/2 animate-pulse rounded" />
        <span className="bg-light/10 h-3 w-2/5 animate-pulse rounded" />
        <span className="bg-light/10 h-3 w-3/5 animate-pulse rounded" />
        <span className="bg-light/10 mt-2 h-6 w-2/5 animate-pulse rounded" />
      </div>
    </div>
  )
}
