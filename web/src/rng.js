export class SeededGenerator {
  constructor(seed) {
    this.state = BigInt(seed);
  }

  next() {
    const multiplier = 2862933555777941757n;
    const increment = 3037000493n;
    this.state = (multiplier * this.state + increment) & 0xffffffffffffffffn;
    return this.state;
  }

  nextFloat() {
    const value = this.next();
    return Number(value % 1000000n) / 1000000;
  }
}

export function shuffleWithSeed(list, seed) {
  const generator = new SeededGenerator(seed);
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const rand = Number(generator.next() % BigInt(i + 1));
    const temp = array[i];
    array[i] = array[rand];
    array[rand] = temp;
  }
  return array;
}
