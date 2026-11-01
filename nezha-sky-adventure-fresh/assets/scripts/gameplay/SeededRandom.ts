/** Small reproducible PRNG. Seeds are included in reports to replay a run. */
export class SeededRandom {
    private state: number;

    public constructor(seed: number) { this.state = seed >>> 0 || 0x6d2b79f5; }

    public next(): number {
        let value = this.state = (this.state + 0x6d2b79f5) >>> 0;
        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
    }

    public range(min: number, max: number): number { return min + this.next() * (max - min); }
    public index(length: number): number { return Math.floor(this.next() * length); }
}
