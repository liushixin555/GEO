/**
 * 简易并发控制器（p-limit 替代品）
 *
 * 同一引擎并发量过大会触发对方限流，因此按引擎分组限流。
 *
 * 默认每引擎并发 3，可通过 ConcurrencyConfig.perEngine 覆盖。
 * 不再硬编码各引擎的限流值 —— 引擎来源由 LlmModel 表动态决定。
 */

export interface ConcurrencyConfig {
  /** 单引擎最大并发数覆盖（不指定则使用默认值 3） */
  perEngine?: number;
}

/** 单引擎默认并发上限 */
const DEFAULT_PER_ENGINE_CONCURRENCY = 3;

/** 单引擎信号量 */
class Semaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];
  constructor(private readonly limit: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active++;
  }

  release(): void {
    this.active--;
    const next = this.waiters.shift();
    if (next) next();
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * 并发执行任务（按引擎分组限流）。
 *
 * @param tasks  任务列表，每个任务携带 engine 标识
 * @param worker 处理单个任务的函数
 * @returns  与 tasks 同序的结果数组（worker 异常不中断整体，写入 Error 对象）
 */
export async function runWithConcurrency<T extends { engine: string }, R>(
  tasks: T[],
  worker: (task: T) => Promise<R>,
  config: ConcurrencyConfig = {},
): Promise<Array<R | Error>> {
  // 按引擎构建信号量
  const semaphores = new Map<string, Semaphore>();
  for (const t of tasks) {
    if (!semaphores.has(t.engine)) {
      const limit = config.perEngine ?? DEFAULT_PER_ENGINE_CONCURRENCY;
      semaphores.set(t.engine, new Semaphore(limit));
    }
  }

  // 全部并发，但每个引擎的并发量受信号量约束
  const wrapped = tasks.map(async (task) => {
    const sem = semaphores.get(task.engine)!;
    try {
      return await sem.run(() => worker(task));
    } catch (err) {
      return err instanceof Error ? err : new Error(String(err));
    }
  });

  return Promise.all(wrapped);
}
