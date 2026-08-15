export function Header() {
  return (
    <header className="bg-surface border-subtle flex h-14 shrink-0 items-center justify-between border-b px-6">
      <span className="text-content font-semibold">SGI IES Constructora</span>
      {/* Reservado para el usuario logueado — depende de HU-SIS-01 */}
      <div />
    </header>
  )
}
