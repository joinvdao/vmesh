import type { GlobeTheme } from "@/lib/vmeshTypes";

export type CanvasPoint = [number, number];

export const EARTH_TEXTURE_WIDTH = 2048;
export const EARTH_TEXTURE_HEIGHT = 1024;

export function lonToX(longitude: number, width = EARTH_TEXTURE_WIDTH): number {
  return ((longitude + 180) / 360) * width;
}

export function latToY(latitude: number, height = EARTH_TEXTURE_HEIGHT): number {
  return ((90 - latitude) / 180) * height;
}

function toCanvasPoint([longitude, latitude]: CanvasPoint): CanvasPoint {
  return [lonToX(longitude), latToY(latitude)];
}

function drawPolygon(
  context: CanvasRenderingContext2D,
  coordinates: CanvasPoint[],
  fillStyle: string,
  strokeStyle?: string
) {
  if (coordinates.length === 0) return;

  const [startX, startY] = toCanvasPoint(coordinates[0]);
  context.beginPath();
  context.moveTo(startX, startY);
  for (const point of coordinates.slice(1)) {
    const [x, y] = toCanvasPoint(point);
    context.lineTo(x, y);
  }
  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();
  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
    context.lineWidth = 1.4;
    context.stroke();
  }
}

function drawLandPolygon(
  context: CanvasRenderingContext2D,
  points: CanvasPoint[],
  fill: string,
  coastStroke: string
) {
  drawPolygon(context, points, fill, coastStroke);
}

export function drawSoftBlob(
  context: CanvasRenderingContext2D,
  longitude: number,
  latitude: number,
  radius: number,
  color: string,
  opacity: number
) {
  const x = lonToX(longitude);
  const y = latToY(latitude);
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.save();
  context.globalAlpha = opacity;
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  context.restore();
}

