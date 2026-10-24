export const validateNickname = (nickname: string) => {
  const normalized = nickname.trim();
  if (!normalized) return 'Pick a nickname to enter the arena.';
  if (normalized.length > 18) return 'Keep your nickname under 18 characters.';
  if (!/^[\p{L}\p{N} _-]+$/u.test(normalized)) return 'Use letters, numbers, spaces, dashes, or underscores only.';
  return null;
};

export const formatScore = (score: number) => score.toLocaleString('en-US');
