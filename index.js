/* eslint-disable max-len */
const { Matrix, SingularValueDecomposition, inverse } = require('ml-matrix');

class ProjectionCalculator {
  constructor(points3d, points2d, screenWidth, screenHeight) {
    if (points3d.length !== points2d.length) {
      throw new Error('Lengths of point arrays must be equal');
    }
    this.points3d = points3d;
    this.points2d = points2d;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.x = screenWidth / 2;
    this.y = screenHeight / 2;

    for (let i = 0; i < points2d.length; i += 1) {
      this.points2d[i][0] -= this.x;
      this.points2d[i][0] /= this.x;
      this.points2d[i][1] -= this.y;
      this.points2d[i][1] /= this.y;
    }

    const generalMatrix = new Matrix(points2d.length * 2, 12);
    let k = 0;
    for (let i = 0; i < points3d.length; i += 1) {
      [generalMatrix[k][0], generalMatrix[k][1], generalMatrix[k][2]] = this.points3d[i];
      generalMatrix[k][3] = 1;
      generalMatrix[k][4] = 0;
      generalMatrix[k][5] = 0;
      generalMatrix[k][6] = 0;
      generalMatrix[k][7] = 0;
      generalMatrix[k][8] = -this.points3d[i][0] * this.points2d[i][0];
      generalMatrix[k][9] = -this.points3d[i][1] * this.points2d[i][0];
      generalMatrix[k][10] = -this.points3d[i][2] * this.points2d[i][0];
      generalMatrix[k][11] = -this.points2d[i][0];
      generalMatrix[k + 1][0] = 0;
      generalMatrix[k + 1][1] = 0;
      generalMatrix[k + 1][2] = 0;
      generalMatrix[k + 1][3] = 0;
      [generalMatrix[k + 1][4], generalMatrix[k + 1][5], generalMatrix[k + 1][6]] = this.points3d[i];
      generalMatrix[k + 1][7] = 1;
      generalMatrix[k + 1][8] = -this.points3d[i][0] * this.points2d[i][1];
      generalMatrix[k + 1][9] = -this.points3d[i][1] * this.points2d[i][1];
      generalMatrix[k + 1][10] = -this.points3d[i][2] * this.points2d[i][1];
      generalMatrix[k + 1][11] = -this.points2d[i][1];
      k += 2;
    }
    const svd = new SingularValueDecomposition(generalMatrix);
    const matrix = new Matrix(svd.V).transpose();
    const subMatrix = matrix.subMatrix(11, 11, 0, 11)[0];
    this.resultMatrix = new Matrix([
      [subMatrix[0], subMatrix[1], subMatrix[2], subMatrix[3]],
      [subMatrix[4], subMatrix[5], subMatrix[6], subMatrix[7]],
      [subMatrix[8], subMatrix[9], subMatrix[10], subMatrix[11]],
      [0, 0, 0, 1],
    ]);
    this.resultMatrixInversed = inverse(this.resultMatrix);
  }

  getProjectedPoint(point3d) {
    const point = Matrix.columnVector([point3d[0], point3d[1], point3d[2], 1]);
    const projectedPoint = this.resultMatrix.mmul(point);
    return [
      (projectedPoint[0] / projectedPoint[2]) * this.x + this.x,
      (projectedPoint[1] / projectedPoint[2]) * this.y + this.y,
    ];
  }

  get3dPointOnHeight(point2d, height) {
    const point1 = Matrix.columnVector([(point2d[0] - this.x) / this.x, (point2d[1] - this.y) / this.y, 1, 1]);
    const point2 = Matrix.columnVector([100 * (point2d[0] - this.x) / this.x, 100 * (point2d[1] - this.y) / this.y, 100, 1]);
    const rayPoint1 = this.resultMatrixInversed.mmul(point1);
    const rayPoint2 = this.resultMatrixInversed.mmul(point2);
    const result = ProjectionCalculator.getIntersectionLineAndPlane(rayPoint1, rayPoint2, [0, 0, height], [0, 10, height], [10, 0, height]);
    return result;
  }

  static getIntersectionLineAndPlane(linePoint1, linePoint2, planePoint1, planePoint2, planePoint3) {
    const A = (planePoint2[1] - planePoint1[1]) * (planePoint3[2] - planePoint1[2]) - (planePoint2[2] - planePoint1[2]) * (planePoint3[1] - planePoint1[1]);
    const B = (planePoint2[2] - planePoint1[2]) * (planePoint3[0] - planePoint1[0]) - (planePoint2[0] - planePoint1[0]) * (planePoint3[2] - planePoint1[2]);
    const C = (planePoint2[0] - planePoint1[0]) * (planePoint3[1] - planePoint1[1]) - (planePoint2[1] - planePoint1[1]) * (planePoint3[0] - planePoint1[0]);
    const D = A * planePoint1[0] + B * planePoint1[1] + C * planePoint1[2];
    const a = linePoint2[0] - linePoint1[0];
    const b = linePoint2[1] - linePoint1[1];
    const c = linePoint2[2] - linePoint1[2];
    const d = a * linePoint1[1] - b * linePoint1[0];
    const e = a * linePoint1[2] - c * linePoint1[0];

    const intersectionX = (a * D - d * B - e * C) / (a * A + b * B + c * C);
    const intersectionY = (b * intersectionX + d) / a;
    const intersectionZ = (c * intersectionX + e) / a;

    return [intersectionX, intersectionY, intersectionZ];
  }
}

module.exports = ProjectionCalculator;
