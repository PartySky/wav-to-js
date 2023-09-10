export class RoundRobin {
  value = 0;
  maxValue = 0;

  constructor(maxValue?: number) {
    if (maxValue) {
      this.maxValue = maxValue;
    }
  }

  up(): void {
    if (this.value >= this.maxValue) {
      this.value = 0;
    } else {
      this.value++;
    }
  }
}
