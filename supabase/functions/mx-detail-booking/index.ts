import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ── Config ──────────────────────────────────────────────────────
const GHL_API = "https://services.leadconnectorhq.com";
const GHL_LOCATION_ID = "EYGA3G4KGz3qHyZXzRkH";

// GHL Custom Field IDs (from /locations/{id}/customFields)
const CF_SERVICE_CITY = "2MXRgYECjblQZMg54tin";
const JOB_APPLICATION_PIPELINE_ID = "KdzgB4JGVXkNche5fcnS"; // Detailer Applications
const JOB_APPLICATION_STAGE_ID = "e4ec24b7-4d0e-4e30-9026-2cb7c1340dcd"; // New Application

const JOB_APPLICATION_FIELDS: Record<string, string> = {
  fullName: "pAcGSxuYMSaqDXwjV0ZM",
  phone: "GslWUqHFDAAidtktc3a8",
  email: "cYqDtlnkJ5MImhGuMXGC",
  city: "rPRqJv60IANYFj7f6lrY",
  daysAvailable: "ICMLFIaaGIj6e10OkK0O",
  hoursAvailable: "RnOg67IPkVvXlIzl4qUE",
  startDate: "2D8M2wKp9d1hdsRDxrJC",
  detailingExperience: "rWslL9ILLkaEtOwC4aCY",
  toolsUsed: "HunC8s7FXPd2T5WK3H0b",
  comfortableOutdoors: "wybTHi8N9QgAX6Ora9vZ",
  weekendAvailability: "e5h2aDsNgFABRXLSPk1h",
  attentionToDetail: "DVcJ9ihewM59nZAZQR1B",
  perfectDetailMeaning: "gpa2gbQE4GpXoeFCq8gM",
  everBeenFired: "L5YdhmP5C4T8xbZvp3rr",
  daysMissed: "JsDdRIjRqMKq98qaOnIV",
  whyHire: "1vxOYOoVaknzumJd0RlC",
  currentWeeklyIncome: "3qv51foOPAoQOUppjmAq",
  expectedWeeklyIncome: "1iX1b7dFVZnmuWnRlaRD",
  performancePay: "EaUOXzS37s4BnoTols9l",
  paidTestDetail: "Fl9jZdVGOHkHN4HdLP75",
};

const ALLOWED_ORIGINS = [
  "https://mxdetail.endlesswinning.com",
  "http://mxdetail.endlesswinning.com",
  "https://staging.mxdetail.com",
  "http://staging.mxdetail.com",
  "https://mxdetail.com",
  "http://mxdetail.com",
  "https://www.mxdetail.com",
  "http://localhost:3000",
];

const MARKET_MAP: Record<string, { tag: string; city: string }> = {
  tampa:   { tag: "tampa-market",   city: "Tampa Market" },
  orlando: { tag: "orlando-market", city: "Orlando Market" },
};

const LEAD_SMS_RECIPIENT_ENV_BY_MARKET: Record<string, string> = {
  tampa: "MXDETAIL_TAMPA_LEAD_SMS_TO",
  orlando: "MXDETAIL_ORLANDO_LEAD_SMS_TO",
};

// Slack
const SLACK_LEADS_CHANNEL = "C0A2BRWT7PD"; // #leads

// ── Helpers ─────────────────────────────────────────────────────
function corsHeaders(origin: string) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function ghlHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };
}

