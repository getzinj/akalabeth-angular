import type { AppleMachine } from '../runtime/apple-machine';
import { BasicNumber } from '../runtime/applesoft/basic-number';
import { ATTRIBUTE_NAMES, FOOD, GOLD, ITEM_NAMES } from './game-text';
import type { GameState } from './game-state';

// The adventure shop (listing lines 60080-60250).

interface IShopItem {
  readonly key: string;
  readonly said: string;
  readonly slot: number;
  readonly price: number;
}

const ITEMS: readonly IShopItem[] = [
  { key: 'F', said: 'FOOD', slot: 0, price: 1 },
  { key: 'R', said: 'RAPIER', slot: 1, price: 8 },
  { key: 'A', said: 'AXE', slot: 2, price: 5 },
  { key: 'S', said: 'SHIELD', slot: 3, price: 6 },
  { key: 'B', said: 'BOW', slot: 4, price: 3 },
  { key: 'M', said: 'AMULET', slot: 5, price: 15 },
];

const MAGES_CANNOT_USE: readonly string[] = [ 'R', 'B' ];
const PRICE_ROWS: readonly (readonly string[])[] = [
  [ '1 FOR 10', 'N/A' ], [ '8', '1-10' ], [ '5', '1-5' ], [ '6', '1' ], [ '3', '1-4' ], [ '15', '?????' ],
];

const lit: (text: string) => BasicNumber = BasicNumber.parse;


export class Shop {
  constructor(private readonly machine: AppleMachine, private readonly state: GameState) {
  }


  /** Lines 60080-60130: the stats, the stock and the prices. */
  public draw(): void {
    const machine: AppleMachine = this.machine;
    const text: AppleMachine['text'] = machine.text;

    machine.textMode();
    text.home();
    text.crdo();
    text.crdo();
    text.print('     STAT\'S              WEAPONS');
    text.crdo();
    text.crdo();
    for (let x: number = 0; x <= 5; x++) {
      text.print(ATTRIBUTE_NAMES[x]);
      text.print(this.state.attributes[x].print());
      text.tab(24);
      text.print('0-');
      text.print(ITEM_NAMES[x]);
      text.crdo();
    }
    machine.poke(34, 12);
    text.home();
    machine.poke(35, 15);

    text.vtab(11);
    text.htab(18);
    text.print('Q-QUIT');
    text.crdo();

    if (this.state.possessions[FOOD].isGreaterThan(BasicNumber.ZERO)) {
      machine.call(62450);
    }

    for (let z: number = 0; z <= 5; z++) {
      this.printPossession(z);
    }

    text.vtab(17);
    text.htab(5);
    text.print('PRICE');
    text.htab(15);
    text.print('DAMAGE');
    text.htab(25);
    text.print('ITEM');
    text.crdo();

    for (let x: number = 0; x <= 5; x++) {
      text.vtab(19 + x);
      text.htab(25);
      text.print(ITEM_NAMES[x]);
      text.crdo();
    }

    PRICE_ROWS.forEach((row: readonly string[], index: number): void => {
      text.vtab(19 + index);
      text.htab(5);
      text.print(row[0]);
      text.crdo();
      text.htab(15);
      text.print(row[1]);
      text.crdo();
    });

    text.home();
  }


  /** Lines 60200-60250: sell until the player quits. */
  public async run(): Promise<void> {
    const machine: AppleMachine = this.machine;
    const text: AppleMachine['text'] = machine.text;
    let leaving: boolean = false;

    text.home();
    text.print('WELCOME TO THE ADVENTURE SHOP');
    text.crdo();

    while (!leaving) {
      text.print('WHICH ITEM SHALT THOU BUY ');
      const key: string = await machine.keyboard.get();

      if (key === 'Q') {
        text.crdo();
        text.print('BYE');
        text.crdo();
        machine.textMode();
        text.home();
        leaving = true;
      } else {
        this.sell(key);
      }
    }
  }


  private sell(key: string): void {
    const text: AppleMachine['text'] = this.machine.text;
    const item: IShopItem | undefined = ITEMS.find((candidate: IShopItem): boolean => candidate.key === key);

    if (item == null) {
      text.print(key);
      text.crdo();
      text.print('I\'M SORRY WE DON\'T HAVE THAT.');
      text.crdo();
    } else {
      text.print(item.said);
      text.crdo();

      if (this.state.playerClass === 'M' && MAGES_CANNOT_USE.includes(key)) {
        text.print('I\'M SORRY MAGES');
        text.crdo();
        text.print('CAN\'T USE THAT!');
        text.crdo();
      } else if (this.state.attributes[GOLD].minus(BasicNumber.of(item.price)).isLessThan(BasicNumber.ZERO)) {
        text.print('M\'LORD THOU CAN NOT AFFORD THAT ITEM.');
        text.crdo();
      } else {
        this.buy(item);
      }
    }
  }


  private buy(item: IShopItem): void {
    const text: AppleMachine['text'] = this.machine.text;
    const possessions: BasicNumber[] = this.state.possessions;

    if (item.slot === FOOD) {
      possessions[item.slot] = possessions[item.slot].plus(lit('9')).stored();
    }
    possessions[item.slot] = possessions[item.slot].plus(lit('1')).stored();
    this.state.attributes[GOLD] = this.state.attributes[GOLD].minus(BasicNumber.of(item.price)).stored();

    text.vtab(10);
    text.htab(16);
    text.print(this.state.attributes[GOLD].print());
    text.print('  ');

    this.printPossession(item.slot);
    text.htab(1);
    text.vtab(14);
    text.crdo();
  }


  private printPossession(slot: number): void {
    const text: AppleMachine['text'] = this.machine.text;
    const shown: string = this.state.possessions[slot].print();

    text.vtab(5 + slot);
    text.htab(25 - shown.length);
    text.print(shown);
  }
}
