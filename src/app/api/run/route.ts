import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { task_description } = await request.json();

    // Forward to Flask backend
    const flaskResponse = await fetch(`${process.env.BACKEND_URL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_description }),
    });

    if (!flaskResponse.ok) {
      throw new Error(`Backend error: ${flaskResponse.statusText}`);
    }

    const data = await flaskResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
