// src/app/api/run/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { task_description } = await request.json();

        if (!task_description || typeof task_description !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid task_description' }, { status: 400 });
        }

        // Get the backend URL from environment variable
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

        // Forward to the Flask backend
        const response = await fetch(`${backendUrl}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_description }),
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('API route error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: (error as Error).message },
            { status: 500 }
        );
    }
}