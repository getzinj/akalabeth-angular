import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import { AppleMachine } from '../runtime/apple-machine';
import { AppleScreenComponent } from './apple-screen.component';


async function screenWith(crt: boolean): Promise<HTMLElement> {
  const fixture: ComponentFixture<AppleScreenComponent> = TestBed.createComponent(AppleScreenComponent);

  fixture.componentRef.setInput('screen', new AppleMachine());
  fixture.componentRef.setInput('crt', crt);
  await fixture.whenStable();

  return fixture.nativeElement as HTMLElement;
}


describe('AppleScreenComponent', (): void => {
  it('has a backing width of 280 pixels', async (): Promise<void> => {
    expect(((await screenWith(true)).querySelector('canvas') as HTMLCanvasElement).width).toBe(280);
  });

  it('has a backing height of 192 pixels', async (): Promise<void> => {
    expect(((await screenWith(true)).querySelector('canvas') as HTMLCanvasElement).height).toBe(192);
  });

  it('adds scanlines with the CRT effect on', async (): Promise<void> => {
    expect((await screenWith(true)).querySelector('.scanlines')).not.toBeNull();
  });

  it('adds a glow layer with the CRT effect on', async (): Promise<void> => {
    expect((await screenWith(true)).querySelector('canvas.glow')).not.toBeNull();
  });

  it('has no scanlines with the CRT effect off', async (): Promise<void> => {
    expect((await screenWith(false)).querySelector('.scanlines')).toBeNull();
  });

  it('has no glow layer with the CRT effect off', async (): Promise<void> => {
    expect((await screenWith(false)).querySelector('canvas.glow')).toBeNull();
  });
});
