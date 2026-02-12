import "./PixelCat.css";

type PixelCatProps = {
  mood: "happy" | "sad" | "sleeping";
  skin: number;
};

const PixelCat = ({ mood, skin }: PixelCatProps) => {
  const pixel = 4;
  const palettes = [
    {
      catColor: "#8a8a8a",
      earColor: "#f2a8b3",
      ink: "#1f1f1f",
      eyeColor: "#f5f5f5",
      blush: "transparent",
    },
    {
      catColor: "#d89b6f",
      earColor: "#f6d4a6",
      ink: "#3b2718",
      eyeColor: "#fff1dc",
      blush: "#e07b8c",
    },
    {
      catColor: "#5a6c8e",
      earColor: "#cdd6f6",
      ink: "#1b2233",
      eyeColor: "#e4ebff",
      blush: "#7a8fba",
    },
  ];

  const palette = palettes[Math.abs(skin) % palettes.length];
  const { catColor, earColor, ink, eyeColor, blush } = palette;

  const eyeY = 16;

  const rect = (x: number, y: number, color: string) => (
    <rect key={`${x}-${y}-${color}`} x={x} y={y} width={pixel} height={pixel} fill={color} />
  );

  const openEyes = [
    rect(12, eyeY, eyeColor),
    rect(16, eyeY, eyeColor),
    rect(20, eyeY, eyeColor),
    rect(24, eyeY, eyeColor),
  ];

  const sleepingEyes = [
    rect(10, eyeY, ink),
    rect(14, eyeY, ink),
    rect(18, eyeY, ink),
    rect(20, eyeY, ink),
    rect(24, eyeY, ink),
    rect(28, eyeY, ink),
  ];

  const sadEyes = [
    rect(12, eyeY + 2, eyeColor),
    rect(16, eyeY, eyeColor),
    rect(20, eyeY, eyeColor),
    rect(24, eyeY + 2, eyeColor),
  ];

  const eyes = mood === "sleeping" ? sleepingEyes : mood === "sad" ? sadEyes : openEyes;

  return (
    <svg
      width={300}
      height={200}
      viewBox="0 0 80 48"
      role="img"
      aria-label={`Pixel cat, ${mood}`}
      shapeRendering="crispEdges"
      className="pixel-cat"
    >
      {[
        rect(8, 4, earColor),
        rect(12, 4, earColor),
        rect(20, 4, earColor),
        rect(24, 4, earColor),
        rect(8, 8, catColor),
        rect(12, 8, catColor),
        rect(16, 8, catColor),
        rect(20, 8, catColor),
        rect(24, 8, catColor),
        rect(28, 8, catColor),
        rect(8, 12, catColor),
        rect(12, 12, catColor),
        rect(16, 12, catColor),
        rect(20, 12, catColor),
        rect(24, 12, catColor),
        rect(28, 12, catColor),
        rect(8, 16, catColor),
        rect(12, 16, catColor),
        rect(16, 16, catColor),
        rect(20, 16, catColor),
        rect(24, 16, catColor),
        rect(28, 16, catColor),
        rect(8, 20, catColor),
        rect(12, 20, catColor),
        rect(16, 20, catColor),
        rect(20, 20, catColor),
        rect(24, 20, catColor),
        rect(28, 20, catColor),
        rect(32, 12, catColor),
        rect(36, 12, catColor),
        rect(40, 12, catColor),
        rect(44, 12, catColor),
        rect(48, 12, catColor),
        rect(52, 12, catColor),
        rect(56, 12, catColor),
        rect(32, 16, catColor),
        rect(36, 16, catColor),
        rect(40, 16, catColor),
        rect(44, 16, catColor),
        rect(48, 16, catColor),
        rect(52, 16, catColor),
        rect(56, 16, catColor),
        rect(32, 20, catColor),
        rect(36, 20, catColor),
        rect(40, 20, catColor),
        rect(44, 20, catColor),
        rect(48, 20, catColor),
        rect(52, 20, catColor),
        rect(56, 20, catColor),
        rect(28, 24, catColor),
        rect(32, 24, catColor),
        rect(36, 24, catColor),
        rect(40, 24, catColor),
        rect(44, 24, catColor),
        rect(48, 24, catColor),
        rect(52, 24, catColor),
        rect(56, 24, catColor),
        rect(32, 28, catColor),
        rect(40, 28, catColor),
        rect(48, 28, catColor),
        rect(56, 28, catColor),
        rect(32, 32, catColor),
        rect(40, 32, catColor),
        rect(48, 32, catColor),
        rect(56, 32, catColor),
        rect(60, 16, catColor),
        rect(64, 16, catColor),
        rect(68, 16, catColor),
        rect(68, 12, catColor),
        rect(72, 12, catColor),
        rect(72, 8, catColor),
        rect(10, 20, blush),
        rect(24, 20, blush),
        rect(18, 20, ink),
        rect(20, 20, ink),
        rect(16, 22, ink),
        rect(22, 22, ink),
      ]}
      {eyes}
    </svg>
  );
};

export default PixelCat;
