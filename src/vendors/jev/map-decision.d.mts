export function mapJevChoiceAnswer(
  answer: {
    choice?: string;
    /** TypeSafe confidence statistic — ignored; we use probabilities[choice]. */
    confidence?: number;
    probabilities?: Record<string, number>;
  },
  responseOptions: string[],
): { next: string; confidence: number };

export const JEV_UPSTREAM_MODEL_MAP: Record<string, string>;

export function resolveUpstreamJevModel(catalogModel: string): string;
