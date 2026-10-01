"""Calls into the real Applesoft II ROM, running in py65, to record what its arithmetic does.

Offline only: needs rom/applesoft.bin from build-rom.sh. Values cross the boundary as the
seven-byte FAC image: exponent, four mantissa bytes (bit 7 of the first is the leading 1),
sign byte, rounding extension.
"""
from pathlib import Path

from py65.devices.mpu6502 import MPU

HERE = Path(__file__).resolve().parent
ROM_BASE = 0xD000

FAC = 0x9D
FAC_SIGN = 0xA2
ARG = 0xA5
ARG_SIGN = 0xAA
SGNCPR = 0xAB
FAC_EXTENSION = 0xAC
TXTPTR = 0xB8
CHRGET = 0xB1

STUB = 0x0300
TEXT = 0x0800
SCRATCH = 0x0900


def _labels() -> dict:
    labels = {}
    for line in (HERE / 'rom' / 'applesoft.labels').read_text().splitlines():
        parts = [part.strip() for part in line.split(',')]
        if len(parts) >= 4:
            value = int(parts[1], 16)
            labels[parts[0]] = value + ROM_BASE if parts[3] == '0x0002' else value
    return labels


class ApplesoftError(Exception):
    """The ROM reached its ERROR routine; the X register holds the error code."""


class Applesoft:
    def __init__(self) -> None:
        self.labels = _labels()
        self.mpu = MPU()
        rom = (HERE / 'rom' / 'applesoft.bin').read_bytes()
        self.mpu.memory[ROM_BASE:ROM_BASE + len(rom)] = list(rom)
        chrget = self.labels['GENERIC_CHRGET']
        end = self.labels['GENERIC_END']
        # COLD.START copies CHRGET and all but the last byte of the seed into page zero.
        for offset in range(end - chrget - 1):
            self.mpu.memory[CHRGET + offset] = self.mpu.memory[chrget + offset]

    # --- machine plumbing ---

    def call(self, address: int, a: int = 0, x: int = 0, y: int = 0, preload_fac_flags: bool = False) -> None:
        code = []
        if preload_fac_flags:
            code += [0xA5, FAC]                 # LDA FAC: A = exponent, Z set when zero
        code += [0x20, address & 0xFF, address >> 8]
        done = STUB + len(code)
        code += [0x4C, done & 0xFF, done >> 8]  # JMP * as the trap
        self.mpu.memory[STUB:STUB + len(code)] = code
        self.mpu.pc = STUB
        self.mpu.a, self.mpu.x, self.mpu.y = a, x, y
        self.mpu.sp = 0xF0
        error = self.labels['ERROR']
        for _ in range(2_000_000):
            if self.mpu.pc == done:
                return
            if self.mpu.pc == error:
                raise ApplesoftError(self.mpu.x)
            self.mpu.step()
        raise RuntimeError(f'call to {address:04X} did not return')

    def fac(self) -> list:
        m = self.mpu.memory
        return [m[FAC], m[FAC + 1], m[FAC + 2], m[FAC + 3], m[FAC + 4], m[FAC_SIGN], m[FAC_EXTENSION]]

    def set_fac(self, image: list) -> None:
        m = self.mpu.memory
        for offset in range(5):
            m[FAC + offset] = image[offset]
        m[FAC_SIGN] = image[5]
        m[FAC_EXTENSION] = image[6]

    def set_arg(self, image: list) -> None:
        m = self.mpu.memory
        for offset in range(5):
            m[ARG + offset] = image[offset]
        m[ARG_SIGN] = image[5]

    # --- the ROM's own entry points ---

    def fin(self, text: str) -> list:
        data = [ord(character) for character in text] + [0]
        self.mpu.memory[TEXT:TEXT + len(data)] = data
        start = TEXT - 1
        self.mpu.memory[TXTPTR] = start & 0xFF
        self.mpu.memory[TXTPTR + 1] = start >> 8
        self.call(CHRGET)
        flags = self.mpu.p
        a = self.mpu.a
        code = [0x20, self.labels['FIN'] & 0xFF, self.labels['FIN'] >> 8]
        done = STUB + len(code)
        code += [0x4C, done & 0xFF, done >> 8]
        self.mpu.memory[STUB:STUB + len(code)] = code
        self.mpu.pc, self.mpu.a, self.mpu.p, self.mpu.sp = STUB, a, flags, 0xF0
        while self.mpu.pc != done:
            self.mpu.step()
        return self.fac()

    def fout(self, image: list) -> str:
        self.set_fac(image)
        self.call(self.labels['FOUT'])
        address = self.mpu.a | (self.mpu.y << 8)
        text = ''
        while self.mpu.memory[address] != 0:
            text += chr(self.mpu.memory[address] & 0x7F)
            address += 1
        return text

    def round_fac(self, image: list) -> list:
        self.set_fac(image)
        self.call(self.labels['ROUND_FAC'])
        return self.fac()

    def binary(self, operation: str, left: list, right: list) -> list:
        """FRMEVL's PERFORM: left was pushed rounded, right sits in FAC as computed."""
        pushed = self.round_fac(left)
        self.set_arg(pushed)
        self.set_fac(right)
        self.mpu.memory[SGNCPR] = pushed[5] ^ right[5]
        performer = {'+': 'FADDT', '-': 'FSUBT', '*': 'FMULTT', '/': 'FDIVT', '^': 'FPWRT'}[operation]
        self.call(self.labels[performer], preload_fac_flags=True)
        return self.fac()

    def function(self, name: str, argument: list) -> list:
        self.set_fac(argument)
        self.call(self.labels[name], preload_fac_flags=True)
        return self.fac()

    def seed(self) -> list:
        m = self.mpu.memory
        return [m[0xC9 + offset] for offset in range(5)]
