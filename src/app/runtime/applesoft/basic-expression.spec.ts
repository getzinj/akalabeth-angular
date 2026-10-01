import type { IBasicEnvironment } from './basic-expression';
import { evaluateExpression, normalizedName } from './basic-expression';
import { BasicNumber } from './basic-number';

const environment: IBasicEnvironment = {
  variable: (name: string): BasicNumber => BasicNumber.of(({ C: 139, DI: 3, B: 100 } as Record<string, number>)[name] ?? 0),
  element: (name: string, subscripts: readonly number[]): BasicNumber => BasicNumber.of((name === 'YY%') ? 40 + subscripts[0] : 0),
};


function print(source: string): string {
  return evaluateExpression(source, environment).print();
}


describe('evaluateExpression', (): void => {
  it('multiplies before it adds', (): void => {
    expect(print('2 + 3 * 4')).toBe('14');
  });

  it('works left to right at one precedence', (): void => {
    expect(print('100 - 30 - 20')).toBe('50');
  });

  it('divides before it subtracts, as in C - 15 / DIS', (): void => {
    expect(print('C - 15 / DI')).toBe('134');
  });

  it('keeps a fraction until the end', (): void => {
    expect(print('C - 2 / DI + .5')).toBe('138.833333');
  });

  it('raises to a power before it negates', (): void => {
    expect(print('-2 ^ 2')).toBe('-4');
  });

  it('reads parentheses', (): void => {
    expect(print('(2 + 3) * 4')).toBe('20');
  });

  it('reads a subscripted integer array', (): void => {
    expect(print('79 + YY%(DI)')).toBe('122');
  });

  it('calls INT', (): void => {
    expect(print('INT(7 / 2)')).toBe('3');
  });

  it('refuses text it cannot read', (): void => {
    expect((): BasicNumber => evaluateExpression('2 +* 3', environment)).toThrow(SyntaxError);
  });

  it('counts only two letters of a name', (): void => {
    expect(normalizedName('DIS')).toBe('DI');
  });

  it('keeps the percent sign of an integer name', (): void => {
    expect(normalizedName('PER%')).toBe('PE%');
  });
});
