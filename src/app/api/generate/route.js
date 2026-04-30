export async function POST(request) {
  console.log("API route hit!");
  try {
    const body = await request.json();
    const prompt = body.messages[0].content;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.log("Groq error:", error);
      return Response.json(
        { error: `Groq API error: ${response.status}`, details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "{}";

    return Response.json({
      content: [{ type: "text", text }],
    });
  } catch (err) {
    console.log("Catch error:", err.message);
    return Response.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}