function slackChannelRef(channel: string): string {
  const value = channel.trim();
  if (!value) return value;
  if (value.startsWith("#") || /^[A-Z][A-Z0-9]{8,}$/.test(value)) return value;
  return `#${value}`;
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function truncateSms(value: string): string {
  return value.length > 1500 ? `${value.slice(0, 1497)}...` : value;
}

async function addTagsWithRetry(
  contactId: string,
  tags: string[],
  headers: Record<string, string>,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${GHL_API}/contacts/${contactId}/tags`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tags }),
    });
    if (res.ok) return;
    console.error(`Tag add attempt ${attempt + 1} failed: ${res.status}`);
    if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
  }
}

async function lookupContactByEmail(
  email: string,
  headers: Record<string, string>,
): Promise<string | null> {
  const res = await fetch(
    `${GHL_API}/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(email)}&limit=1`,
    { method: "GET", headers },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.contacts?.[0]?.id ?? null;
}

function pushCustomField(
  fields: { id: string; field_value: string }[],
  id: string,
  value: unknown,
): void {
  const fieldValue = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  if (fieldValue) {
    fields.push({ id, field_value: fieldValue });
  }
}

function buildJobApplicationCustomFields(body: Record<string, unknown>): { id: string; field_value: string }[] {
  const fullName = [body.firstName, body.lastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");

  const customFields: { id: string; field_value: string }[] = [];
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.fullName, fullName);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.phone, body.phone);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.email, body.email);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.city, body.city);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.daysAvailable, body.daysAvailable);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.hoursAvailable, body.hoursAvailable);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.startDate, body.startDate);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.detailingExperience, body.detailingExperience);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.toolsUsed, body.toolsUsed);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.comfortableOutdoors, body.comfortableOutdoors);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.weekendAvailability, body.weekendAvailability);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.attentionToDetail, body.attentionToDetail);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.perfectDetailMeaning, body.perfectDetailMeaning);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.everBeenFired, body.everBeenFired);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.daysMissed, body.daysMissed);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.whyHire, body.whyHire);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.currentWeeklyIncome, body.currentWeeklyIncome);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.expectedWeeklyIncome, body.expectedWeeklyIncome);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.performancePay, body.performancePay);
  pushCustomField(customFields, JOB_APPLICATION_FIELDS.paidTestDetail, body.paidTestDetail);
  return customFields;
}

async function createJobApplicationOpportunity(
  contactId: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<string> {
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const name = `Job Application - ${[firstName, lastName].filter(Boolean).join(" ") || "Website Applicant"}`;

  const res = await fetch(`${GHL_API}/opportunities/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      pipelineId: JOB_APPLICATION_PIPELINE_ID,
      locationId: GHL_LOCATION_ID,
      name,
      pipelineStageId: JOB_APPLICATION_STAGE_ID,
      status: "open",
      contactId,
      monetaryValue: 0,
      source: "Website - Job Application",
    }),
  });

  if (!res.ok) {
    const data = await res.text();
    console.error(`Job application opportunity create failed: ${res.status} ${data}`);
    throw new Error("Failed to create job application opportunity");
  }

  const data = await res.json();
  return data?.opportunity?.id ?? data?.id ?? "";
}

function buildLeadSmsBody(body: Record<string, unknown>, source: string): string {
  const firstName = textValue(body.firstName);
  const lastName = textValue(body.lastName);
  const name = [firstName, lastName].filter(Boolean).join(" ") || "Unknown lead";
  const phone = textValue(body.phone) || "No phone";
  const email = textValue(body.email);
  const service = textValue(body.service);
  const location = textValue(body.location);
  const preferredDate = textValue(body.preferredDate);
  const vehicle = [body.vehicleYear, body.vehicleMake, body.vehicleModel]
    .map(textValue)
    .filter(Boolean)
    .join(" ");
  const message = textValue(body.message);

  const parts = [
    `New MX Detail lead${location ? ` (${location})` : ""}`,
    `Name: ${name}`,
    `Phone: ${phone}`,
  ];
  if (email) parts.push(`Email: ${email}`);
  if (service) parts.push(`Service: ${service}`);
  if (vehicle) parts.push(`Vehicle: ${vehicle}`);
  if (preferredDate) parts.push(`Preferred date: ${preferredDate}`);
  if (message) parts.push(`Notes: ${message}`);
  parts.push(`Source: ${source}`);

  return truncateSms(parts.join("\n"));
}

