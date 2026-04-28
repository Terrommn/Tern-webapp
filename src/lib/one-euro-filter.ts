// Standard 1€ filter — https://gery.casiez.net/1euro/
// Low lag on fast motion, strong smoothing at rest.

export type OneEuroOptions = {
  minCutoff?: number;
  beta?: number;
  dCutoff?: number;
};

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;
  private prevValue: number | null = null;
  private prevDerivative = 0;
  private prevTimestamp: number | null = null;

  constructor({ minCutoff = 1, beta = 0.007, dCutoff = 1 }: OneEuroOptions = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  filter(value: number, timestamp: number): number {
    if (this.prevValue === null || this.prevTimestamp === null) {
      this.prevValue = value;
      this.prevTimestamp = timestamp;
      return value;
    }

    const dt = Math.max((timestamp - this.prevTimestamp) / 1000, 1e-6);
    const dValue = (value - this.prevValue) / dt;
    const aD = alpha(this.dCutoff, dt);
    const dHat = aD * dValue + (1 - aD) * this.prevDerivative;

    const cutoff = this.minCutoff + this.beta * Math.abs(dHat);
    const a = alpha(cutoff, dt);
    const filtered = a * value + (1 - a) * this.prevValue;

    this.prevValue = filtered;
    this.prevDerivative = dHat;
    this.prevTimestamp = timestamp;
    return filtered;
  }

  reset(): void {
    this.prevValue = null;
    this.prevDerivative = 0;
    this.prevTimestamp = null;
  }
}
