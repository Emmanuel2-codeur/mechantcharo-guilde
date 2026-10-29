import { motion } from 'framer-motion'

// Regroupe les onglets par domaine (Général · Tournoi · Guilde · Communication · Système) pour garder l'écran lisible.
function groupTabs(tabs) {
  const groups = []
  tabs.forEach((t) => {
    const g = groups.find((x) => x.name === (t.group || 'Autres'))
    if (g) g.tabs.push(t); else groups.push({ name: t.group || 'Autres', tabs: [t] })
  })
  return groups
}

export default function AdminTabs({ tabs, active, onChange }) {
  return (
    <div className="mb-10 flex flex-wrap gap-x-8 gap-y-5">
      {groupTabs(tabs).map((group) => (
        <div key={group.name}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{group.name}</p>
          <div className="flex flex-wrap gap-2">
            {group.tabs.map((tab) => {
              const isActive = active === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onChange(tab.id)}
                  className={`relative flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors ${
                    isActive ? 'border-transparent text-white' : 'border-line bg-white text-muted hover:border-charo-orange/40 hover:text-charo-orange'
                  }`}
                >
                  {isActive && (
                    <motion.span layoutId="admin-tab-bg" className="absolute inset-0 rounded-full bg-charo-gradient shadow-glow"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                  )}
                  <span className="relative flex items-center gap-2">
                    {tab.icon}{tab.label}
                    {tab.badge > 0 && (
                      <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold ${isActive ? 'bg-white/25 text-white' : 'bg-charo-orange/15 text-charo-orange'}`}>{tab.badge}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
