import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AppleScreenComponent } from './ui/apple-screen.component';


@Component({
  selector: 'akalabeth-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ AppleScreenComponent ],
  template: '<akalabeth-apple-screen />',
  styles: [ ':host { display: block; width: 100%; height: 100%; }' ],
})
export class AppComponent {
}
