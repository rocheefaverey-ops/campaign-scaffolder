export const truncate = (string: string, limit: number): string => {
  if (string.length > limit) {
    return `${string.substring(0, limit)}...`;
  }

  return string;
};
