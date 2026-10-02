import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import { AppleMachine } from '../runtime/apple-machine';
import { TextMirrorComponent } from './text-mirror.component';


describe('TextMirrorComponent', (): void => {
  async function mirrorOf(machine: AppleMachine): Promise<string> {
    const fixture: ComponentFixture<TextMirrorComponent> = TestBed.createComponent(TextMirrorComponent);

    fixture.componentRef.setInput('machine', machine);
    await fixture.whenStable();
    fixture.detectChanges();

    return ((fixture.nativeElement as HTMLElement).querySelector('pre') as HTMLElement).textContent ?? '';
  }

  it('says what is on the text screen', async (): Promise<void> => {
    const machine: AppleMachine = new AppleMachine();

    machine.text.print('WELCOME');

    expect(await mirrorOf(machine)).toBe('WELCOME');
  });

  it('says only the text window rows when graphics are showing', async (): Promise<void> => {
    const machine: AppleMachine = new AppleMachine();

    machine.text.print('HIDDEN BEHIND THE PICTURE');
    machine.hgr();

    expect(await mirrorOf(machine)).toBe('');
  });

  it('is a polite live region', async (): Promise<void> => {
    const fixture: ComponentFixture<TextMirrorComponent> = TestBed.createComponent(TextMirrorComponent);

    fixture.componentRef.setInput('machine', new AppleMachine());
    await fixture.whenStable();

    expect(((fixture.nativeElement as HTMLElement).querySelector('pre') as HTMLElement).getAttribute('aria-live')).toBe('polite');
  });
});
