"""The Akalabeth listing as logical program lines, with the transcription damage repaired.

AKLABETH.TXT is Applesoft LIST output: long lines wrap onto indented continuation lines, and
the ROM's spacing around tokens is added back. Re-typing it gives the same tokens, because the
tokeniser drops spaces outside strings, DATA and REM.
"""
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Line number -> (damaged text, repaired text, evidence). Each is checked against the listing,
# so a different listing fails loudly instead of being silently "repaired".
CORRECTIONS = {
    1663: (':DAM  ( RND (1) * DAM + C(1) / 5)',
           ':DAM = ( RND (1) * DAM + C(1) / 5)',
           'The "=" was lost in transcription. The CC0 C128 copy (FoxCunning/akalabeth128) reads '
           '"DAM=(RND(1)*DAM + C(1) / 5)", and without it the line is a syntax error.'),
}


def logical_lines(text: str) -> dict:
    lines: dict = {}
    current = None
    for raw in text.replace('\r', '').split('\n'):
        match = re.match(r'^ ?(\d+) (.*)$', raw)
        if match and not raw.startswith('     '):
            current = int(match.group(1))
            lines[current] = match.group(2)
        elif raw.strip() and current is not None:
            lines[current] += raw[5:] if raw.startswith('     ') else raw
    return lines


def corrected_lines() -> dict:
    lines = logical_lines((HERE / 'listing' / 'AKLABETH.TXT').read_text(encoding='latin-1'))
    for number, (damaged, repaired, _evidence) in CORRECTIONS.items():
        if damaged not in lines[number]:
            raise ValueError(f'line {number} no longer contains the damage the correction expects')
        lines[number] = lines[number].replace(damaged, repaired)
    return lines


def crunch(body: str) -> str:
    """Drops the spaces LIST added. The tokeniser ignores them outside quotes, DATA and REM."""
    stripped = body.lstrip()
    if stripped.startswith('DATA') or stripped.startswith('REM'):
        return stripped
    out = ''
    quoted = False
    for character in body:
        if character == '"':
            quoted = not quoted
        if quoted or character != ' ':
            out += character
    return out


def program_text() -> list:
    """Lines as they would be typed at the ] prompt, short enough for GETLN's 239-character limit."""
    return [f'{number}{crunch(body)}' for number, body in sorted(corrected_lines().items())]
