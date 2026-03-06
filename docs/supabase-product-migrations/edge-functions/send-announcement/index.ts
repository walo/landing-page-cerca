/**
 * Edge Function: send-announcement
 * Proyecto: tmahegehoshaciodewzm (producto Cerca)
 *
 * Dispara el envío de un comunicado: genera filas en announcement_deliveries (si no existen),
 * procesa la cola de pendientes y llama al proveedor de email/push.
 *
 * Invocación: POST con { "announcement_id": "uuid" } o vía cron para procesar todos los pending.
 * Requiere: Supabase client con service_role para insertar/actualizar deliveries.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const { announcement_id } = (await req.json()) as { announcement_id?: string };
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!announcement_id) {
      return new Response(
        JSON.stringify({ error: "announcement_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: announcement, error: errAnn } = await supabase
      .from("announcements")
      .select("id, conjunto_id, title, body, type, target_type, target_config")
      .eq("id", announcement_id)
      .single();

    if (errAnn || !announcement) {
      return new Response(
        JSON.stringify({ error: "Announcement not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Obtener destinatarios según target_type (simplificado: todos los residentes del conjunto)
    let residentIds: string[] = [];
    if (announcement.target_type === "all") {
      const { data: residents } = await supabase
        .from("residents")
        .select("id")
        .eq("conjunto_id", announcement.conjunto_id)
        .eq("status", "Active");
      residentIds = (residents ?? []).map((r) => r.id);
    }
    // TODO: by_zone, by_unit, explicit usando target_config

    const channels: ("email" | "push")[] = ["email"]; // Añadir "push" si aplica

    for (const residentId of residentIds) {
      for (const channel of channels) {
        const { data: existing } = await supabase
          .from("announcement_deliveries")
          .select("id")
          .eq("announcement_id", announcement_id)
          .eq("resident_id", residentId)
          .eq("channel", channel)
          .maybeSingle();

        if (!existing) {
          await supabase.from("announcement_deliveries").insert({
            announcement_id,
            resident_id: residentId,
            channel,
            status: "pending",
          });
        }
      }
    }

    // Procesar pendientes: enviar y actualizar status (stub: simular envío)
    const { data: pending } = await supabase
      .from("announcement_deliveries")
      .select("id, resident_id, channel")
      .eq("announcement_id", announcement_id)
      .eq("status", "pending");

    for (const d of pending ?? []) {
      // TODO: integrar Resend/SendGrid para email y OneSignal/FCM para push
      // const ok = await sendEmail(resident, announcement) o sendPush(resident, announcement);
      const ok = true; // stub
      await supabase
        .from("announcement_deliveries")
        .update({
          status: ok ? "sent" : "failed",
          sent_at: ok ? new Date().toISOString() : null,
          error_message: ok ? null : "Provider error",
        })
        .eq("id", d.id);
    }

    const { error: updateSent } = await supabase
      .from("announcements")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", announcement_id);

    return new Response(
      JSON.stringify({
        ok: true,
        announcement_id,
        deliveries_processed: pending?.length ?? 0,
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
