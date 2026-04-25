export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

const EXTRACT_SYSTEM = `You are a payroll data extraction specialist for a payroll service bureau using iSolved.
Extract ALL employee payroll data from the provided content.

Return ONLY a valid JSON array of employee records with these exact fields:
employee_id, employee_name, pay_period_start, pay_period_end,
regular_hours, overtime_hours, double_time_hours, holiday_hours,
pto_hours, sick_hours, regular_rate, notes

Rules:
- Extract every employee you can find
- Mark unclear values as REVIEW
- Leave fields blank if not present
- Return ONLY the JSON array, no markdown, no other text`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in Vercel Environment Variables" });
  }

  try {
    const { type, payload } = req.body;
    let body;

    if (type === "image") {
      body = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: EXTRACT_SYSTEM,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: payload.mediaType, data: payload.imageData } },
            { type: "text", text: "Extract all payroll data from this image." }
          ]
        }]
      };
    } else if (type === "email_text") {
      body = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: EXTRACT_SYSTEM,
        messages: [{
          role: "user",
          content: `Extract payroll data from this email:\n\nFrom: ${payload.from}\nDate: ${payload.date}\nSubject: ${payload.subject}\n\n${payload.body}`
        }]
      };
    } else {
      return res.status(400).json({ error: "Invalid type" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Claude API error" });
    }

    const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(clean);
      return res.status(200).json({ result: parsed });
    } catch {
      return res.status(500).json({ error: "Could not parse response", raw: clean.slice(0, 300) });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
