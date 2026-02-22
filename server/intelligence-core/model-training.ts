interface DatasetRecord {
  normalizedFeatures: Record<string, number>;
  targetValue: number;
  createdAt: Date | string | null;
}

interface TrainResult {
  coefficients: number[];
  intercept: number;
  featureNames: string[];
  rSquared: number;
  mae: number;
  tierAccuracy: number;
  directionalAccuracy: number;
  trainSampleCount: number;
  testSampleCount: number;
}

type Matrix = number[][];

function matrixTranspose(a: Matrix): Matrix {
  const rows = a.length;
  const cols = a[0].length;
  const result: Matrix = [];
  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = a[i][j];
    }
  }
  return result;
}

function matrixMultiply(a: Matrix, b: Matrix): Matrix {
  const aRows = a.length;
  const aCols = a[0].length;
  const bCols = b[0].length;
  const result: Matrix = [];
  for (let i = 0; i < aRows; i++) {
    result[i] = [];
    for (let j = 0; j < bCols; j++) {
      let sum = 0;
      for (let k = 0; k < aCols; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function matrixInverse(a: Matrix): Matrix {
  const n = a.length;
  const augmented: Matrix = [];
  for (let i = 0; i < n; i++) {
    augmented[i] = [...a[i]];
    for (let j = 0; j < n; j++) {
      augmented[i].push(i === j ? 1 : 0);
    }
  }

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(augmented[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(augmented[row][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) {
      for (let i = 0; i < n; i++) {
        augmented[col][col + n + i] = 0;
      }
      augmented[col][col] = 1;
      continue;
    }

    if (maxRow !== col) {
      [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];
    }

    const pivot = augmented[col][col];
    for (let j = 0; j < 2 * n; j++) {
      augmented[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = augmented[row][col];
      for (let j = 0; j < 2 * n; j++) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  const inverse: Matrix = [];
  for (let i = 0; i < n; i++) {
    inverse[i] = augmented[i].slice(n);
  }
  return inverse;
}

export function splitData(
  records: DatasetRecord[],
  trainRatio: number = 0.8
): { train: DatasetRecord[]; test: DatasetRecord[] } {
  const sorted = [...records].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });

  const splitIndex = Math.floor(sorted.length * trainRatio);
  return {
    train: sorted.slice(0, splitIndex),
    test: sorted.slice(splitIndex),
  };
}

export function classifyTier(value: number): string {
  if (value > 0.7) return "top";
  if (value < 0.3) return "low";
  return "mid";
}

export function predict(
  coefficients: number[],
  intercept: number,
  featureVector: number[]
): number {
  let result = intercept;
  for (let i = 0; i < coefficients.length; i++) {
    result += coefficients[i] * (featureVector[i] ?? 0);
  }
  return result;
}

export function trainModel(
  datasetId: string,
  records: DatasetRecord[]
): TrainResult {
  if (records.length < 3) {
    return {
      coefficients: [],
      intercept: 0,
      featureNames: [],
      rSquared: 0,
      mae: 0,
      tierAccuracy: 0,
      directionalAccuracy: 0,
      trainSampleCount: 0,
      testSampleCount: 0,
    };
  }

  const { train, test } = splitData(records);

  if (train.length === 0 || test.length === 0) {
    return {
      coefficients: [],
      intercept: 0,
      featureNames: [],
      rSquared: 0,
      mae: 0,
      tierAccuracy: 0,
      directionalAccuracy: 0,
      trainSampleCount: train.length,
      testSampleCount: test.length,
    };
  }

  const featureNames = Object.keys(train[0].normalizedFeatures).sort();
  const numFeatures = featureNames.length;

  const X: Matrix = [];
  const y: number[] = [];

  for (const record of train) {
    const row: number[] = [1];
    for (const name of featureNames) {
      row.push(record.normalizedFeatures[name] ?? 0);
    }
    X.push(row);
    y.push(record.targetValue);
  }

  const Xt = matrixTranspose(X);
  const XtX = matrixMultiply(Xt, X);
  const XtXinv = matrixInverse(XtX);

  const yCol: Matrix = y.map((v) => [v]);
  const XtY = matrixMultiply(Xt, yCol);
  const beta = matrixMultiply(XtXinv, XtY);

  const intercept = beta[0][0];
  const coefficients = beta.slice(1).map((row) => row[0]);

  const testPredictions: number[] = [];
  const testActuals: number[] = [];

  for (const record of test) {
    const featureVector = featureNames.map(
      (name) => record.normalizedFeatures[name] ?? 0
    );
    const pred = predict(coefficients, intercept, featureVector);
    testPredictions.push(pred);
    testActuals.push(record.targetValue);
  }

  const meanActual =
    testActuals.reduce((s, v) => s + v, 0) / testActuals.length;
  let ssRes = 0;
  let ssTot = 0;
  let maeSum = 0;

  for (let i = 0; i < testActuals.length; i++) {
    const residual = testActuals[i] - testPredictions[i];
    ssRes += residual * residual;
    ssTot += (testActuals[i] - meanActual) ** 2;
    maeSum += Math.abs(residual);
  }

  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const mae = maeSum / testActuals.length;

  let tierCorrect = 0;
  for (let i = 0; i < testActuals.length; i++) {
    if (classifyTier(testPredictions[i]) === classifyTier(testActuals[i])) {
      tierCorrect++;
    }
  }
  const tierAccuracy = tierCorrect / testActuals.length;

  const medianActual = (() => {
    const sorted = [...testActuals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  })();

  let directionalCorrect = 0;
  for (let i = 0; i < testActuals.length; i++) {
    const predAbove = testPredictions[i] >= medianActual;
    const actualAbove = testActuals[i] >= medianActual;
    if (predAbove === actualAbove) {
      directionalCorrect++;
    }
  }
  const directionalAccuracy = directionalCorrect / testActuals.length;

  return {
    coefficients,
    intercept,
    featureNames,
    rSquared,
    mae,
    tierAccuracy,
    directionalAccuracy,
    trainSampleCount: train.length,
    testSampleCount: test.length,
  };
}
