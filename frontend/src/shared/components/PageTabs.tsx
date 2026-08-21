import { NavLink } from 'react-router'

interface PageTab {
  label: string
  to: string
}

interface PageTabsProps {
  tabs: PageTab[]
}

export function PageTabs({ tabs }: PageTabsProps) {
  return (
    <nav className="border-subtle flex gap-4 border-b">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            `border-b-2 px-1 py-2 text-sm font-medium ${
              isActive
                ? 'border-primary text-primary'
                : 'text-content-muted border-transparent hover:text-content'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
