import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

interface SendOrderRequest {
  to: string;
  subject: string;
  html?: string;
  pdfBase64?: string;
  pdfFilename?: string;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeBase64UrlString(str: string): string {
  return encodeBase64Url(new TextEncoder().encode(str));
}

function buildRawEmail(opts: {
  to: string;
  subject: string;
  html: string;
  pdfBase64?: string;
  pdfFilename?: string;
}): string {
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(opts.subject)))}?=`;

  if (opts.pdfBase64) {
    const boundary = "----=_OrderForm_" + Math.random().toString(36).slice(2);
    // Re-wrap base64 to 76 char lines
    const wrapped = opts.pdfBase64.replace(/(.{76})/g, "$1\r\n");
    const filename = opts.pdfFilename || "order-form.pdf";
    const message = [
      `To: ${opts.to}`,
      `Subject: ${encodedSubject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 7bit",
      "",
      opts.html,
      "",
      `--${boundary}`,
      `Content-Type: application/pdf; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      wrapped,
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n");
    return encodeBase64UrlString(message);
  }

  const message = [
    `To: ${opts.to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    opts.html,
  ].join("\r\n");
  return encodeBase64UrlString(message);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!GOOGLE_MAIL_API_KEY) throw new Error("GOOGLE_MAIL_API_KEY is not configured");

    const { to, subject, html, pdfBase64, pdfFilename }: SendOrderRequest = await req.json();
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing to or subject" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const bodyHtml = html || `<p>Order form attached: ${pdfFilename || "order-form.pdf"}</p>`;
    const raw = buildRawEmail({ to, subject, html: bodyHtml, pdfBase64, pdfFilename });

    const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Gmail send failed:", res.status, data);
      throw new Error(`Gmail send failed [${res.status}]: ${JSON.stringify(data)}`);
    }

    console.log("Order email sent via Gmail:", data);
    return new Response(JSON.stringify({ success: true, response: data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-order-to-printer:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
