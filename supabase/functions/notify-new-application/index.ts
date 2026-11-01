// ============================================================================
// Edge Function : notify-new-application
// Envoie un email d'alerte à la guilde (par défaut mechantcharoguild@gmail.com) avec toutes les
// informations remplies par un candidat. Appelée par le formulaire juste après l'envoi de la candidature.
//
// Publique (le candidat n'est pas forcément connecté) mais protégée :
//  - elle ne reçoit que l'identifiant (uuid aléatoire) de la candidature, connu uniquement du candidat ;
//  - un email n'est envoyé qu'une seule fois par candidature (colonne notified_at) et seulement dans les 15 minutes.
//
// Déploiement :
//   supabase functions deploy notify-new-application --no-verify-jwt
//   supabase secrets set RESEND_API_KEY=re_... ALERT_EMAIL_FROM=guilde@tondomaine.com
//   (optionnel) supabase secrets set NOTIFY_EMAIL=mechantcharoguild@gmail.com SITE_URL=https://ton-site.com
// ============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const resendApiKey = Deno.env.get('RESEND_API_KEY')
const fromEmail = Deno.env.get('ALERT_EMAIL_FROM') || 'guilde@bataille-des-charos.app'
const toEmail = Deno.env.get('NOTIFY_EMAIL') || 'mechantcharoguild@gmail.com'
const siteUrl = (Deno.env.get('SITE_URL') || '').replace(/\/$/, '')

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const yesNo = (v: boolean | null) => (v === null || v === undefined ? '—' : v ? 'Oui' : 'Non')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  try {
    const { application_id } = await req.json()
    if (!application_id || typeof application_id !== 'string') return json({ error: 'Identifiant manquant' }, 400)

    const { data: app } = await supabase.from('guild_applications').select('*').eq('id', application_id).maybeSingle()
    if (!app) return json({ error: 'Candidature introuvable' }, 404)
    if (app.notified_at) return json({ sent: false, note: 'Alerte déjà envoyée.' })
    if (Date.now() - new Date(app.created_at).getTime() > 15 * 60 * 1000) return json({ sent: false, note: 'Délai dépassé.' })
    if (!resendApiKey) return json({ sent: false, note: 'RESEND_API_KEY non configurée : email non envoyé (la candidature reste visible dans l’admin).' })

    const rows: [string, string][] = [
      ['Pseudo', app.pseudo],
      ['ID Free Fire', app.ff_uid],
      ['Email', app.email],
      ['Rang en jeu', app.game_rank || '—'],
      ['Togolais', yesNo(app.is_togolese)],
      ...(app.is_togolese ? [['Parle éwé', yesNo(app.speaks_ewe)] as [string, string]] : []),
      ['Pays', app.country || '—'],
      ['Règlement accepté', app.rules_accepted_at ? `Oui (version ${app.rules_version ?? '?'}, le ${new Date(app.rules_accepted_at).toLocaleString('fr-FR', { timeZone: 'UTC' })} UTC)` : 'Non'],
      ['Reçue le', new Date(app.created_at).toLocaleString('fr-FR', { timeZone: 'UTC' }) + ' UTC'],
    ]
    const table = rows.map(([k, v]) => `<tr><td style="padding:8px 12px;color:#6b7280;border-bottom:1px solid #eef0f3;white-space:nowrap">${esc(k)}</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eef0f3">${esc(v)}</td></tr>`).join('')
    const message = app.message ? `<p style="margin:18px 0 6px;color:#6b7280;font-size:13px">Présentation</p><p style="margin:0;padding:12px 14px;background:#f8fafc;border-radius:10px;line-height:1.6;white-space:pre-wrap">${esc(app.message)}</p>` : ''
    const adminLink = siteUrl ? `<p style="margin-top:22px"><a href="${siteUrl}/admin?tab=guilde&sub=candidatures" style="background:#ff5a1f;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:700;font-size:14px">Ouvrir les candidatures</a></p>` : ''

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:26px;border:1px solid #e5e7eb;border-radius:18px;color:#111827">
        <h2 style="margin:0 0 4px">Nouvelle candidature à la guilde</h2>
        <p style="margin:0 0 18px;color:#6b7280;font-size:14px">${esc(app.pseudo)} souhaite rejoindre MÉCHANTCHARO.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${table}</table>
        ${message}${adminLink}
      </div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: toEmail, reply_to: app.email, subject: `Nouvelle candidature : ${app.pseudo}`, html }),
    })
    if (res.ok) await supabase.from('guild_applications').update({ notified_at: new Date().toISOString() }).eq('id', app.id)
    return json({ sent: res.ok, note: res.ok ? undefined : 'Échec de l’envoi par le fournisseur d’email.' })
  } catch (e) {
    return json({ error: (e as Error).message || 'Erreur' }, 500)
  }
})
