import { NextRequest, NextResponse } from 'next/server';
import { submitTeamEvaluation } from '@/lib/services/evaluations.service';
import { submitEvaluationSchema } from '@/lib/validators';
import { ZodError } from 'zod';
import { readPeerJson, PeerError } from '@/lib/peer/http';
import { consumeRateLimit, rateLimitHeaders, RateLimitExceededError, sensitiveActionRateLimitPolicy } from '@/lib/security/rate-limit';
import { logError, requestIdFrom } from '@/lib/observability/logger';
import { verifyParticipationToken, ParticipationTokenError } from '@/lib/participation-security';

export async function POST(req: NextRequest) {
  const responseOptions = (status: number) => ({ status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  try {
    const body = await readPeerJson(req, 16384);

    // Validate input using Zod
    const data = submitEvaluationSchema.parse(body);
    const identity = verifyParticipationToken(data.participationToken, 'LEADERSHIP');
    await consumeRateLimit('leadership-submission:participant', identity.participantId, sensitiveActionRateLimitPolicy());

    // Verify it's a team evaluation
    if (data.evaluationType !== 'TEAM') {
      return NextResponse.json(
        { success: false, error: 'Tipo de avaliação inválido para esta rota' },
        responseOptions(400)
      );
    }

    // Submit evaluation
    const result = await submitTeamEvaluation(data);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        responseOptions(result.status || 400)
      );
    }

    return NextResponse.json({ success: true }, responseOptions(201));
  } catch (error) {
    if (error instanceof ParticipationTokenError) return NextResponse.json({ success: false, error: error.message }, responseOptions(401));
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 429, headers: rateLimitHeaders(error) });
    }
    if (error instanceof PeerError) return NextResponse.json({ success: false, error: error.message }, responseOptions(error.status));

    if (error instanceof ZodError) {
      const errorMessages = error.errors.map((e) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: `Dados inválidos: ${errorMessages}` },
        responseOptions(400)
      );
    }

    logError('leadership_evaluation_submission_failed', error, { requestId: requestIdFrom(req.headers) });

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      responseOptions(500)
    );
  }
}
