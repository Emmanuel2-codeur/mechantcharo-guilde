// Page demandée avant la connexion : on y revient après (Google, lien email). Valable 30 minutes.
const KEY = 'charo_next'

export function setNext(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/connexion') || path.startsWith('/rejoindre')) return
  try { localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() })) } catch { /* stockage indisponible */ }
}
export function peekNext() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    return raw && Date.now() - raw.at < 30 * 60 * 1000 && !raw.path.startsWith('/rejoindre') ? raw.path : null
  } catch { return null }
}
export function clearNext() { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }