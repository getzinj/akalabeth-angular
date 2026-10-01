import { BasicNumber } from './basic-number';

// Applesoft arithmetic expressions, evaluated the way FRMEVL does: operators by precedence (^, then
// unary minus, then * and /, then + and -), equal ones left to right, every operation on BasicNumbers.
// Names count for two letters, so DIS and DI are one variable.

export interface IBasicEnvironment {
  variable(name: string): BasicNumber;
  element(name: string, subscripts: readonly number[]): BasicNumber;
}

type Node =
  | { readonly kind: 'number'; readonly text: string }
  | { readonly kind: 'variable'; readonly name: string }
  | { readonly kind: 'element'; readonly name: string; readonly subscripts: readonly Node[] }
  | { readonly kind: 'negate'; readonly operand: Node }
  | { readonly kind: 'binary'; readonly operator: string; readonly left: Node; readonly right: Node }
  | { readonly kind: 'call'; readonly name: string; readonly argument: Node };

const TOKEN: RegExp = /\s*(\d+\.?\d*|\.\d+|[A-Z][A-Z0-9]*%?|[-+*/^(),])/y;
const FUNCTIONS: readonly string[] = [ 'INT', 'ABS', 'SGN', 'SQR', 'ATN' ];
const compiled: Map<string, Node> = new Map<string, Node>();


export function normalizedName(name: string): string {
  const integer: boolean = name.endsWith('%');
  const letters: string = integer ? name.slice(0, -1) : name;

  return letters.slice(0, 2) + (integer ? '%' : '');
}


class Parser {
  private position: number = 0;
  private readonly tokens: string[] = [];

  constructor(private readonly source: string) {
    TOKEN.lastIndex = 0;
    let consumed: number = 0;
    let match: RegExpExecArray | null = TOKEN.exec(source);

    while (match != null) {
      this.tokens.push(match[1]);
      consumed = TOKEN.lastIndex;
      match = TOKEN.exec(source);
    }
    if (consumed !== source.trimEnd().length) {
      throw new SyntaxError(`Cannot read "${ source }"`);
    }
  }


  public expression(): Node {
    let left: Node = this.term();

    while ((this.peek() === '+') || (this.peek() === '-')) {
      const operator: string = this.next();

      left = { kind: 'binary', operator, left, right: this.term() };
    }

    return left;
  }


  public finished(): boolean {
    return this.position >= this.tokens.length;
  }


  private term(): Node {
    let left: Node = this.factor();

    while ((this.peek() === '*') || (this.peek() === '/')) {
      const operator: string = this.next();

      left = { kind: 'binary', operator, left, right: this.factor() };
    }

    return left;
  }


  private factor(): Node {
    let node: Node;

    if (this.peek() === '-') {
      this.next();
      node = { kind: 'negate', operand: this.factor() };
    } else {
      node = this.power();
    }

    return node;
  }


  private power(): Node {
    let left: Node = this.primary();

    while (this.peek() === '^') {
      this.next();
      left = { kind: 'binary', operator: '^', left, right: this.primary() };
    }

    return left;
  }


  private primary(): Node {
    const token: string = this.next();
    let node: Node;

    if (/^[\d.]/.test(token)) {
      node = { kind: 'number', text: token };
    } else if (token === '(') {
      node = this.expression();
      this.expect(')');
    } else if (/^[A-Z]/.test(token)) {
      node = this.named(token);
    } else {
      throw new SyntaxError(`Unexpected "${ token }" in "${ this.source }"`);
    }

    return node;
  }


  private named(token: string): Node {
    let node: Node;

    if (this.peek() === '(') {
      this.next();
      const arguments_: Node[] = [ this.expression() ];

      while (this.peek() === ',') {
        this.next();
        arguments_.push(this.expression());
      }
      this.expect(')');
      node = FUNCTIONS.includes(token) ? { kind: 'call', name: token, argument: arguments_[0] } : { kind: 'element', name: normalizedName(token), subscripts: arguments_ };
    } else {
      node = { kind: 'variable', name: normalizedName(token) };
    }

    return node;
  }


  private peek(): string | undefined {
    return this.tokens[this.position];
  }


  private next(): string {
    const token: string | undefined = this.tokens[this.position];

    if (token == null) {
      throw new SyntaxError(`"${ this.source }" ends too soon`);
    }
    this.position = this.position + 1;

    return token;
  }


  private expect(token: string): void {
    if (this.next() !== token) {
      throw new SyntaxError(`Expected "${ token }" in "${ this.source }"`);
    }
  }
}


function evaluateNode(node: Node, environment: IBasicEnvironment): BasicNumber {
  let value: BasicNumber;

  if (node.kind === 'number') {
    value = BasicNumber.parse(node.text);
  } else if (node.kind === 'variable') {
    value = environment.variable(node.name);
  } else if (node.kind === 'element') {
    value = environment.element(node.name, node.subscripts.map((subscript: Node): number => evaluateNode(subscript, environment).toSubscript()));
  } else if (node.kind === 'negate') {
    value = evaluateNode(node.operand, environment).negated();
  } else if (node.kind === 'call') {
    const argument: BasicNumber = evaluateNode(node.argument, environment);

    const functions: Record<string, () => BasicNumber> = {
      INT: (): BasicNumber => argument.int(), ABS: (): BasicNumber => argument.abs(), SGN: (): BasicNumber => argument.sgn(),
      SQR: (): BasicNumber => argument.sqr(), ATN: (): BasicNumber => argument.atn(),
    };

    value = functions[node.name]();
  } else {
    const left: BasicNumber = evaluateNode(node.left, environment);
    const right: BasicNumber = evaluateNode(node.right, environment);

    const operators: Record<string, () => BasicNumber> = {
      '+': (): BasicNumber => left.plus(right), '-': (): BasicNumber => left.minus(right), '*': (): BasicNumber => left.times(right),
      '/': (): BasicNumber => left.over(right), '^': (): BasicNumber => left.toThe(right),
    };

    value = operators[node.operator]();
  }

  return value;
}


export function evaluateExpression(source: string, environment: IBasicEnvironment): BasicNumber {
  let node: Node | undefined = compiled.get(source);

  if (node == null) {
    const parser: Parser = new Parser(source);

    node = parser.expression();
    if (!parser.finished()) {
      throw new SyntaxError(`"${ source }" has more than one expression`);
    }
    compiled.set(source, node);
  }

  return evaluateNode(node, environment);
}
