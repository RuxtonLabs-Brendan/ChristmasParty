// Trigonometric functions for circular positioning

export function getCircularPosition(index, total, radius, centerX = 500, centerY = 500) {
  const angle = (2 * Math.PI * index) / total;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
    angle: angle * (180 / Math.PI) // Convert to degrees
  };
}

export function getRingPosition(index, total, radius, centerX = 500, centerY = 500) {
  const angle = (2 * Math.PI * index) / total;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
    rotation: angle * (180 / Math.PI) + 90 // Face outward
  };
}

