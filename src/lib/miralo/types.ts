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
  filesScanned: number;
  elapsedMs: number;
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
  iterationPromptPath?: string;
}

export type IterationBuildStage =
  | "queued"
  | "specifying"
  | "prompting"
  | "coding"
  | "guardrails"
  | "validating"
  | "launching"
  | "ready"
  | "failed"
  | "canceled";

export interface SessionSpecs {
  generatedAt?: string;
  productSpecPath?: string;
  techSpecPath?: string;
  warnings?: string[];
}

export interface IterationBuildJob {
  id: string;
  sessionId: string;
  iterationNumber: number;
  stage: IterationBuildStage;
  statusMessage: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  workerPid?: number;
  worktreePath?: string;
  branchName?: string;
  logPath?: string;
  promptPath?: string;
  specProductPath?: string;
  specTechPath?: string;
  specIterationPath?: string;
  agentOutputPath?: string;
  launchUrl?: string;
  validatorReadyToShow: boolean;
  validatorVideoPath?: string;
  validatorScreenshotPath?: string;
  diffFilesChanged?: number;
  diffInsertions?: number;
  diffDeletions?: number;
  warningCodes?: string[];
  errorCode?: string;
  errorMessage?: string;
}

export interface BuiltIterationArtifact {
  id: string;
  sessionId: string;
  iterationNumber: number;
  createdAt: string;
  worktreePath: string;
  branchName: string;
  launchUrl: string;
  promptPath: string;
  historianPath: string;
  validator: {
    readyToShow: boolean;
    videoPath?: string;
    screenshotPath?: string;
  };
  diffSummary: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
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
  specs?: SessionSpecs;
  buildJobs: IterationBuildJob[];
  activeBuildJobId?: string;
  iterations: BuiltIterationArtifact[];
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
