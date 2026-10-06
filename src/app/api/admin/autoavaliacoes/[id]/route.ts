import { NextResponse } from 'next/server';

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'A autoavaliação foi encerrada. Os links antigos não aceitam novas respostas.' },
    { status: 410 }
  );
}

