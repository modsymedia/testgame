export const capStat = (value: number): number => {
  return Math.min(Math.max(value, 0), 100);
};

export const getHealthStatus = (health: number): string => {
  if (health > 80) return "Excellent";
  if (health > 60) return "Good";
  if (health > 40) return "Fair";
  if (health > 20) return "Poor";
  return "Critical";
}; 