import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';

import { HiresPainter } from './renderers/hires-painter';
import { Game } from './port/game';
import { AppleMachine } from './runtime/apple-machine';
import type { IApplePalette } from './runtime/apple-palette';
import { paletteByName } from './runtime/apple-palette';
import { AppleScreenComponent } from './ui/apple-screen.component';
import type { IDisplaySettings } from './ui/display-settings';
import { loadDisplaySettings, saveDisplaySettings } from './ui/display-settings';
import { SettingsMenuComponent } from './ui/settings-menu.component';
import { TextMirrorComponent } from './ui/text-mirror.component';
import { TouchPadComponent } from './ui/touch-pad.component';


function browserStorage(): Storage | null {
  let storage: Storage | null = null;

  try {
    storage = (typeof localStorage === 'undefined') ? null : localStorage;
  } catch {
    storage = null;
  }

  return storage;
}


@Component({
  selector: 'akalabeth-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ AppleScreenComponent, SettingsMenuComponent, TextMirrorComponent, TouchPadComponent ],
  host: {
    '(window:keydown)': 'onKey($event)',
  },
  template: `
    <akalabeth-apple-screen [screen]="machine" [palette]="palette()" [crt]="settings().crt" />
    <akalabeth-text-mirror [machine]="machine" />
    <akalabeth-settings-menu [settings]="settings()" (changed)="choose($event)" />
    <akalabeth-touch-pad (pressed)="press($event)" />
  `,
  styles: [ ':host { display: block; width: 100%; height: 100%; }' ],
})
export class AppComponent {
  protected readonly machine: AppleMachine = new AppleMachine();
  protected readonly settings: WritableSignal<IDisplaySettings> = signal<IDisplaySettings>(loadDisplaySettings(browserStorage()));
  protected readonly palette: Signal<IApplePalette> = computed((): IApplePalette => paletteByName(this.settings().palette));


  constructor() {
    new Game(this.machine, new HiresPainter(this.machine.hires)).run().catch((thrown: unknown): void => console.error(thrown));
  }


  public onKey(event: KeyboardEvent): void {
    if (!event.ctrlKey && !event.metaKey && !event.altKey && this.machine.keyboard.pressKey(event.key)) {
      event.preventDefault();
    }
  }


  protected press(code: number): void {
    this.machine.keyboard.press(code);
  }


  protected choose(settings: IDisplaySettings): void {
    this.settings.set(settings);
    saveDisplaySettings(browserStorage(), settings);
  }

}
