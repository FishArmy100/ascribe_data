import struct
from sys import stdout
from typing import List, Tuple

def print_progress_bar(iteration: int, total: int, length: int=40):
    percent = f"{100 * (iteration / float(total)):.1f}"
    filled_length = int(length * iteration // total)
    bar = '█' * filled_length + '-' * (length - filled_length)
    stdout.write(f'\rProgress: |{bar}| {percent}% ({iteration}/{total})')
    stdout.flush()
    if iteration == total:
        print()

def parse_index(idx_path: str) -> List[Tuple[str, int, int]]:
    """
    Parse a Sword dictionary .idx file.

    Args:
        idx_path: Path to the .idx file.

    Returns:
        A list of (key, offset, size) tuples.
    """
    entries: List[Tuple[str, int, int]] = []

    with open(idx_path, "rb") as f:
        while True:
            # Read key until NULL byte
            key_bytes = bytearray()
            while True:
                b = f.read(1)
                if not b:  # EOF
                    return entries
                if b == b"\x00":
                    break
                key_bytes.extend(b)

            key: str = key_bytes.decode("utf-8", errors="replace")

            # Read offset and size (4 bytes each, little endian)
            data: bytes = f.read(8)
            if len(data) < 8:
                break

            offset, size = struct.unpack("<II", data)
            entries.append((key, offset, size))

    return entries


def extract_entries(idx_path: str, dat_path: str, output_file: str) -> None:
    """
    Extract all dictionary entries from a Sword module.

    Args:
        idx_path: Path to the .idx file.
        dat_path: Path to the .dat file.
        output_file: Path to the output text file.
    """
    entries: List[Tuple[str, int, int]] = parse_index(idx_path)

    with open(dat_path, "rb") as dat, open(output_file, "w", encoding="utf-8") as out:
        for i, (key, offset, size) in enumerate(entries):
            dat.seek(offset)
            text_bytes: bytes = dat.read(size)
            text: str = text_bytes.decode("utf-8", errors="replace").strip()

            out.write(f"==== {key} ====\n")
            out.write(text)
            out.write("\n\n")

            print_progress_bar(i, len(entries), length=50)


if __name__ == "__main__":
    output_file: str = "smiths.txt"

    extract_entries("./smith.idx", "./smith.dat", output_file)

    print(f"Done! Extracted entries to {output_file}")
