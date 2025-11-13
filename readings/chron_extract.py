import json
import re

BOOK_MAP = {
    "Genesis": "Gen",
    "Exodus": "Exod",
    "Leviticus": "Lev",
    "Numbers": "Num",
    "Deuteronomy": "Deut",
    "Joshua": "Josh",
    "Judges": "Judg",
    "Ruth": "Ruth",
    "1Samuel": "1Sam",
    "2Samuel": "2Sam",
    "1Kings": "1Kgs",
    "2Kings": "2Kgs",
    "1Chronicles": "1Chr",
    "2Chronicles": "2Chr",
    "Ezra": "Ezra",
    "Nehemiah": "Neh",
    "Esther": "Esth",
    "Job": "Job",
    "Psalm": "Ps",
    "Psalms": "Ps",
    "Proverbs": "Prov",
    "Ecclesiastes": "Eccl",
    "SongOfSongs": "Song",
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
    "1Corinthians": "1Cor",
    "2Corinthians": "2Cor",
    "Galatians": "Gal",
    "Ephesians": "Eph",
    "Philippians": "Phil",
    "Colossians": "Col",
    "1 Thes": "1Thess",
    "2 Thes": "2Thess",
    "1Timothy": "1Tim",
    "2Timothy": "2Tim",
    "Titus": "Titus",
    "Philemon": "Phlm",
    "Hebrews": "Heb",
    "James": "Jas",
    "1Peter": "1Pet",
    "2Peter": "2Pet",
    "1John": "1John",
    "2John": "2John",
    "3John": "3John",
    "Jude": "Jude",
    "Revelation": "Rev"
}

def format_passage(passage: str) -> str:
    passage = passage.strip()

    # 1. Handle book ranges: e.g., "2 John-3 John"
    match = re.match(r'(\d?\s?\w+)\s*-\s*(\d?\s?\w+)', passage)
    if match and any(c.isalpha() for c in match.group(2)):
        start_book = BOOK_MAP.get(match.group(1).replace(" ", ""), match.group(1).replace(" ", ""))
        end_book = BOOK_MAP.get(match.group(2).replace(" ", ""), match.group(2).replace(" ", ""))
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
    
    # 4. Handle verse ranges across chapters: "1Kings 15:25-16:34"
    match = re.match(r'(.+?)\s+(\d+):(\d+)-\s+(\d+):(\d+)$', passage)
    if match:
        book = BOOK_MAP.get(match.group(1).strip(), match.group(1).strip())
        start_chapter = match.group(2).strip()
        start_verse = match.group(3).strip()
        end_chapter = match.group(4).strip()
        end_verse = match.group(5).strip()
        return f"{book}.{start_chapter}.{start_verse}-{book}.{end_chapter}.{end_verse}"

    # 5. Single chapter or chapter:verse
    match = re.match(r'(.+?)\s+([\d:]+)$', passage)
    if match:
        book = BOOK_MAP.get(match.group(1).strip(), match.group(1).strip())
        ref = match.group(2).replace(":", ".")
        return f"{book}.{ref}"

    # 6. Only book
    return BOOK_MAP.get(passage.strip(), passage.strip())


def main():
    with open("chron.json", "r") as file:
        chron = json.load(file)
    readings: list[list[str]] = []
    data: list[list[str]] = chron["data2"]
    for day in data:
        readings.append([])
        for r in day:
            readings[-1].append(format_passage(r))


    entries: list[str] = []
    for i, reading in enumerate(readings):
        readings_list = ", ".join(map(lambda x : f"\"{x}\"", reading))
        entries.append(f"{{ \"id\": {i}, \"index\": {i}, \"readings\": [ {readings_list} ] }}")

    with open('chron.jsonl', 'w') as file:
        for row in entries:
            file.write(row + "\n")


if __name__ == "__main__":
    main()