"""An Apple II+ in py65, enough to type in and run Akalabeth: 48 KB of RAM, the Applesoft and
autostart Monitor ROMs from build-rom.sh, the keyboard latch and the display switches.

Keys come from a script. One is latched whenever the program is polling the keyboard with
nothing waiting, which is the moment the original was waiting for the player, and each time
the machine's state is recorded first.
"""
from pathlib import Path

from py65.devices.mpu6502 import MPU

HERE = Path(__file__).resolve().parent

KBD = 0xC000
KBDSTRB = 0xC010
TXTTAB = 0x67
VARTAB = 0x69
ARYTAB = 0x6B
STREND = 0x6D

POLLS_BEFORE_KEY = 30
# The Monitor looks at the keyboard for Ctrl-S each time it prints a carriage return (VIDWAIT's
# LDY KBD); that is not the program waiting for a key.
VIDWAIT_READ = 0xFB7C


def text_row_address(row: int) -> int:
    return 0x400 + ((row & 7) << 7) + (row >> 3) * 40


def screen_character(code: int) -> str:
    low = code & 0x3F
    return chr(low + 0x40 if low < 0x20 else low)


class Memory:
    """RAM below $C000, I/O at $C000-$C0FF, ROM above, as py65 indexes it."""

    def __init__(self, machine: 'Apple2') -> None:
        self.machine = machine
        self.ram = bytearray(0x10000)
        rom = (HERE / 'rom' / 'applesoft.bin').read_bytes() + (HERE / 'rom' / 'monitor.bin').read_bytes()
        self.ram[0xD000:0x10000] = rom

    def __getitem__(self, address):
        if isinstance(address, slice):
            return [self[index] for index in range(*address.indices(0x10000))]
        if 0xC000 <= address < 0xC100:
            return self.machine.io_read(address)
        return self.ram[address]

    def __setitem__(self, address, value) -> None:
        if isinstance(address, slice):
            for index, byte in zip(range(*address.indices(0x10000)), value):
                self[index] = byte
        elif address < 0xC000:
            self.ram[address] = value & 0xFF
        elif address < 0xC100:
            self.machine.io_read(address)

    def __len__(self) -> int:
        return 0x10000


