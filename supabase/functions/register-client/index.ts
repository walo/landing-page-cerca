import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLIENT_STATUS_ACTIVE = 22;
const SUBSCRIPTION_STATUS_TRIAL = 10;

interface RegistrationPayload {
  name: string;
  contact_name: string;
  tax_id: string;
  contact_email: string;
  contact_phone: string;
  billing_address: string;
  billing_city: string;
  plan_id: string;
  client_type?: "SINGLE_CONJUNTO" | "ADMIN_COMPANY";
  is_enterprise?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const payload: RegistrationPayload = await req.json();

    const requiredFields: (keyof RegistrationPayload)[] = [
      "name", "contact_name", "contact_email", "plan_id",
      "tax_id", "contact_phone", "billing_address", "billing_city"
    ];
    const missingFields = requiredFields.filter(f => !payload[f]?.trim());
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: `Campos requeridos faltantes: ${missingFields.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.contact_email)) {
      return new Response(
        JSON.stringify({ error: "Formato de correo electrónico inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Verify plan and resolve is_enterprise
    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("id, name, trial_days, is_enterprise")
      .eq("id", payload.plan_id)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: "Plan no encontrado o inactivo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isEnterprise = payload.is_enterprise ?? plan.is_enterprise ?? false;
    const clientType = payload.client_type ?? (isEnterprise ? "ADMIN_COMPANY" : "SINGLE_CONJUNTO");

    // 2. Check uniqueness: email
    const { data: existingEmail } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("contact_email", payload.contact_email.trim().toLowerCase())
      .maybeSingle();

    if (existingEmail) {
      return new Response(
        JSON.stringify({ error: "Ya existe un cliente registrado con este correo electrónico" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check uniqueness: NIT
    const { data: existingNit } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("tax_id", payload.tax_id.trim())
      .maybeSingle();

    if (existingNit) {
      return new Response(
        JSON.stringify({ error: "Ya existe un cliente registrado con este NIT" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Check uniqueness: name (case-insensitive)
    const { data: existingName } = await supabaseAdmin
      .from("clients")
      .select("id")
      .ilike("name", payload.name.trim())
      .maybeSingle();

    if (existingName) {
      return new Response(
        JSON.stringify({ error: "Ya existe un cliente registrado con este nombre" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create client with client_type
    const { data: createdClient, error: clientError } = await supabaseAdmin
      .from("clients")
      .insert({
        name: payload.name.trim(),
        contact_name: payload.contact_name.trim(),
        tax_id: payload.tax_id.trim(),
        contact_email: payload.contact_email.trim().toLowerCase(),
        contact_phone: payload.contact_phone.trim(),
        billing_address: payload.billing_address.trim(),
        billing_city: payload.billing_city.trim(),
        plan_id: payload.plan_id,
        status_id: CLIENT_STATUS_ACTIVE,
        is_active: true,
        client_type: clientType,
      })
      .select("id")
      .single();

    if (clientError || !createdClient) {
      console.error("Error creando cliente:", JSON.stringify(clientError));
      return new Response(
        JSON.stringify({ error: "Error al crear el cliente. Por favor intenta nuevamente.", detail: clientError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = createdClient.id;

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + (plan.trial_days ?? 15));

    // 6. Create client_subscription
    const { data: createdSub, error: subError } = await supabaseAdmin
      .from("client_subscriptions")
      .insert({
        client_id: clientId,
        plan_id: payload.plan_id,
        status_id: SUBSCRIPTION_STATUS_TRIAL,
        trial_end_date: trialEndDate.toISOString(),
        auto_renew: true,
      })
      .select("id")
      .single();

    if (subError || !createdSub) {
      console.error("Error creando suscripción:", JSON.stringify(subError));
      await supabaseAdmin.from("clients").delete().eq("id", clientId);
      return new Response(
        JSON.stringify({ error: "Error al crear la suscripción. Por favor intenta nuevamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Cerca Pro only: create eco_conjuntos and link active_subscription_id
    let conjuntoId: string | null = null;
    if (!isEnterprise) {
      const { data: createdConjunto, error: conjuntoError } = await supabaseAdmin
        .from("eco_conjuntos")
        .insert({
          nombre: payload.name.trim(),
          nit: payload.tax_id.trim(),
          direccion: payload.billing_address.trim(),
          client_id: clientId,
          active_subscription_id: createdSub.id,
        })
        .select("id")
        .single();

      if (conjuntoError || !createdConjunto) {
        console.error("Error creando eco_conjuntos:", JSON.stringify(conjuntoError));
        await supabaseAdmin.from("client_subscriptions").delete().eq("id", createdSub.id);
        await supabaseAdmin.from("clients").delete().eq("id", clientId);
        return new Response(
          JSON.stringify({ error: "Error al crear el conjunto. Por favor intenta nuevamente.", detail: conjuntoError?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      conjuntoId = createdConjunto.id;
    }

    // 8. Create auth user and send email (invite = set password link).
    // El correo se envía mediante la Edge Function send-email cuando está configurada como
    // Send Email Hook en Supabase (Authentication → Hooks). send-email usa Resend y la
    // plantilla personalizada "Bienvenido a Cerca Citofonía"; data.contact_name se usa en el saludo.
    // redirectTo DEBE apuntar a /auth/set-password. Configurar CERCA_ADMIN_SET_PASSWORD_URL y
    // SAAS_ADMIN_SET_PASSWORD_URL en Supabase (Secrets).
    const baseRedirect = isEnterprise
      ? (Deno.env.get("SAAS_ADMIN_SET_PASSWORD_URL") ?? "https://saas-admin.example.com")
      : (Deno.env.get("CERCA_ADMIN_SET_PASSWORD_URL") ?? "https://cerca-admin.example.com");
    const redirectUrl = baseRedirect.includes("/auth/set-password")
      ? baseRedirect
      : baseRedirect.replace(/\/?$/, "") + "/auth/set-password";

    const adminRole = isEnterprise ? "admin_company" : "admin_conjunto";

    let authData: { user?: { id: string } } | null = null;
    let authError: { message?: string } | null = null;
    try {
      const result = await supabaseAdmin.auth.admin.inviteUserByEmail(
        payload.contact_email.trim().toLowerCase(),
        {
          redirectTo: redirectUrl,
          data: {
            client_id: clientId,
            client_name: payload.name.trim(),
            contact_name: payload.contact_name.trim(),
            role: adminRole,
            plan_name: plan.name,
          },
        }
      );
      authData = result.data;
      authError = result.error;
    } catch (inviteErr) {
      console.warn("inviteUserByEmail lanzó excepción:", inviteErr);
      authError = { message: inviteErr instanceof Error ? inviteErr.message : String(inviteErr) };
    }

    let userId: string | null = authData?.user?.id ?? null;
    if (authError) {
      console.warn(
        "Invitación auth fallida (el correo puede no enviarse). Plan:",
        isEnterprise ? "Enterprise" : "Pro",
        "| redirectUrl:",
        redirectUrl,
        "| error:",
        JSON.stringify(authError)
      );
    }

    // 9. Vincular usuario: eco_profiles (Pro) o admin_users (Enterprise si tiene client_id)
    if (userId) {
      if (!isEnterprise && conjuntoId) {
        const { error: profileError } = await supabaseAdmin
          .from("eco_profiles")
          .insert({
            id: userId,
            role: "ADMIN",
            conjunto_id: conjuntoId,
            full_name: payload.contact_name.trim(),
          });
        if (profileError) {
          console.warn("Advertencia insert eco_profiles:", JSON.stringify(profileError));
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        clientId,
        message: `¡Registro exitoso! Revisa tu correo ${payload.contact_email} para crear tu contraseña e ingresar.`,
        planName: plan.name,
        trialEndDate: trialEndDate.toISOString(),
        emailSent: !authError,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error inesperado:", message, err);
    const isProd = Deno.env.get("DENO_ENV") === "production";
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor. Por favor intenta nuevamente.",
        ...(isProd ? {} : { detail: message }),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
