export type GuidanceMode = "user-provided" | "needs-help";

export interface IntakeState {
  repoPath: string;
  guidanceMode: GuidanceMode;
  hasHypotheses: boolean;
  hasScript: boolean;
  hypothesesNotes?: string;
  scriptNotes?: string;
}

export interface DirectionOption {
  id: string;
  title: string;
  reason: string;
  interviewFocus: string;
  confidence: number;
}

export interface RepoAnalysis {
  id: string;
  repoPath: string;
  generatedAt: string;
  summary: string;
  capabilities: string[];
  directions: DirectionOption[];
}

export type ScriptSpeaker = "Interviewer" | "Interviewee";
export type ScriptBeat = "explore" | "summary" | "confirmation";
export type TranscriptSpeaker = ScriptSpeaker | "Unknown";

export interface ScriptLine {
  id: string;
  speaker: ScriptSpeaker;
  beat: ScriptBeat;
  text: string;
  directionId?: string;
  expectedValidation?: boolean;
}

export interface InterviewScript {
  id: string;
  analysisId: string;
  generatedAt: string;
  title: string;
  selectedDirectionIds: string[];
  lines: ScriptLine[];
}

export interface TranscriptSegment {
  id: string;
  speaker: TranscriptSpeaker;
  t0: number;
  t1: number;
  text: string;
  textPartial?: string;
  textFinal?: string;
  source?: "simulated" | "realtime" | "replay";
  isSummaryCandidate?: boolean;
  isAffirmation?: boolean;
  validated?: boolean;
}

export interface ValidatedFeedback {
  chunkId: string;
  text: string;
  confidence: "high" | "medium" | "low";
  summaryChunkId?: string;
  affirmationChunkId?: string;
  supportingChunkIds?: string[];
}

export type WorktreeStatus = "selected" | "queued" | "speculative";

export interface WorktreeCandidate {
  name: string;
  status: WorktreeStatus;
  rationale: string;
  directionId?: string;
}

export interface IterationPlan {
  id: string;
  createdAt: string;
  summary: string;
  uiChanges: string[];
  skipped: string[];
  historianPath: string;
}

export interface MiraloSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  intake: IntakeState;
  analysis?: RepoAnalysis;
  script?: InterviewScript;
  transcript: TranscriptSegment[];
  validatedFeedback: ValidatedFeedback[];
  worktrees: WorktreeCandidate[];
  decisionLog: string[];
  iteration?: IterationPlan;
}

export interface AnalyzeRepoInput {
  repoPath: string;
  guidanceMode: GuidanceMode;
  hasHypotheses: boolean;
  hasScript: boolean;
  hypothesesNotes?: string;
  scriptNotes?: string;
  sessionId?: string;
}

export interface GenerateScriptInput {
  sessionId: string;
  selectedDirectionIds: string[];
}

export interface RunSessionInput {
  sessionId: string;
}

export interface CreateIterationInput {
  sessionId: string;
}

export interface TranscriptFinalizeInput {
  sessionId: string;
  chunkId: string;
  speaker: TranscriptSpeaker;
  startMs: number;
  endMs: number;
  textPartial?: string;
  textFinal: string;
  confidence?: "high" | "medium" | "low";
  source?: "realtime" | "replay";
}

export interface ValidatedDirectionCreatedEvent {
  id: string;
  summaryChunkId: string;
  affirmationChunkId: string;
  validatedText: string;
  supportingChunkIds: string[];
  timestamp: string;
  confidence: "high" | "medium" | "low";
}
