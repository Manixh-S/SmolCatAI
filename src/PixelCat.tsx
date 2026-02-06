import "./PixelCat.css";

type PixelCatProps = {
  mood: "happy" | "sad" | "sleeping";
};

const PixelCat = ({ mood }: PixelCatProps) => {
  const pixel = 4;
  const catColor = "#f7c17d";
  const earColor = "#e09f58";
  const ink = "#2b1f1a";
  const blush = "#e37b7b";

  const eyeY = 12;

  const rect = (x: number, y: number, color: string) => (
    <rect key={`${x}-${y}-${color}`} x={x} y={y} width={pixel} height={pixel} fill={color} />
  );

  const openEyes = [
    rect(8, eyeY, ink),
    rect(12, eyeY, ink),
    rect(24, eyeY, ink),
    rect(28, eyeY, ink),
  ];

  const sleepingEyes = [
    rect(6, eyeY, ink),
    rect(10, eyeY, ink),
    rect(14, eyeY, ink),
    rect(22, eyeY, ink),
    rect(26, eyeY, ink),
    rect(30, eyeY, ink),
  ];

  const sadEyes = [
    rect(8, eyeY + 2, ink),
    rect(12, eyeY, ink),
    rect(24, eyeY, ink),
    rect(28, eyeY + 2, ink),
  ];

  const eyes = mood === "sleeping" ? sleepingEyes : mood === "sad" ? sadEyes : openEyes;

  return (
    <svg
      width={64}
      height={64}
      viewBox="0 0 40 40"
      role="img"
      aria-label={`Pixel cat face, ${mood}`}
      shapeRendering="crispEdges"
      className="pixel-cat"
    >
      {[
        rect(8, 4, earColor),
        rect(12, 4, earColor),
        rect(24, 4, earColor),
        rect(28, 4, earColor),
        rect(4, 8, catColor),
        rect(8, 8, catColor),
        rect(12, 8, catColor),
        rect(16, 8, catColor),
        rect(20, 8, catColor),
        rect(24, 8, catColor),
        rect(28, 8, catColor),
        rect(32, 8, catColor),
        rect(4, 12, catColor),
        rect(8, 12, catColor),
        rect(12, 12, catColor),
        rect(16, 12, catColor),
        rect(20, 12, catColor),
        rect(24, 12, catColor),
        rect(28, 12, catColor),
        rect(32, 12, catColor),
        rect(4, 16, catColor),
        rect(8, 16, catColor),
        rect(12, 16, catColor),
        rect(16, 16, catColor),
        rect(20, 16, catColor),
        rect(24, 16, catColor),
        rect(28, 16, catColor),
        rect(32, 16, catColor),
        rect(4, 20, catColor),
        rect(8, 20, catColor),
        rect(12, 20, catColor),
        rect(16, 20, catColor),
        rect(20, 20, catColor),
        rect(24, 20, catColor),
        rect(28, 20, catColor),
        rect(32, 20, catColor),
        rect(8, 24, catColor),
        rect(12, 24, catColor),
        rect(16, 24, catColor),
        rect(20, 24, catColor),
        rect(24, 24, catColor),
        rect(28, 24, catColor),
        rect(12, 28, catColor),
        rect(16, 28, catColor),
        rect(20, 28, catColor),
        rect(24, 28, catColor),
        rect(14, 22, blush),
        rect(26, 22, blush),
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
