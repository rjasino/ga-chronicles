export type MockWheelEntry = { id: string; text: string };

export type MockWheelConfig = {
  entries: MockWheelEntry[];
  autoRemoveWinner?: boolean;
};

export const MOCK_WHEEL_ANIMATION =
  "R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

export function createWheelOfNamesResponse(wheelConfig: MockWheelConfig) {
  const winner = wheelConfig.entries[0];
  if (!winner) throw new Error("The mock wheel needs at least one entry.");

  return {
    animation: MOCK_WHEEL_ANIMATION,
    winner: { id: winner.id, text: winner.text },
  };
}