class Apple2:
    def __init__(self) -> None:
        self.memory = Memory(self)
        self.mpu = MPU(memory=self.memory)
        self.keyboard = 0
        self.keys: list = []
        self.polls = 0
        self.graphics = False
        self.mixed = False
        self.page2 = False
        self.hires = False
        self.on_key = None
        self.current_pc = 0
        self.iscntc = self._label('ISCNTC')
        self.error = self._label('ERROR')
        self.on_error = None

    @staticmethod
    def _label(name: str) -> int:
        for line in (HERE / 'rom' / 'applesoft.labels').read_text().splitlines():
            parts = [part.strip() for part in line.split(',')]
            if parts[0] == name:
                return int(parts[1], 16) + 0xD000
        raise KeyError(name)

    # --- I/O ---

    def io_read(self, address: int) -> int:
        if address == KBD:
            # Applesoft looks for Ctrl-C after every statement and the Monitor for Ctrl-S after every
            # carriage return; only reads that wait count.
            if self.keyboard < 0x80 and self.current_pc not in (self.iscntc, VIDWAIT_READ):
                self.polls += 1
                if self.polls >= POLLS_BEFORE_KEY and self.keys:
                    self.latch_next_key()
            return self.keyboard
        if address == KBDSTRB:
            self.keyboard &= 0x7F
            return 0
        switches = {0xC050: ('graphics', True), 0xC051: ('graphics', False), 0xC052: ('mixed', False),
                    0xC053: ('mixed', True), 0xC054: ('page2', False), 0xC055: ('page2', True),
                    0xC056: ('hires', False), 0xC057: ('hires', True)}
        if address in switches:
            name, value = switches[address]
            setattr(self, name, value)
        return 0

    def latch_next_key(self) -> None:
        key = self.keys.pop(0)
        if self.on_key is not None:
            self.on_key(key)
        self.keyboard = key | 0x80
        self.polls = 0

    # --- running ---

    def reset(self) -> None:
        self.mpu.reset()
        self.mpu.pc = self.memory.ram[0xFFFC] | (self.memory.ram[0xFFFD] << 8)

    def run_until_idle(self, limit: int = 400_000_000) -> None:
        """Runs until the keys run out and the program is waiting for another."""
        mpu = self.mpu
        step = mpu.step
        error = self.error
        for _ in range(limit):
            pc = mpu.pc
            self.current_pc = pc
            if pc == error and self.on_error is not None:
                self.on_error({'code': mpu.x, 'line': self.word(0x75)})
            step()
            if self.polls > POLLS_BEFORE_KEY and not self.keys:
                return
        raise RuntimeError('ran out of steps')

    def type_text(self, text: str) -> None:
        self.keys.extend(ord(character) for character in text.upper())
        self.run_until_idle()

    # --- saving and restoring ---

    def snapshot(self) -> dict:
        return {'ram': bytes(self.memory.ram), 'registers': (self.mpu.pc, self.mpu.sp, self.mpu.a, self.mpu.x,
                                                             self.mpu.y, self.mpu.p),
                'switches': (self.graphics, self.mixed, self.page2, self.hires), 'keyboard': self.keyboard}

    def restore(self, state: dict) -> None:
        self.memory.ram[:] = state['ram']
        self.mpu.pc, self.mpu.sp, self.mpu.a, self.mpu.x, self.mpu.y, self.mpu.p = state['registers']
        self.graphics, self.mixed, self.page2, self.hires = state['switches']
        self.keyboard = state['keyboard']
        self.keys = []
        self.polls = 0

    # --- what is on the screen and in memory ---

    def text_lines(self) -> list:
        return [''.join(screen_character(self.memory.ram[text_row_address(row) + column]) for column in range(40))
                for row in range(24)]

    def inverse_mask(self) -> list:
        return [''.join('1' if self.memory.ram[text_row_address(row) + column] < 0x40 else '0' for column in range(40))
                for row in range(24)]

    def hires_page(self) -> bytes:
        return bytes(self.memory.ram[0x2000:0x4000])

    def word(self, address: int) -> int:
        return self.memory.ram[address] | (self.memory.ram[address + 1] << 8)

    def program_line_numbers(self) -> list:
        numbers = []
        link = self.word(TXTTAB)
        while self.word(link) != 0:
            numbers.append(self.word(link + 2))
            link = self.word(link)
        return numbers

    def arrays(self) -> dict:
        """Every array, by its two-character name with % or $ appended, as nested lists."""
        found = {}
        address = self.word(ARYTAB)
        end = self.word(STREND)
        while address < end:
            first, second = self.memory.ram[address], self.memory.ram[address + 1]
            size = self.word(address + 2)
            dimensions = self.memory.ram[address + 4]
            # Applesoft stores the extents last subscript first, high byte first.
            extents = [(self.memory.ram[address + 5 + 2 * index] << 8) | self.memory.ram[address + 6 + 2 * index]
                       for index in range(dimensions)][::-1]
            integer = (first & 0x80) != 0 and (second & 0x80) != 0
            text = (first & 0x80) == 0 and (second & 0x80) != 0
            name = chr(first & 0x7F) + (chr(second & 0x7F) if (second & 0x7F) else '')
            name += '%' if integer else ('$' if text else '')
            data = address + 5 + 2 * dimensions
            width = 2 if integer else (3 if text else 5)
            count = 1
            for extent in extents:
                count *= extent
            values = []
            for index in range(count):
                cell = data + index * width
                if integer:
                    value = (self.memory.ram[cell] << 8) | self.memory.ram[cell + 1]
                    values.append(value - 0x10000 if value >= 0x8000 else value)
                elif text:
                    length = self.memory.ram[cell]
                    pointer = self.word(cell + 1)
                    values.append(bytes(self.memory.ram[pointer:pointer + length]).decode('latin-1'))
                else:
                    values.append(''.join(f'{byte:02X}' for byte in self.memory.ram[cell:cell + 5]))
            found[name] = {'extents': extents, 'values': values}
            address += size
        return found

    def set_simple_variable(self, name: str, packed: bytes) -> None:
        """Overwrites an existing real variable in place, as a debugger would."""
        address = self.word(VARTAB)
        end = self.word(ARYTAB)
        while address < end:
            first, second = self.memory.ram[address], self.memory.ram[address + 1]
            found = chr(first & 0x7F) + (chr(second & 0x7F) if (second & 0x7F) else '')
            if found == name and not (first & 0x80) and not (second & 0x80):
                self.memory.ram[address + 2:address + 7] = packed
                return
            address += 7
        raise KeyError(name)

    def simple_variables(self) -> dict:
        found = {}
        address = self.word(VARTAB)
        end = self.word(ARYTAB)
        while address < end:
            first, second = self.memory.ram[address], self.memory.ram[address + 1]
            name = chr(first & 0x7F) + (chr(second & 0x7F) if (second & 0x7F) else '')
            body = self.memory.ram[address + 2:address + 7]
            if (first & 0x80) and (second & 0x80):
                value = (body[0] << 8) | body[1]
                found[name + '%'] = value - 0x10000 if value >= 0x8000 else value
            elif second & 0x80:
                pointer = body[1] | (body[2] << 8)
                found[name + '$'] = bytes(self.memory.ram[pointer:pointer + body[0]]).decode('latin-1')
            else:
                found[name] = ''.join(f'{byte:02X}' for byte in body)
            address += 7
        return found