async function sendLeadSmsNotification(
  locationKey: string,
  body: Record<string, unknown>,
  source: string,
): Promise<void> {
  const recipientEnv = LEAD_SMS_RECIPIENT_ENV_BY_MARKET[locationKey];
  if (!recipientEnv) return;

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const fromPhone = Deno.env.get("TWILIO_FROM_PHONE");
  const toPhone = Deno.env.get(recipientEnv);

  if (!accountSid || !authToken) {
    console.error("Twilio SMS config missing: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not set");
    return;
  }
  if (!messagingServiceSid && !fromPhone) {
    console.error("Twilio SMS config missing: TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_PHONE is not set");
    return;
  }
  if (!toPhone) {
    console.error(`Twilio SMS recipient config missing: ${recipientEnv} is not set`);
    return;
  }

  const params = new URLSearchParams({
    To: toPhone,
    Body: buildLeadSmsBody(body, source),
  });
  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid);
  } else if (fromPhone) {
    params.set("From", fromPhone);
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    let code = "unknown";
    try {
      const data = await res.json();
      code = String(data?.code ?? code);
    } catch {
      // Ignore parse errors; the HTTP status is enough for safe logging.
    }
    console.error(`Twilio SMS send failed: status=${res.status} code=${code}`);
  }
}

// ── Slack Notification ──────────────────────────────────────────
async function sendSlackNotification(
  token: string,
  channel: string,
  body: Record<string, unknown>,
): Promise<void> {
  const { firstName, lastName, phone, email, service, source,
          vehicleYear, vehicleMake, vehicleModel, preferredDate,
          location, message } = body as Record<string, string>;

  const name = `${firstName} ${lastName}`;
  const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

  // ── Main message ──
  const mainBlocks = [
    {
      type: "header",
      text: { type: "plain_text", text: ":car: New Orlando Lead", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Name:*\n${name}` },
        { type: "mrkdwn", text: `*Phone:*\n${phone}` },
        { type: "mrkdwn", text: `*Service:*\n${service || "—"}` },
        { type: "mrkdwn", text: `*Source:*\n${source || "Website"}` },
      ],
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Submitted ${now} ET` }],
    },
  ];

  const mainRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel,
      text: `New Orlando Lead: ${name} — ${phone}`,
      blocks: mainBlocks,
    }),
  });

  const mainData = await mainRes.json();
  if (!mainData.ok) {
    console.error("Slack main message failed:", mainData.error);
    return;
  }

  // ── Thread reply with full details ──
  const threadTs = mainData.ts;
  const details: string[] = [];
  if (email) details.push(`*Email:* ${email}`);
  const vehicle = [vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(" ");
  if (vehicle) details.push(`*Vehicle:* ${vehicle}`);
  if (preferredDate) details.push(`*Preferred Date:* ${preferredDate}`);
  if (location) details.push(`*Location:* ${location}`);
  if (message) details.push(`*Message:* ${message}`);

  if (details.length > 0) {
    const threadRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel,
        thread_ts: threadTs,
        text: details.join("\n"),
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: details.join("\n") },
          },
        ],
      }),
    });

    const threadData = await threadRes.json();
    if (!threadData.ok) {
      console.error("Slack thread reply failed:", threadData.error);
    }
  }
}

async function sendJobApplicationSlackNotification(
  token: string,
  channel: string,
  body: Record<string, unknown>,
): Promise<void> {
  const {
    firstName,
    lastName,
    phone,
    email,
    city,
    daysAvailable,
    hoursAvailable,
    startDate,
    detailingExperience,
    attentionToDetail,
    performancePay,
    paidTestDetail,
  } = body as Record<string, string>;

  const name = `${firstName} ${lastName}`.trim();
  const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const detailPreview = detailingExperience
    ? detailingExperience.slice(0, 600)
    : "No experience details provided.";

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: ":clipboard: New Detailer Application", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Name:*\n${name}` },
        { type: "mrkdwn", text: `*Location:*\n${city || "—"}` },
        { type: "mrkdwn", text: `*Phone:*\n${phone}` },
        { type: "mrkdwn", text: `*Email:*\n${email}` },
        { type: "mrkdwn", text: `*Availability:*\n${[daysAvailable, hoursAvailable].filter(Boolean).join(", ") || "—"}` },
        { type: "mrkdwn", text: `*Start Date:*\n${startDate || "—"}` },
        { type: "mrkdwn", text: `*Attention:*\n${attentionToDetail ? `${attentionToDetail}/10` : "—"}` },
        { type: "mrkdwn", text: `*Paid Test Detail:*\n${paidTestDetail || "—"}` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Experience:*\n${detailPreview}` },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `Performance pay: ${performancePay || "—"} | Submitted ${now} ET` },
      ],
    },
  ];

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel,
      text: `New Detailer Application: ${name} — ${phone}`,
      blocks,
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("Slack job application message failed:", data.error);
  }
}

