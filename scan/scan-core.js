// Corners must follow TL, TR, BR, BL around a convex document boundary.
export function validCorners(points) {
  return points.length === 4 && points.every((p, i) => {
    const q = points[(i + 1) % 4], r = points[(i + 2) % 4];
    return Number.isFinite(p.x) && Number.isFinite(p.y) &&
      (q.x - p.x) * (r.y - q.y) - (q.y - p.y) * (r.x - q.x) > 4;
  });
}

export function rectify(source, points, maxEdge = 2200) {
  if (!validCorners(points)) throw new Error('Bốn góc phải bao quanh tờ giấy, không được giao nhau.');
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let width = Math.max(distance(points[0], points[1]), distance(points[3], points[2]));
  let height = Math.max(distance(points[0], points[3]), distance(points[1], points[2]));
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  width = Math.max(2, Math.round(width * scale)); height = Math.max(2, Math.round(height * scale));
  // Solve the projective mapping from the unit square to the photographed paper.
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const matrix = [];
  points.forEach(({ x, y }, i) => {
    const [u, v] = uv[i];
    matrix.push([u, v, 1, 0, 0, 0, -u*x, -v*x, x]);
    matrix.push([0, 0, 0, u, v, 1, -u*y, -v*y, y]);
  });
  for (let i = 0; i < 8; i++) {
    let pivot = i;
    for (let j = i + 1; j < 8; j++) if (Math.abs(matrix[j][i]) > Math.abs(matrix[pivot][i])) pivot = j;
    [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];
    const divisor = matrix[i][i];
    if (Math.abs(divisor) < 1e-10) throw new Error('Vùng giấy quá nhỏ hoặc các góc không hợp lệ.');
    for (let k = i; k <= 8; k++) matrix[i][k] /= divisor;
    for (let j = 0; j < 8; j++) if (j !== i) {
      const factor = matrix[j][i];
      for (let k = i; k <= 8; k++) matrix[j][k] -= factor * matrix[i][k];
    }
  }
  const h = matrix.map(row => row[8]);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / (width - 1), v = y / (height - 1), d = h[6]*u + h[7]*v + 1;
    const sx = Math.max(0, Math.min(source.width - 1, (h[0]*u + h[1]*v + h[2]) / d));
    const sy = Math.max(0, Math.min(source.height - 1, (h[3]*u + h[4]*v + h[5]) / d));
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(x0 + 1, source.width - 1), y1 = Math.min(y0 + 1, source.height - 1);
    const dx = sx - x0, dy = sy - y0, offset = (y * width + x) * 4;
    for (let c = 0; c < 3; c++) data[offset+c] =
      source.data[(y0*source.width+x0)*4+c]*(1-dx)*(1-dy) + source.data[(y0*source.width+x1)*4+c]*dx*(1-dy) +
      source.data[(y1*source.width+x0)*4+c]*(1-dx)*dy + source.data[(y1*source.width+x1)*4+c]*dx*dy;
    data[offset+3] = 255;
  }
  return { data, width, height };
}

export function enhance(image, mode, strength = 12) {
  const { width, height } = image, data = new Uint8ClampedArray(image.data);
  if (mode === 'color') return { width, height, data };
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < gray.length; i++) gray[i] = image.data[i*4]*0.299 + image.data[i*4+1]*0.587 + image.data[i*4+2]*0.114;
  const stride = width + 1, integral = new Float64Array(stride * (height + 1));
  for (let y = 1; y <= height; y++) {
    let sum = 0;
    for (let x = 1; x <= width; x++) { sum += gray[(y-1)*width+x-1]; integral[y*stride+x] = integral[(y-1)*stride+x] + sum; }
  }
  const radius = Math.max(8, Math.round(Math.min(width, height) / 40));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const left = Math.max(0, x-radius), right = Math.min(width, x+radius+1), top = Math.max(0, y-radius), bottom = Math.min(height, y+radius+1);
    const mean = (integral[bottom*stride+right]-integral[top*stride+right]-integral[bottom*stride+left]+integral[top*stride+left]) / ((right-left)*(bottom-top));
    const i = y*width+x;
    const value = mode === 'bw' ? (gray[i] < mean-strength ? 0 : 255) : Math.max(0, Math.min(255, gray[i] + (255-mean)*0.85));
    data[i*4] = data[i*4+1] = data[i*4+2] = value;
  }
  return { width, height, data };
}
