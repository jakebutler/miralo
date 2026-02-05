import { randomUUID } from "node:crypto";
import { DirectionOption, InterviewScript, ScriptLine } from "./types";

function line(
  speaker: "Interviewer" | "Interviewee",
  beat: "explore" | "summary" | "confirmation",
  text: string,
  directionId?: string,
  expectedValidation?: boolean
): ScriptLine {
  return {
    id: randomUUID(),
    speaker,
    beat,
    text,
    directionId,
    expectedValidation,
  };
}

export function generateInterviewScript(params: {
  analysisId: string;
  selectedDirections: DirectionOption[];
}): InterviewScript {
  const selected = params.selectedDirections;

  const lines: ScriptLine[] = [];

  lines.push(
    line(
      "Interviewer",
      "explore",
      "Thanks for walking through this product. I want to understand where the current experience feels slow, unclear, or frustrating."
    )
  );

  selected.forEach((direction, index) => {
    lines.push(
      line(
        "Interviewer",
        "explore",
        `Let's focus on ${direction.title}. ${direction.interviewFocus}`,
        direction.id
      )
    );

    lines.push(
      line(
        "Interviewee",
        "explore",
        `This area slows me down today. I want a clearer, faster experience around ${direction.title}.`,
        direction.id
      )
    );

    lines.push(
      line(
        "Interviewer",
        "summary",
        `Can I summarize that we should improve ${direction.title} with a clearer UI flow?`,
        direction.id
      )
    );

    lines.push(
      line(
        "Interviewee",
        "confirmation",
        "Yes, that summary is right.",
        direction.id,
        true
      )
    );

    if (index < selected.length - 1) {
      lines.push(
        line(
          "Interviewer",
          "explore",
          "Great. Let's capture one more priority before we move into implementation.",
          direction.id
        )
      );
    }
  });

  lines.push(
    line(
      "Interviewer",
      "summary",
      "Thanks. I have enough to draft UI-only changes and show before/after now."
    )
  );

  return {
    id: randomUUID(),
    analysisId: params.analysisId,
    generatedAt: new Date().toISOString(),
    title: "Miralo Interview Script",
    selectedDirectionIds: selected.map((item) => item.id),
    lines,
  };
}
