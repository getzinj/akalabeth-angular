import type { OnDestroy } from '@angular/core';
import { ChangeDetectionStrategy, Component, afterNextRender, input, signal } from '@angular/core';
import type { InputSignal, WritableSignal } from '@angular/core';

import type { AppleMachine } from '../runtime/apple-machine';

const POLL_MILLISECONDS: number = 250;
const MIXED_MODE_FIRST_ROW: number = 20;


/** The text screen as words, for screen readers: what is written on it, announced as it changes. */
@Component({
  selector: 'akalabeth-text-mirror',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<pre class="mirror" role="status" aria-live="polite" aria-atomic="true">{{ words() }}</pre>',
  styles: [ '.mirror { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: pre-wrap; border: 0; }' ],
})
export class TextMirrorComponent implements OnDestroy {
  public readonly machine: InputSignal<AppleMachine> = input.required<AppleMachine>();

  protected readonly words: WritableSignal<string> = signal<string>('');

  private timer: ReturnType<typeof setInterval> | null = null;


  constructor() {
    afterNextRender((): void => {
      this.refresh();
      this.timer = setInterval((): void => this.refresh(), POLL_MILLISECONDS);
    });
  }


  public ngOnDestroy(): void {
    if (this.timer != null) {
      clearInterval(this.timer);
    }
  }


  private refresh(): void {
    const machine: AppleMachine = this.machine();
    const firstRow: number = machine.showingGraphics ? MIXED_MODE_FIRST_ROW : 0;
    const rows: string[] = [];

    for (let row: number = firstRow; row < 24; row++) {
      rows.push(machine.text.line(row).trimEnd());
    }
    const text: string = rows.join('\n').trim();

    if (text !== this.words()) {
      this.words.set(text);
    }
  }

}
