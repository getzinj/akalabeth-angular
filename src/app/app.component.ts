import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AppleMachine } from './runtime/apple-machine';
import { AppleScreenComponent } from './ui/apple-screen.component';
import { drawTestPattern, echoKeys } from './ui/test-pattern';


@Component({
  selector: 'akalabeth-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ AppleScreenComponent ],
  host: {
    '(window:keydown)': 'onKey($event)',
  },
  template: '<akalabeth-apple-screen [screen]="machine" />',
  styles: [ ':host { display: block; width: 100%; height: 100%; }' ],
})
export class AppComponent {
  protected readonly machine: AppleMachine = new AppleMachine();


  constructor() {
    drawTestPattern(this.machine);
    void echoKeys(this.machine);
  }


  public onKey(event: KeyboardEvent): void {
    if (this.machine.keyboard.pressKey(event.key)) {
      event.preventDefault();
    }
  }

}