export function drawLandMasses(context: CanvasRenderingContext2D, theme: GlobeTheme) {
  const landFill = theme === "dark" ? "#5f8f63" : "#78a96f";
  const forestFill = theme === "dark" ? "#40794f" : "#4f935d";
  const desertFill = theme === "dark" ? "#b59d63" : "#d9c887";
  const highlandFill = theme === "dark" ? "#9a8f68" : "#b9b17f";
  const iceFill = theme === "dark" ? "#dfeaf0" : "#f6fbfd";
  const coastStroke = theme === "dark" ? "rgba(224,247,238,0.32)" : "rgba(39,99,108,0.26)";

  const continents: Array<{ points: CanvasPoint[]; fill: string }> = [
    {
      fill: landFill,
      points: [
        [-168, 71],
        [-150, 60],
        [-136, 58],
        [-130, 51],
        [-124, 49],
        [-118, 34],
        [-112, 30],
        [-106, 23],
        [-96, 19],
        [-88, 16],
        [-83, 9],
        [-76, 8],
        [-68, 18],
        [-60, 43],
        [-52, 48],
        [-62, 56],
        [-78, 58],
        [-92, 69],
        [-116, 72],
        [-138, 70],
        [-154, 73]
      ]
    },
    {
      fill: landFill,
      points: [
        [-81, 12],
        [-72, 11],
        [-62, 8],
        [-50, -2],
        [-42, -15],
        [-39, -24],
        [-48, -34],
        [-53, -43],
        [-67, -55],
        [-74, -50],
        [-76, -35],
        [-80, -22],
        [-77, -8],
        [-82, 4]
      ]
    },
    {
      fill: iceFill,
      points: [
        [-73, 82],
        [-42, 83],
        [-22, 79],
        [-16, 71],
        [-35, 62],
        [-53, 60],
        [-67, 66]
      ]
    },
    {
      fill: landFill,
      points: [
        [-17, 35],
        [-5, 36],
        [8, 32],
        [16, 31],
        [32, 31],
        [43, 12],
        [50, 4],
        [42, -12],
        [35, -22],
        [32, -34],
        [19, -35],
        [12, -29],
        [3, -17],
        [-8, 4],
        [-14, 18]
      ]
    },
    {
      fill: landFill,
      points: [
        [-10, 71],
        [10, 70],
        [30, 64],
        [48, 56],
        [64, 57],
        [82, 55],
        [100, 50],
        [122, 50],
        [144, 45],
        [160, 54],
        [174, 62],
        [180, 65],
        [180, 26],
        [150, 20],
        [128, 34],
        [117, 23],
        [107, 17],
        [94, 8],
        [78, 7],
        [66, 21],
        [51, 23],
        [44, 30],
        [35, 31],
        [26, 39],
        [16, 43],
        [6, 44],
        [-4, 36],
        [-10, 45],
        [-24, 58]
      ]
    },
    {
      fill: desertFill,
      points: [
        [37, 30],
        [57, 29],
        [72, 18],
        [64, 5],
        [49, 10],
        [37, 20]
      ]
    },
    {
      fill: forestFill,
      points: [
        [-76, 5],
        [-64, 3],
        [-52, -4],
        [-46, -12],
        [-52, -20],
        [-62, -16],
        [-70, -8]
      ]
    },
    {
      fill: desertFill,
      points: [
        [-14, 27],
        [10, 30],
        [31, 25],
        [34, 15],
        [22, 12],
        [4, 16],
        [-10, 20]
      ]
    },
    {
      fill: highlandFill,
      points: [
        [66, 36],
        [86, 35],
        [98, 31],
        [92, 25],
        [74, 27]
      ]
    },
    {
      fill: desertFill,
      points: [
        [113, -12],
        [152, -18],
        [154, -36],
        [132, -44],
        [113, -32]
      ]
    },
    {
      fill: iceFill,
      points: [
        [-180, -70],
        [-120, -66],
        [-40, -72],
        [38, -66],
        [120, -70],
        [180, -66],
        [180, -90],
        [-180, -90]
      ]
    }
  ];

  for (const continent of continents) {
    drawLandPolygon(context, continent.points, continent.fill, coastStroke);
  }

  const islands: Array<{ points: CanvasPoint[]; fill?: string }> = [
    {
      points: [
        [-11, 59],
        [-5, 57],
        [-2, 52],
        [-5, 50],
        [-9, 53]
      ]
    },
    {
      points: [
        [-8, 55],
        [-5, 54],
        [-6, 51],
        [-9, 52]
      ]
    },
    {
      points: [
        [138, 45],
        [143, 41],
        [141, 35],
        [136, 32],
        [131, 34],
        [134, 39]
      ]
    },
    {
      points: [
        [120, 24],
        [122, 20],
        [121, 14],
        [119, 8],
        [116, 12],
        [118, 19]
      ]
    },
    {
      points: [
        [96, 5],
        [105, 4],
        [109, -4],
        [102, -7],
        [96, -2]
      ]
    },
    {
      points: [
        [110, -2],
        [122, -4],
        [132, -7],
        [128, -13],
        [114, -9]
      ]
    },
    {
      points: [
        [142, -2],
        [151, -5],
        [154, -9],
        [147, -11],
        [139, -7]
      ]
    },
    {
      points: [
        [166, -34],
        [179, -39],
        [174, -45],
        [164, -45],
        [158, -40]
      ]
    },
    {
      points: [
        [43, -12],
        [50, -16],
        [49, -24],
        [43, -25],
        [40, -18]
      ]
    }
  ];
  for (const island of islands) {
    drawLandPolygon(context, island.points, island.fill ?? landFill, coastStroke);
  }

  context.save();
  context.globalAlpha = theme === "dark" ? 0.42 : 0.32;
  context.strokeStyle = theme === "dark" ? "#e5dfbd" : "#7f8d5a";
  context.lineWidth = 1.8;
  const ridgeLines: CanvasPoint[][] = [
    [
      [-145, 62],
      [-124, 45],
      [-111, 34],
      [-103, 22]
    ],
    [
      [-76, 7],
      [-72, -16],
      [-70, -31],
      [-72, -48]
    ],
    [
      [8, 35],
      [20, 17],
      [28, -5],
      [24, -28]
    ],
    [
      [68, 35],
      [82, 31],
      [96, 30]
    ],
    [
      [112, -18],
      [132, -25],
      [146, -36]
    ]
  ];

  for (const ridge of ridgeLines) {
    const [startX, startY] = toCanvasPoint(ridge[0]);
    context.beginPath();
    context.moveTo(startX, startY);
    for (const point of ridge.slice(1)) {
      const [x, y] = toCanvasPoint(point);
      context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();

  context.save();
  context.globalAlpha = theme === "dark" ? 0.18 : 0.16;
  context.strokeStyle = theme === "dark" ? "#123f36" : "#245c4f";
  context.lineWidth = 1.1;
  for (const [longitude, latitude, width, height] of [
    [-101, 50, 21, 7],
    [-60, -7, 18, 6],
    [20, 0, 16, 6],
    [83, 50, 26, 6],
    [105, 24, 24, 6]
  ]) {
    const x = lonToX(longitude);
    const y = latToY(latitude);
    context.beginPath();
    context.ellipse(x, y, width, height, -0.2, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}
