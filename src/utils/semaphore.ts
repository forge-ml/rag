export class Semaphore {
    protected capacity: number;
  
    protected count: number;
  
    protected queue: Function[] = [];
  
    constructor(capacity: number = 1) {
      this.capacity = capacity;
      this.count = 0;
    }
  
    async acquire(): Promise<void> {
      this.count++;
      if (this.count <= this.capacity) {
        return;
      }
  
      const promise = new Promise<void>((resolve, _reject) => {
        this.queue.push(resolve);
      });
  
      return promise;
    }
  
    async release(): Promise<void> {
      this.count--;
      const resolver = this.queue.shift();
      if (resolver) {
        resolver();
      }
    }
  }
  
  export class Throttler extends Semaphore {
    private interval: NodeJS.Timeout;
  
    constructor(capacity: number = 1) {
      super(capacity);
      this.interval = setInterval(this.releaseInterval.bind(this), 1000);
    }
  
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      await this.acquire();
      return fn();
    }
  
    async releaseInterval(): Promise<void> {
      Array.from({ length: this.capacity }).forEach(() => {
        this.release();
      });
    }
  
    destroy() {
      clearInterval(this.interval);
    }
  }

  export class DynamicThrottler extends Semaphore {
    private interval: NodeJS.Timeout;
    private valueProvider: () => number;
    private limit: number;

    constructor(valueProvider: () => number, limit: number) {
      super(1); // Start with capacity 1, will be updated dynamically
      this.valueProvider = valueProvider;
      this.limit = limit;
      this.interval = setInterval(this.updateCapacity.bind(this), 1000);
    }

    private updateCapacity(): void {
      const currentValue = this.valueProvider();
      const newCapacity = Math.max(1, Math.floor(this.limit - currentValue));
      this.capacity = newCapacity;

      // Release up to the new capacity
      for (let i = 0; i < newCapacity; i++) {
        this.release();
      }
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
      await this.acquire();
      try {
        return await fn();
      } finally {
        this.release();
      }
    }

    destroy(): void {
      clearInterval(this.interval);
    }
  }