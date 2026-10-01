import { BasicNumber } from '../runtime/applesoft/basic-number';
import { BadSubscriptError } from './basic-errors';
import type { IGameContext } from './game-context';
import { MONSTER_NAMES } from './game-text';

// Lord British's court (listing lines 7000-7990): the name, the first quest, and a new monster to
// hunt each time one is done, until the tenth makes the player a knight.

const lit: (text: string) => BasicNumber = BasicNumber.parse;
const KNIGHTHOOD: number = 10;


export class LordBritish {
  constructor(private readonly game: IGameContext) {
  }


  public async visit(): Promise<void> {
    const { machine, state } = this.game;

    machine.text.home();
    machine.textMode();
    machine.text.home();
    machine.call(62450);

    if (state.playerName === '') {
      await this.firstVisit();
    } else if (state.task > 0) {
      await this.questNotDone();
    } else {
      await this.questDone();
    }
  }


  private async firstVisit(): Promise<void> {
    const { machine, state } = this.game;
    const text: typeof machine.text = machine.text;

    this.blank(2);
    this.say('     WELCOME PEASANT INTO THE HALLS OF');
    this.say('THE MIGHTY LORD BRITISH. HEREIN THOU MAYCHOOSE TO DARE BATTLE WITH THE EVIL');
    this.say('CREATURES OF THE DEPTHS, FOR GREAT');
    this.say('REWARD!');
    this.blank(1);
    text.print('WHAT IS THY NAME PEASANT ');
    state.playerName = await machine.input('?');
    text.print('DOEST THOU WISH FOR GRAND ADVENTURE ? ');

    if ((await machine.keyboard.get()) === 'Y') {
      this.blank(2);
      this.say('GOOD! THOU SHALT TRY TO BECOME A ');
      this.say('KNIGHT!!!');
      this.blank(1);
      this.say('THY FIRST TASK IS TO GO INTO THE');
      this.say('DUNGEONS AND TO RETURN ONLY AFTER');
      text.print('KILLING A(N) ');
      state.task = state.attributes[4].over(lit('3')).int().toInteger();
      this.say(this.monsterName(state.task));
      await this.sendOnQuest();
    } else {
      this.blank(1);
      this.say('THEN LEAVE AND BEGONE!');
      state.playerName = '';
      this.blank(1);
      text.print('         PRESS -SPACE- TO CONT.');
      await machine.keyboard.get();
    }
  }


  private async questNotDone(): Promise<void> {
    const { machine, state } = this.game;

    this.blank(2);
    this.say(`${ state.playerName } WHY HAST THOU RETURNED?`);
    this.say(`THOU MUST KILL A(N) ${ this.monsterName(state.task) }`);
    this.say('GO NOW AND COMPLETE THY QUEST!');
    this.blank(1);
    machine.text.print('         PRESS -SPACE- TO CONT.');
    await machine.keyboard.get();
    machine.text.home();
  }


  private async questDone(): Promise<void> {
    const { state } = this.game;

    this.blank(3);
    this.say(`AAHH!!.....${ state.playerName }`);
    this.blank(1);
    this.say('THOU HAST ACOMPLISHED THY QUEST!');

    if (Math.abs(state.task) === KNIGHTHOOD) {
      await this.knighted();
    } else {
      this.say('UNFORTUNATELY, THIS IS NOT ENOUGH TO');
      this.say('BECOME A KNIGHT.');
      state.task = Math.abs(state.task) + 1;
      this.blank(1);
      this.say(`NOW THOU MUST KILL A(N) ${ this.monsterName(state.task) }`);
      await this.sendOnQuest();
    }
  }


  /** Lines 7900-7990. */
  private async knighted(): Promise<void> {
    const { machine, state } = this.game;

    machine.textMode();
    machine.text.home();
    this.blank(3);
    state.playerName = `LORD ${ state.playerName }`;
    this.say(`     ${ state.playerName },`);
    this.say('       THOU HAST PROVED THYSELF WORTHY');
    this.say('OF KNIGHTHOOD, CONTINUE PLAY IF THOU');
    this.say('DOTH WISH, BUT THOU HAST ACOMPLISHED');
    this.say('THE MAIN OBJECTIVE OF THIS GAME...');

    if (state.levelOfPlay === 10) {
      this.blank(1);
      this.say('...CALL CALIFORNIA PACIFIC COMPUTER');
      this.say('AT (415)-569-9126 TO REPORT THIS');
      this.say('AMAZING FEAT!');
    } else {
      this.blank(1);
      this.say('   NOW MAYBE THOU ART FOOLHEARTY');
      this.say(`ENOUGH TO TRY DIFFICULTY LEVEL ${ state.levelOfPlay + 1 }`);
    }
    await this.rewardAndLeave();
  }


  /** Lines 7060-7070. */
  private async sendOnQuest(): Promise<void> {
    this.blank(1);
    this.say('     GO NOW UPON THIS QUEST, AND MAY');
    this.say('LADY LUCK BE FAIR UNTO YOU.....');
    this.say('.....ALSO I, BRITISH, HAVE INCREASED');
    this.say('EACH OF THY ATTRIBUTES BY ONE!');
    await this.rewardAndLeave();
  }


  private async rewardAndLeave(): Promise<void> {
    const { machine, state } = this.game;

    this.blank(1);
    machine.text.print('         PRESS -SPACE- TO CONT.');
    await machine.keyboard.get();
    for (let attribute: number = 0; attribute <= 5; attribute++) {
      state.attributes[attribute] = state.attributes[attribute].plus(lit('1')).stored();
    }
    machine.text.home();
  }


  private monsterName(index: number): string {
    if ((index < 0) || (index >= MONSTER_NAMES.length)) {
      throw new BadSubscriptError();
    }

    return MONSTER_NAMES[index];
  }


  private blank(count: number): void {
    for (let line: number = 0; line < count; line++) {
      this.game.machine.text.crdo();
    }
  }


  private say(words: string): void {
    this.game.machine.text.print(words);
    this.game.machine.text.crdo();
  }
}
