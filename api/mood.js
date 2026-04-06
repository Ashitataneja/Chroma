export default async function handler(req, res) {
  try {
    const { hex, h, s, l } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `Return ONLY JSON:
{
"description": "short poetic description",
"keywords": ["word1","word2","word3","word4","word5"]
}

Color: ${hex}, HSL(${h},${s}%,${l}%)`
          }
        ]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    try {
      res.status(200).json(JSON.parse(text));
    } catch {
      res.status(200).json({
        description: text,
        keywords: ["color", "mood", "tone", "design", "visual"]
      });
    }

  } catch {
    res.status(500).json({
      description: "Error generating mood",
      keywords: ["error", "retry", "issue", "ai", "debug"]
    });
  }
}
