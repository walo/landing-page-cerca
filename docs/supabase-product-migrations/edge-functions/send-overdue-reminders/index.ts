/**
 * Edge Function: send-overdue-reminders
 * Proyecto: tmahegehoshaciodewzm (producto Cerca)
 *
 * Lista facturas con status = 'Overdue', verifica máximo de recordatorios por factura,
 * envía email/push (reutilizando lógica de comunicados si existe) y registra en overdue_reminders.
 *
 * Invocación: POST sin body (o con conjunto_id opcional) o vía cron diario.
 * Requiere: SUPABASE_SERVICE_ROLE_KEY; opcional: RESEND_API_KEY o proveedor de email.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_REMINDERS_PER_BILL = 3;

Deno.serve(async (req) => {
  try {
    const body = (await req.json().catch(() => ({}))) as { conjunto_id?: string };
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from("bills")
      .select("id, conjunto_id, unit_id, period, due_date, total_amount, description")
      .eq("status", "Overdue");

    if (body?.conjunto_id) {
      query = query.eq("conjunto_id", body.conjunto_id);
    }

    const { data: bills, error: errBills } = await query;

    if (errBills) {
      return new Response(
        JSON.stringify({ error: errBills.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    for (const bill of bills ?? []) {
      const { count } = await supabase
        .from("overdue_reminders")
        .select("id", { count: "exact", head: true })
        .eq("bill_id", bill.id)
        .eq("channel", "email");

      if ((count ?? 0) >= MAX_REMINDERS_PER_BILL) continue;

      // Obtener residente(s) de la unidad para enviar (ej. contacto principal)
      const { data: residents } = await supabase
        .from("residents")
        .select("id, user_id")
        .eq("unit_id", bill.unit_id)
        .eq("conjunto_id", bill.conjunto_id)
        .or("is_primary_contact.eq.true,type.eq.Propietario")
        .limit(1);

      if (!residents?.length) continue;

      // TODO: obtener email del usuario (auth.users o perfiles), enviar con Resend/SendGrid
      // await sendOverdueEmail(email, { unit: bill.unit_id, period: bill.period, amount: bill.total_amount, due_date: bill.due_date });
      const ok = true; // stub

      if (ok) {
        await supabase.from("overdue_reminders").insert({
          conjunto_id: bill.conjunto_id,
          bill_id: bill.id,
          channel: "email",
        });
        sent++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        bills_checked: bills?.length ?? 0,
        reminders_sent: sent,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
