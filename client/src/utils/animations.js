// Animation utilities

export function createConfetti(x, y, count = 20) {
  const confetti = [];
  for (let i = 0; i < count; i++) {
    confetti.push({
      id: `confetti-${i}`,
      x: x + (Math.random() - 0.5) * 100,
      y: y + (Math.random() - 0.5) * 100,
      angle: Math.random() * 360,
      delay: Math.random() * 0.5,
      color: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'][Math.floor(Math.random() * 5)]
    });
  }
  return confetti;
}

export function getStealArcPath(startX, startY, endX, endY) {
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 - 100; // Arc height
  return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
}

