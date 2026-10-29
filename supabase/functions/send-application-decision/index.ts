// ============================================================================
// Edge Function : send-application-decision
// Envoie à un candidat un email d'acceptation ou de refus, après la décision
// d'un admin. Appelée depuis le panneau admin avec l'id de la candidature.
//
// Déploiement :
//   supabase functions deploy send-application-decision
//   supabase secrets set RESEND_API_KEY=re_... ALERT_EMAIL_FROM=guilde@tondomaine.com
// Sans RESEND_API_KEY, rien n'est envoyé : le panneau admin propose un lien mailto de secours.
// ============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const resendApiKey = Deno.env.get('RESEND_API_KEY')
const fromEmail = Deno.env.get('ALERT_EMAIL_FROM') || 'guilde@bataille-des-charos.app'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: userData } = await supabase.auth.getUser(token)
  if (!userData?.user) return json({ error: 'Non authentifié' }, 401)
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single()
  if (!prof || !['admin', 'super_admin'].includes(prof.role)) return json({ error: 'Réservé aux admins' }, 403)

  const { application_id } = await req.json()
  const { data: app } = await supabase.from('guild_applications').select('*').eq('id', application_id).single()
  if (!app || app.status === 'pending') return json({ error: 'Candidature introuvable ou non traitée' }, 400)
  if (!resendApiKey) return json({ sent: false, note: 'RESEND_API_KEY non configurée : email non envoyé.' })

  const accepted = app.status === 'accepted'
  const subject = accepted ? 'Bienvenue dans la guilde MÉCHANTCHARO !' : 'Ta candidature à la guilde MÉCHANTCHARO'
  const note = app.admin_note ? `<p style="font-size:14px;line-height:1.6;">Message de l'équipe : <em>${esc(app.admin_note)}</em></p>` : ''
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border-radius:16px;border:1px solid #e5e7eb;color:#111827;">
      <h2 style="margin:0 0 12px;">${accepted ? `Bienvenue, ${esc(app.pseudo)} !` : `Bonjour ${esc(app.pseudo)},`}</h2>
      <p style="font-size:14px;line-height:1.6;">${accepted
        ? "Ta candidature a été acceptée : tu fais maintenant partie de la guilde MÉCHANTCHARO. Un admin te contactera pour la suite. Soyez Méchant !"
        : "Merci pour l'intérêt que tu portes à la guilde MÉCHANTCHARO. Après examen, nous ne pouvons pas donner suite à ta candidature pour le moment. Tu pourras retenter ta chance plus tard."}</p>
      ${note}
    </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromEmail, to: app.email, subject, html }),
  })
  return json({ sent: res.ok, note: res.ok ? undefined : 'Échec de l\'envoi par le fournisseur d\'email.' })
})
