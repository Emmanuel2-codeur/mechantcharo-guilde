// ============================================================================
// Edge Function : admin-assistant
// Assistant IA réservé aux admins. Il PROPOSE (import de présences, brouillon
// d'annonce, réponses à des questions) ; il ne modifie jamais la base : c'est
// l'admin qui valide dans l'interface.
//
// Déploiement :
//   supabase functions deploy admin-assistant
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   (optionnel) supabase secrets set ANTHROPIC_MODEL=claude-sonnet-5-5
// ============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-5-5'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const STATUSES = ['present', 'partial', 'absent_justified', 'absent_unjustified']

async function callClaude(system: string, content: unknown[], maxTokens = 1500) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || 'Erreur API IA')
  return (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
}

const parseJson = (t: string) => JSON.parse(t.replace(/```json|```/g, '').trim())

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY non configurée sur le serveur.' }, 500)

  // Authentification : seul un admin connecté peut utiliser l'assistant.
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: userData } = await supabase.auth.getUser(token)
  if (!userData?.user) return json({ error: 'Non authentifié' }, 401)
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single()
  if (!prof || !['admin', 'super_admin'].includes(prof.role)) return json({ error: 'Réservé aux admins' }, 403)

  try {
    const body = await req.json()

    if (body.action === 'parse_attendance') {
      const text = String(body.text || '').slice(0, 20000)
      const members = (body.members || []).slice(0, 200)
      const content: unknown[] = []
      if (body.image?.data && ['image/jpeg', 'image/png', 'image/webp'].includes(body.image.media_type)) {
        content.push({ type: 'image', source: { type: 'base64', media_type: body.image.media_type, data: body.image.data } })
      }
      content.push({ type: 'text', text: `Membres de la guilde (id, pseudo) :\n${JSON.stringify(members)}\n\nÉvénement : ${body.event_label || ''}\n\nListe / message des présences :\n${text || '(voir image)'}` })
      const out = await callClaude(
        `Tu aides les admins d'une guilde Free Fire à saisir les présences. Associe chaque nom cité (pseudo parfois mal orthographié) à un membre de la liste fournie.
Statuts autorisés : ${STATUSES.join(', ')}. "retard", "parti tôt" => partial ; "excusé", "prévenu", "justifié" => absent_justified ; "absent", "non venu" => absent_unjustified ; sinon présent.
N'invente jamais de membre : si aucun pseudo ne correspond clairement, mets member_id à null.
Ne mentionne que les personnes citées. Réponds UNIQUEMENT en JSON : {"matches":[{"name":"nom lu","member_id":"id ou null","status":"..."}]}`,
        content,
      )
      const parsed = parseJson(out)
      const ids = new Set(members.map((m: any) => m.id))
      const matches = (parsed.matches || [])
        .filter((m: any) => STATUSES.includes(m.status))
        .map((m: any) => ({ name: String(m.name || ''), member_id: ids.has(m.member_id) ? m.member_id : null, status: m.status }))
      return json({ matches })
    }

    if (body.action === 'draft_announcement') {
      const text = await callClaude(
        `Tu rédiges des annonces pour la guilde Free Fire MÉCHANTCHARO, en français, ton motivant et fier, court (max 120 mots), sans inventer de faits : utilise uniquement les informations fournies. Réponds avec le texte seul.`,
        [{ type: 'text', text: `Sujet / infos : ${String(body.topic || '').slice(0, 3000)}` }],
        600,
      )
      return json({ text })
    }

    if (body.action === 'ask') {
      const text = await callClaude(
        `Tu es l'assistant des admins de la guilde MÉCHANTCHARO. Réponds en français, de façon concise, uniquement à partir des données JSON fournies. Si l'information n'y est pas, dis-le. Tu ne modifies rien : tu proposes seulement.`,
        [{ type: 'text', text: `Données :\n${JSON.stringify(body.context).slice(0, 60000)}\n\nQuestion : ${String(body.question || '').slice(0, 1000)}` }],
        1200,
      )
      return json({ text })
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message || 'Erreur' }, 500)
  }
})
