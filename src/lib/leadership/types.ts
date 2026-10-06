import type { PeerCriterion } from '@/lib/peer/types';

export type LeadershipCandidate = {
  id: string;
  name: string;
  position: string;
  departmentId: string;
  departmentName: string;
  completed: boolean;
};

export type PublicLeadershipContext = {
  availableParticipants: number;
  period: { id: string; name: string } | null;
  criteria: PeerCriterion[];
  commentsEnabled: boolean;
};

export type LeadershipAccessContext = {
  participationToken: string;
  participantName: string;
  departmentName: string;
  leaders: LeadershipCandidate[];
  period: { id: string; name: string };
  criteria: PeerCriterion[];
  commentsEnabled: boolean;
};
