import xml.etree.ElementTree as ET
import re

# Mapping from common Bible book names to OSIS abbreviations
BOOK_MAP = {
    "Genesis": "Gen",
    "Exodus": "Exod",
    "Leviticus": "Lev",
    "Numbers": "Num",
    "Deuteronomy": "Deut",
    "Joshua": "Josh",
    "Judges": "Judg",
    "Ruth": "Ruth",
    "1 Samuel": "1Sam",
    "2 Samuel": "2Sam",
    "1 Kings": "1Kgs",
    "2 Kings": "2Kgs",
    "1 Chronicles": "1Chr",
    "2 Chronicles": "2Chr",
    "Ezra": "Ezra",
    "Nehemiah": "Neh",
    "Esther": "Esth",
    "Job": "Job",
    "Psalm": "Ps",
    "Psalms": "Ps",
    "Proverbs": "Prov",
    "Ecclesiastes": "Eccl",
    "Song of Solomon": "Song",
    "Isaiah": "Isa",
    "Jeremiah": "Jer",
    "Lamentations": "Lam",
    "Ezekiel": "Ezek",
    "Daniel": "Dan",
    "Hosea": "Hos",
    "Joel": "Joel",
    "Amos": "Amos",
    "Obadiah": "Obad",
    "Jonah": "Jonah",
    "Micah": "Mic",
    "Nahum": "Nah",
    "Habakkuk": "Hab",
    "Zephaniah": "Zeph",
    "Haggai": "Hag",
    "Zechariah": "Zech",
    "Malachi": "Mal",
    "Matthew": "Matt",
    "Mark": "Mark",
    "Luke": "Luke",
    "John": "John",
    "Acts": "Acts",
    "Romans": "Rom",
    "1 Corinthians": "1Cor",
    "2 Corinthians": "2Cor",
    "Galatians": "Gal",
    "Ephesians": "Eph",
    "Philippians": "Phil",
    "Colossians": "Col",
    "1 Thessalonians": "1Thess",
    "2 Thessalonians": "2Thess",
    "1 Timothy": "1Tim",
    "2 Timothy": "2Tim",
    "Titus": "Titus",
    "Philemon": "Phlm",
    "Hebrews": "Heb",
    "James": "Jas",
    "1 Peter": "1Pet",
    "2 Peter": "2Pet",
    "1 John": "1John",
    "2 John": "2John",
    "3 John": "3John",
    "Jude": "Jude",
    "Revelation": "Rev"
}

def format_passage(passage: str) -> str:
    passage = passage.strip()

    # 1. Handle book ranges: e.g., "2 John-3 John"
    match = re.match(r'(\d?\s?\w+)\s*-\s*(\d?\s?\w+)', passage)
    if match and any(c.isalpha() for c in match.group(2)):
        start_book = BOOK_MAP.get(match.group(1), match.group(1))
        end_book = BOOK_MAP.get(match.group(2), match.group(2))
        return f"{start_book}-{end_book}"

    # 2. Handle chapter ranges within the same book: "Genesis 1-2"
    match = re.match(r'(.+?)\s+(\d+)\s*-\s*(\d+)$', passage)
    if match:
        book = BOOK_MAP.get(match.group(1).strip(), match.group(1).strip())
        return f"{book}.{match.group(2)}-{book}.{match.group(3)}"

    # 3. Handle verse ranges in a chapter: "Psalm 119:1-40"
    match = re.match(r'(.+?)\s+(\d+):(\d+)-(\d+)$', passage)
    if match:
        book = BOOK_MAP.get(match.group(1).strip(), match.group(1).strip())
        chapter = match.group(2)
        return f"{book}.{chapter}.{match.group(3)}-{book}.{chapter}.{match.group(4)}"

    # 4. Single chapter or chapter:verse
    match = re.match(r'(.+?)\s+([\d:]+)$', passage)
    if match:
        book = BOOK_MAP.get(match.group(1).strip(), match.group(1).strip())
        ref = match.group(2).replace(":", ".")
        return f"{book}.{ref}"

    # 5. Only book
    return BOOK_MAP.get(passage.strip(), passage.strip())


def main():
    tree = ET.parse("./rr.xml")
    root = tree.getroot()

    readings: list[list[str]] = []

    for month in root:
        for day in month:
            readings.append([])
            for reading in day:
                passage = reading.attrib["passage"]
                readings[-1].append(format_passage(passage))


    entries: list[str] = []
    for i, reading in enumerate(readings):
        readings_list = ", ".join(map(lambda x : f"\"{x}\"", reading))
        entries.append(f"{{ \"id\": {i}, \"index\": {i}, \"readings\": [ {readings_list} ] }}")

    with open('rr.jsonl', 'w') as file:
        for row in entries:
            file.write(row + "\n")




if __name__ == "__main__":
    main()