import type { GoForceVoteChoice } from "@/features/go-force/types";
import { cn } from "@/components/ui/cn";

const choicePresentation: Record<GoForceVoteChoice, { label: string; className: string }> = {
  go: {
    label: "Go",
    className: "border-success-line bg-success-bg text-success-ink",
  },
  "no-go": {
    label: "No-go",
    className: "border-red bg-danger-bg text-danger-ink",
  },
  abstain: {
    label: "Abstain",
    className: "border-line bg-paper text-muted",
  },
};

export function VoteChoiceLabel({
  choice,
  className,
}: {
  choice: GoForceVoteChoice;
  className?: string;
}) {
  const presentation = choicePresentation[choice];
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-[.85rem] font-bold",
        presentation.className,
        className,
      )}
      data-vote-choice={choice}
    >
      {presentation.label}
    </span>
  );
}
