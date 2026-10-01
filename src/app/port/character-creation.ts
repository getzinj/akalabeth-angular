import type { AppleMachine } from '../runtime/apple-machine';
import type { ApplesoftRandom } from '../runtime/applesoft/applesoft-random';
import { BasicNumber } from '../runtime/applesoft/basic-number';
import { ATTRIBUTE_NAMES } from './game-text';
import type { GameState } from './game-state';
import { Shop } from './shop';
import { seedFromLuckyNumber } from './world-generator';

// Choosing a character (listing lines 60000-60075): the lucky number, the level of play, the roll
// of the six attributes, the class, and the shop.

const lit: (text: string) => BasicNumber = BasicNumber.parse;


export class CharacterCreation {
  constructor(
    private readonly machine: AppleMachine,
    private readonly state: GameState,
    private readonly random: ApplesoftRandom,
  ) {
  }


  public async run(): Promise<void> {
    await this.askLuckyNumberAndLevel();
    seedFromLuckyNumber(this.random, this.state.luckyNumber);
    await this.rollUntilAccepted();
    await this.chooseClass();

    const shop: Shop = new Shop(this.machine, this.state);

    shop.draw();
    await shop.run();
  }


  private async askLuckyNumberAndLevel(): Promise<void> {
    const text: AppleMachine['text'] = this.machine.text;
    let valid: boolean = false;

    this.machine.textMode();
    text.home();
    text.vtab(5);
    this.state.luckyNumber = BasicNumber.val(await this.machine.input('TYPE THY LUCKY NUMBER.....')).stored();

    while (!valid) {
      text.vtab(7);
      const level: BasicNumber = BasicNumber.val(await this.machine.input('LEVEL OF PLAY (1-10)......')).int().stored();

      valid = !(level.isLessThan(lit('1')) || level.isGreaterThan(lit('10')));
      if (valid) {
        this.state.levelOfPlay = level.toInteger();
      }
    }
  }


  private async rollUntilAccepted(): Promise<void> {
    const text: AppleMachine['text'] = this.machine.text;
    let accepted: boolean = false;

    while (!accepted) {
      for (let x: number = 0; x <= 5; x++) {
        this.state.attributes[x] = this.random.next().sqr().times(lit('21')).plus(lit('4')).int().stored();
      }

      text.home();
      text.vtab(8);
      for (let x: number = 0; x <= 5; x++) {
        text.print(ATTRIBUTE_NAMES[x]);
        text.comma();
        text.print(this.state.attributes[x].print());
        text.crdo();
      }
      text.crdo();
      text.print('SHALT THOU PLAY WITH THESE QUALITIES?');
      text.crdo();
      text.htab(20);
      accepted = (await this.machine.keyboard.get()) === 'Y';
    }
  }


  private async chooseClass(): Promise<void> {
    const text: AppleMachine['text'] = this.machine.text;
    let chosen: string = '';

    while ((chosen !== 'M') && (chosen !== 'F')) {
      text.vtab(15);
      text.crdo();
      text.print('AND SHALT THOU BE A FIGHTER OR A MAGE?');
      text.crdo();
      text.htab(20);
      chosen = await this.machine.keyboard.get();
    }

    this.state.playerClass = chosen;
  }
}
