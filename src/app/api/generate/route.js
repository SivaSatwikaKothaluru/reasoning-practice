export async function POST(request) {
  try {
    const body = await request.json();
    const prompt = body.messages[0].content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return Response.json(
        { error: `Gemini API error: ${response.status}`, details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    return Response.json({
      content: [{ type: "text", text }],
    });
  } catch (err) {
    return Response.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}