// ── Main Handler ────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  // Read PIT token from environment (set via `supabase secrets set`)
  const GHL_TOKEN = Deno.env.get("GHL_MXDETAIL_PIT");
  if (!GHL_TOKEN) {
    console.error("GHL_MXDETAIL_PIT secret is not set");
    return new Response(
      JSON.stringify({ error: "Server configuration error. Please call us directly." }),
      { status: 500, headers },
    );
  }

  const ghl = ghlHeaders(GHL_TOKEN);

  try {
    const body = await req.json();
    const isJobApplication = body.formType === "job_application";

    const { firstName, lastName, phone, email } = body;
    if (!firstName || !lastName || !phone || !email) {
      return new Response(
        JSON.stringify({ error: "First name, last name, phone, and email are required" }),
        { status: 400, headers },
      );
    }

    if (isJobApplication) {
      const requiredJobFields = [
        "city",
        "daysAvailable",
        "hoursAvailable",
        "startDate",
        "detailingExperience",
        "comfortableOutdoors",
        "weekendAvailability",
        "attentionToDetail",
        "perfectDetailMeaning",
        "everBeenFired",
        "daysMissed",
        "whyHire",
        "currentWeeklyIncome",
        "expectedWeeklyIncome",
        "performancePay",
        "paidTestDetail",
      ];
      const missingField = requiredJobFields.find((field) => !String(body[field] ?? "").trim());
      if (missingField) {
        return new Response(
          JSON.stringify({ error: "Please complete all required application fields." }),
          { status: 400, headers },
        );
      }
    }

    // ── Derive market tag + service_city from location ──
    const locationKey = (body.location || "").toLowerCase().trim();
    const market = MARKET_MAP[locationKey];
    const marketTag = market?.tag;
    const serviceCity = market?.city;

    // Tags: frontend can send additional tags, plus we add the market tag
    const tags: string[] = [...(body.tags || [])];
    if (isJobApplication) {
      for (const tag of ["applicant", "job-application", "website-application"]) {
        if (!tags.includes(tag)) tags.push(tag);
      }
    }
    if (marketTag && !tags.includes(marketTag)) {
      tags.push(marketTag);
    }

    const source = body.source || "Website - Book Now";

    // ── Build custom fields using actual GHL field IDs ──
    const customFields: { id: string; field_value: string }[] = [];
    if (serviceCity) {
      customFields.push({ id: CF_SERVICE_CITY, field_value: serviceCity });
    }
    if (isJobApplication) {
      customFields.push(...buildJobApplicationCustomFields(body));
    }

    // ── Upsert contact ──
    const upsertRes = await fetch(`${GHL_API}/contacts/upsert`, {
      method: "POST",
      headers: ghl,
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        firstName,
        lastName,
        email,
        phone,
        source,
        customFields,
      }),
    });

    const upsertData = await upsertRes.json();

    let contactId: string | null = upsertData?.contact?.id ?? null;

    if (!upsertRes.ok) {
      console.error("GHL upsert error:", JSON.stringify(upsertData));
      // Fallback: try to look up existing contact by email
      contactId = await lookupContactByEmail(email, ghl);
      if (!contactId) {
        return new Response(
          JSON.stringify({ error: "Failed to create contact. Please call us directly." }),
          { status: 502, headers },
        );
      }
    }

    // ── Explicitly add tags (upsert doesn't reliably add to existing) ──
    if (tags.length > 0 && contactId) {
      await addTagsWithRetry(contactId, tags, ghl);
    }

    // ── Add booking/contact notes ──
    const notes: string[] = [];
    if (isJobApplication) {
      notes.push("Application Type: Auto Detailing Job Application");
      if (body.city) notes.push(`City: ${body.city}`);
      if (body.daysAvailable) notes.push(`Days Available: ${body.daysAvailable}`);
      if (body.hoursAvailable) notes.push(`Hours Available: ${body.hoursAvailable}`);
      if (body.startDate) notes.push(`Start Date: ${body.startDate}`);
      if (body.detailingExperience) notes.push(`Detailing Experience: ${body.detailingExperience}`);
      if (body.toolsUsed) notes.push(`Tools / Machines Used: ${body.toolsUsed}`);
      if (body.comfortableOutdoors) notes.push(`Comfortable Working Outdoors: ${body.comfortableOutdoors}`);
      if (body.weekendAvailability) notes.push(`Weekend Availability: ${body.weekendAvailability}`);
      if (body.attentionToDetail) notes.push(`Attention to Detail: ${body.attentionToDetail}/10`);
      if (body.perfectDetailMeaning) notes.push(`Perfect Detail Meaning: ${body.perfectDetailMeaning}`);
      if (body.everBeenFired) notes.push(`Ever Been Fired: ${body.everBeenFired}`);
      if (body.daysMissed) notes.push(`Days Missed Past Year: ${body.daysMissed}`);
      if (body.whyHire) notes.push(`Why Hire: ${body.whyHire}`);
      if (body.currentWeeklyIncome) notes.push(`Current Weekly Income: ${body.currentWeeklyIncome}`);
      if (body.expectedWeeklyIncome) notes.push(`Expected Weekly Income: ${body.expectedWeeklyIncome}`);
      if (body.performancePay) notes.push(`Open to Performance Pay: ${body.performancePay}`);
      if (body.paidTestDetail) notes.push(`Willing to Complete Paid Test Detail: ${body.paidTestDetail}`);
    } else {
      if (body.service) notes.push(`Service: ${body.service}`);
      if (body.vehicleYear || body.vehicleMake || body.vehicleModel) {
        notes.push(
          `Vehicle: ${[body.vehicleYear, body.vehicleMake, body.vehicleModel].filter(Boolean).join(" ")}`,
        );
      }
      if (body.location) notes.push(`Preferred Location: ${body.location}`);
      if (body.preferredDate) notes.push(`Preferred Date: ${body.preferredDate}`);
      if (body.message) notes.push(`Message: ${body.message}`);
    }

    if (notes.length > 0 && contactId) {
      const noteBody = `--- ${source} ---\n${notes.join("\n")}\nSubmitted by: ${firstName} ${lastName} | ${email} | ${phone}\n--- ${new Date().toISOString()} ---`;
      const noteRes = await fetch(`${GHL_API}/contacts/${contactId}/notes`, {
        method: "POST",
        headers: ghl,
        body: JSON.stringify({ body: noteBody }),
      });

      if (isJobApplication && !noteRes.ok) {
        const noteData = await noteRes.text();
        console.error(`Job application note create failed: ${noteRes.status} ${noteData}`);
        return new Response(
          JSON.stringify({ error: "Application contact was created, but the application details note failed. Please call us directly." }),
          { status: 502, headers },
        );
      }
    }

    if (isJobApplication && contactId) {
      await createJobApplicationOpportunity(contactId, body, ghl);
    }

    // ── Slack notification for job applications (fire-and-forget) ──
    if (isJobApplication) {
      const slackToken = Deno.env.get("SLACK_MXDETAIL_BOT");
      const applicationSlackChannel = Deno.env.get("SLACK_MXDETAIL_JOB_APPLICATION_CHANNEL");
      if (slackToken && applicationSlackChannel) {
        sendJobApplicationSlackNotification(slackToken, slackChannelRef(applicationSlackChannel), body).catch((err) =>
          console.error("Slack job application notification error:", err),
        );
      } else if (!applicationSlackChannel) {
        console.error("SLACK_MXDETAIL_JOB_APPLICATION_CHANNEL secret is not set");
      }
    }

    // ── Slack notification for Orlando leads (fire-and-forget) ──
    if (!isJobApplication && locationKey === "orlando") {
      const slackToken = Deno.env.get("SLACK_MXDETAIL_BOT");
      if (slackToken) {
        sendSlackNotification(slackToken, SLACK_LEADS_CHANNEL, { ...body, source }).catch((err) =>
          console.error("Slack notification error:", err),
        );
      }
    }

    // ── SMS notification for market owner (fire-and-forget) ──
    if (!isJobApplication) {
      sendLeadSmsNotification(locationKey, { ...body, source }, source).catch((err) =>
        console.error("SMS notification error:", err),
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Submitted successfully!" }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again or call us directly." }),
      { status: 500, headers },
    );
  }
});
