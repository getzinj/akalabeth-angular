"""Writes the numeric fixtures the TypeScript port of the math package is checked against.

Usage: ./build-rom.sh && python3 generate_numeric_fixtures.py
"""
import json
import random
from pathlib import Path

from applesoft_rom import Applesoft, ApplesoftError

OUT = Path(__file__).resolve().parents[2] / 'src' / 'app' / 'runtime' / 'applesoft' / 'fixtures'
rng = random.Random(1979)
rom = Applesoft()


def hexes(image: list) -> str:
    return ''.join(f'{byte:02X}' for byte in image)


def random_image(low: int = 0x70, high: int = 0x90, extension: bool = True) -> list:
    if rng.random() < 0.03:
        return [0, 0, 0, 0, 0, 0, 0]
    exponent = rng.randint(low, high)
    mantissa = [rng.randint(0x80, 0xFF)] + [rng.randint(0, 0xFF) for _ in range(3)]
    sign = rng.choice([0x00, 0xFF])
    return [exponent] + mantissa + [sign, rng.randint(0, 0xFF) if extension else 0]


def positive(image: list) -> list:
    return image[:5] + [0x00] + image[6:]


def decimal_texts(count: int) -> list:
    texts = ['0', '1', '-1', '.5', '.1', '4.5', '31.4', '1000', '25', '21', '0.9', '1E10', '1E-10',
             '99999999', '999999999', '1.7E38', '2.9E-39', '.000001', '123456789', '3.14159265']
    while len(texts) < count:
        kind = rng.random()
        if kind < 0.3:
            texts.append(str(rng.randint(-100000, 100000)))
        elif kind < 0.7:
            texts.append(f'{rng.uniform(-1000, 1000):.{rng.randint(1, 9)}f}')
        else:
            texts.append(f'{rng.uniform(1, 9.99):.{rng.randint(1, 8)}f}E{rng.randint(-30, 30)}')
    return texts


def attempt(compute):
    try:
        return compute()
    except ApplesoftError:
        return None


def write(name: str, cases: list) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{name}.json').write_text(json.dumps(cases, separators=(',', ':')) + '\n')
    print(f'{name}: {len(cases)} cases')


write('fin', [[text, hexes(rom.fin(text))] for text in decimal_texts(400)])

fout_inputs = [rom.round_fac(random_image(0x60, 0xA8)) for _ in range(400)]
write('fout', [[hexes(image), rom.fout(image)] for image in fout_inputs])

write('round', [[hexes(image), hexes(rom.round_fac(image))] for image in [random_image() for _ in range(300)]])

binary_cases = []
for operation in ['+', '-', '*', '/']:
    for _ in range(400):
        left, right = random_image(0x60, 0xA0), random_image(0x60, 0xA0)
        if rng.random() < 0.25:
            right = left[:5] + [rng.choice([left[5], left[5] ^ 0xFF])] + right[6:]
        result = attempt(lambda: rom.binary(operation, left, right))
        if result is not None:
            binary_cases.append([operation, hexes(left), hexes(right), hexes(result)])
for _ in range(200):
    base, power = positive(random_image(0x7C, 0x86)), random_image(0x7C, 0x83)
    result = attempt(lambda: rom.binary('^', base, power))
    if result is not None:
        binary_cases.append(['^', hexes(base), hexes(power), hexes(result)])
write('binary', binary_cases)

function_cases = []
for name, make in [('INT', lambda: random_image(0x70, 0xA8)), ('SQR', lambda: positive(random_image(0x60, 0xA0))),
                   ('ATN', lambda: random_image(0x70, 0x90)), ('LOG', lambda: positive(random_image(0x60, 0xA0))),
                   ('EXP', lambda: random_image(0x70, 0x86)), ('ABS', lambda: random_image()),
                   ('SGN', lambda: random_image()), ('NEGOP', lambda: random_image())]:
    for _ in range(200):
        argument = make()
        result = attempt(lambda: rom.function(name, argument))
        if result is not None:
            function_cases.append([name, hexes(argument), hexes(result)])
write('function', function_cases)

rnd_cases = []
seeds = [rom.fin(text) for text in ['-1', '-2', '-42', '-1979', '-0.5', '-123.456', '-65535', '-99999']]
for lucky in range(1, 16):
    for tx, ty, inout in [(rng.randint(1, 19), rng.randint(1, 19), rng.randint(1, 10)) for _ in range(2)]:
        value = rom.binary('-', rom.function('NEGOP', rom.fin(str(lucky))), rom.binary('*', rom.fin(str(tx)), rom.fin('10')))
        value = rom.binary('-', value, rom.binary('*', rom.fin(str(ty)), rom.fin('1000')))
        seeds.append(rom.binary('+', value, rom.binary('*', rom.fin(str(inout)), rom.fin('31.4'))))
for seed in seeds:
    first = rom.function('RND', seed)
    sequence = [hexes(rom.function('RND', rom.fin('1'))) for _ in range(40)]
    repeat = rom.function('RND', rom.fin('0'))
    rnd_cases.append([hexes(seed), hexes(first), sequence, hexes(repeat)])
write('rnd', rnd_cases)
