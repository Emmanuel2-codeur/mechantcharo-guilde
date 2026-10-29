import { Flame } from 'lucide-react'

export default function GroupTable({ name, players = [] }) {
  return (
    <div className="card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow hover:border-charo-orange/40">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-charo-gradient flex items-center justify-center font-display text-ink text-sm">
            {name}
          </div>
          <p className="font-semibold text-ink">Groupe {name}</p>
        </div>
        <span className="text-[11px] text-muted uppercase tracking-wide">Championnat</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted text-xs uppercase tracking-wide">
            <th className="text-left font-medium pb-2">#</th>
            <th className="text-left font-medium pb-2">Joueur</th>
            <th className="text-right font-medium pb-2">Pts</th>
            <th className="text-right font-medium pb-2">Dmg</th>
          </tr>
        </thead>
        <tbody>
          {players.length === 0 && (
            <tr><td colSpan={4} className="py-6 text-center text-muted text-xs">Aucun joueur inscrit dans ce groupe pour l'instant.</td></tr>
          )}
          {players.map((p, i) => (
            <tr key={p.pseudo} className={`border-t border-line ${i < 2 ? 'text-ink' : 'text-muted'}`}>
              <td className="py-2.5 flex items-center gap-1.5">
                {i === 0 && <Flame size={13} className="text-charo-orange" />}
                {i + 1}
              </td>
              <td className="py-2.5 font-semibold">{p.pseudo}</td>
              <td className="py-2.5 text-right font-mono">{p.points}</td>
              <td className="py-2.5 text-right font-mono">{p.damage}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-muted mt-3">Top 2 qualifiables · 1er qualifié d'office</p>
    </div>
  )
}
