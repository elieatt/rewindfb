import type { RequestControl } from './feed/client';
import { notify, type PageView } from './state';
import type { ItemMap, Step } from './types';
import { sleep } from './util';

/** Thrown inside a search when the viewer presses Stop. */
export class StopError extends Error {
  constructor() {
    super('Stopped');
    this.name = 'StopError';
  }
}

/** One running search or "Next N", reporting into its page's view. */
export class Job implements RequestControl {
  stopped = false;
  requests = 0;
  /** Shown instead of the current step's detail while retrying. */
  retrying: string | null = null;
  readonly started = Date.now();
  /** Items collected so far; kept if the job stops or fails. */
  collected: ItemMap | null = null;
  /** Every window before this time has been read completely. */
  nextAt = 0;
  reachedEnd = false;

  constructor(
    readonly path: string,
    readonly view: PageView,
    /** How many items the view should list when the job ends. */
    readonly target: number,
    /** True for "Next N", false for a new search. */
    readonly more: boolean,
  ) {}

  get seconds(): number {
    return Math.round((Date.now() - this.started) / 1000);
  }

  stop(): void {
    this.stopped = true;
    notify();
  }

  checkStopped(): void {
    if (this.stopped) throw new StopError();
  }

  async pause(ms: number): Promise<void> {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      this.checkStopped();
      await sleep(Math.min(500, end - Date.now()));
    }
  }

  onRequest(): void {
    this.requests++;
  }

  onRetry(message: string | null): void {
    if (message === this.retrying) return;
    this.retrying = message;
    if (message) this.log(message);
    else notify();
  }

  log(message: string): void {
    this.view.log.push({ t: Date.now(), message });
    notify();
  }

  /** Updates a step; making one active marks the steps before it done. */
  setStep(index: number, changes: Partial<Step>): void {
    const { steps } = this.view;
    if (changes.status === 'active') {
      for (const step of steps.slice(0, index)) step.status = 'done';
    }
    const step = steps[index];
    if (step) Object.assign(step, changes);
    notify();
  }
}
