import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
const hookSecretRaw = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";
const hookSecret = hookSecretRaw.replace(/^v1,whsec_/, "");
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const senderEmail = Deno.env.get("SENDER_EMAIL") ?? "Cerca <no-reply@resend.dev>";
const logoUrl = Deno.env.get("CERCA_LOGO_URL") ?? "";

function buildVerifyUrl(emailData: {
  token_hash: string;
  email_action_type: string;
  redirect_to: string;
}): string {
  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type,
    redirect_to: emailData.redirect_to,
  });
  return `${supabaseUrl}/auth/v1/verify?${params.toString()}`;
}

function buildInviteEmailHtml(
  confirmUrl: string,
  contactName: string | undefined
): string {
  const greeting = contactName ? `Hola, ${contactName}` : "Hola";
  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="Cerca Citofonía" style="max-width:180px;height:auto;display:block;margin:0 auto 24px;" />`
    : `<h1 style="color:#0284c7;font-size:28px;font-family:sans-serif;margin:0 0 24px;">Cerca Citofonía</h1>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Cerca Citofonía</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05);overflow:hidden;">
          <tr>
            <td style="padding:40px 32px;text-align:center;">
              ${logoSection}
              <h2 style="color:#1e293b;font-size:22px;font-weight:600;margin:0 0 16px;">${greeting}</h2>
              <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px;">
                ¡Bienvenido a <strong>Cerca Citofonía</strong>! Estamos muy contentos de que confíes en nosotros.
              </p>
              <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 32px;">
                Haz clic en el siguiente enlace para activar tu cuenta y crear tu contraseña:
              </p>
              <a href="${confirmUrl}" style="display:inline-block;background:#0284c7;color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">
                Activar mi cuenta
              </a>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:32px 0 0;">
                Si no solicitaste esta invitación, puedes ignorar este correo.
              </p>
              <p style="color:#64748b;font-size:14px;margin:24px 0 0;">
                Gracias por confiar en nosotros.<br>
                <strong>El equipo de Cerca Citofonía</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function buildGenericEmailHtml(
  confirmUrl: string,
  emailActionType: string,
  token: string
): string {
  const config: Record<
    string,
    { subject: string; title: string; message: string }
  > = {
    signup: {
      subject: "Confirma tu correo",
      title: "Confirma tu registro",
      message: "Haz clic en el enlace para confirmar tu correo electrónico:",
    },
    recovery: {
      subject: "Restablece tu contraseña",
      title: "Restablecer contraseña",
      message: "Haz clic en el enlace para crear una nueva contraseña:",
    },
    magiclink: {
      subject: "Tu enlace de acceso",
      title: "Inicia sesión",
      message: "Haz clic en el enlace para acceder a tu cuenta:",
    },
    invite: {
      subject: "Bienvenido a Cerca Citofonía",
      title: "Activa tu cuenta",
      message: "Haz clic en el enlace para activar tu cuenta:",
    },
  };
  const c = config[emailActionType] ?? config.invite;
  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="Cerca Citofonía" style="max-width:180px;height:auto;display:block;margin:0 auto 24px;" />`
    : `<h1 style="color:#0284c7;font-size:28px;font-family:sans-serif;margin:0 0 24px;">Cerca Citofonía</h1>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05);overflow:hidden;">
          <tr>
            <td style="padding:40px 32px;text-align:center;">
              ${logoSection}
              <h2 style="color:#1e293b;font-size:22px;font-weight:600;margin:0 0 16px;">${c.title}</h2>
              <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px;">${c.message}</p>
              <a href="${confirmUrl}" style="display:inline-block;background:#0284c7;color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">Continuar</a>
              <p style="color:#94a3b8;font-size:14px;margin:24px 0 0;">Código alternativo: <code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;">${token}</code></p>
              <p style="color:#64748b;font-size:14px;margin:24px 0 0;">— El equipo de Cerca Citofonía</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function getSubject(emailActionType: string): string {
  const subjects: Record<string, string> = {
    invite: "Bienvenido a Cerca Citofonía - Activa tu cuenta",
    signup: "Confirma tu correo - Cerca Citofonía",
    recovery: "Restablece tu contraseña - Cerca Citofonía",
    magiclink: "Tu enlace de acceso - Cerca Citofonía",
  };
  return subjects[emailActionType] ?? "Notificación - Cerca Citofonía";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(hookSecret);

  try {
    const { user, email_data } = wh.verify(payload, headers) as {
      user: { email: string; user_metadata?: { contact_name?: string } };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
      };
    };

    const confirmUrl = buildVerifyUrl(email_data);
    const contactName = user.user_metadata?.contact_name;

    const isInvite = email_data.email_action_type === "invite";
    const html = isInvite
      ? buildInviteEmailHtml(confirmUrl, contactName)
      : buildGenericEmailHtml(
          confirmUrl,
          email_data.email_action_type,
          email_data.token
        );

    const { error } = await resend.emails.send({
      from: senderEmail,
      to: [user.email],
      subject: getSubject(email_data.email_action_type),
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw error;
    }
  } catch (err) {
    console.error("send-email hook error:", err);
    return new Response(
      JSON.stringify({
        error: {
          message: err instanceof Error ? err.message : "Failed to send email",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
