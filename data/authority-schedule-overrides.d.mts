export type PublicationSlotSwap = {
  delayedId: string;
  replacementId: string;
  decidedAt: string;
  replacementWasHeld: true;
  reason: string;
};

export const publicationSlotSwaps: PublicationSlotSwap[];
