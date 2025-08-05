import sys
import os
import csv
from typing import List, Tuple, Union

osis_books = [
    "Gen", "Exod", "Lev", "Num", "Deut",
    "Josh", "Judg", "Ruth", "1Sam", "2Sam",
    "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra",
    "Neh", "Esth", "Job", "Ps", "Prov",
    "Eccl", "Song", "Isa", "Jer", "Lam",
    "Ezek", "Dan", "Hos", "Joel", "Amos",
    "Obad", "Jonah", "Mic", "Nah", "Hab",
    "Zeph", "Hag", "Zech", "Mal",
    "Matt", "Mark", "Luke", "John", "Acts",
    "Rom", "1Cor", "2Cor", "Gal", "Eph",
    "Phil", "Col", "1Thess", "2Thess", "1Tim",
    "2Tim", "Titus", "Phlm", "Heb", "Jas",
    "1Pet", "2Pet", "1John", "2John", "3John",
    "Jude", "Rev"
]

tsk_to_osis = {
    "ge": "Gen",
    "ex": "Exod",
    "le": "Lev",
    "nu": "Num",
    "de": "Deut",
    "jos": "Josh",
    "jud": "Judg",
    "ru": "Ruth",
    "1sa": "1Sam",
    "2sa": "2Sam",
    "1ki": "1Kgs",
    "2ki": "2Kgs",
    "1ch": "1Chr",
    "2ch": "2Chr",
    "ezr": "Ezra",
    "ne": "Neh",
    "es": "Esth",
    "job": "Job",
    "ps": "Ps",
    "pr": "Prov",
    "ec": "Eccl",
    "so": "Song",
    "isa": "Isa",
    "jer": "Jer",
    "la": "Lam",
    "eze": "Ezek",
    "da": "Dan",
    "ho": "Hos",
    "joe": "Joel",
    "am": "Amos",
    "ob": "Obad",
    "jon": "Jonah",
    "mic": "Mic",
    "na": "Nah",
    "hab": "Hab",
    "zep": "Zeph",
    "hag": "Hag",
    "zec": "Zech",
    "mal": "Mal",
    "mt": "Matt",
    "mr": "Mark",
    "lu": "Luke",
    "joh": "John",
    "ac": "Acts",
    "ro": "Rom",
    "1co": "1Cor",
    "2co": "2Cor",
    "ga": "Gal",
    "eph": "Eph",
    "php": "Phil",
    "col": "Col",
    "1th": "1Thess",
    "2th": "2Thess",
    "1ti": "1Tim",
    "2ti": "2Tim",
    "tit": "Titus",
    "phm": "Phlm",
    "heb": "Heb",
    "jas": "Jas",
    "1pe": "1Pet",
    "2pe": "2Pet",
    "1jo": "1John",
    "2jo": "2John",
    "3jo": "3John",
    "jude": "Jude",
    "re": "Rev"
}

Verse = Tuple[str, int, Union[int, Tuple[int, int], List[int]]]
def parse_tsk_verse(ref: str) -> List[Verse]:
    book_pair = ref.split()

    if len(book_pair) != 2:
        print(ref)

    book = book_pair[0]
    chapter_pair = book_pair[1].split(':')

    if not chapter_pair[0].isdecimal():
        print(ref)

    chapter = int(chapter_pair[0])
    if chapter_pair[1].isdecimal():
        return [(book, chapter, int(chapter_pair[1]))]
    
    verses = chapter_pair[1].split(",")
    if len(verses) > 1:
        ret_verses: List[Verse] = []
        for verse in verses:
            verses = verse.split('-')
            if len(verses) == 2:
                ret_verses.append((book, chapter, (int(verses[0]), int(verses[1]))))
            elif len(verses) == 1:
                ret_verses.append((book, chapter, int(verses[0])))
            else:
                raise RuntimeError("Unknown reference format: " + ref)
        
        return ret_verses
    
    verse_range = chapter_pair[1].split("-")
    if len(verse_range) == 2:
        return [(book, chapter, (int(verse_range[0]), int(verse_range[1])))]
    
    raise RuntimeError("Unknown reference format: " + ref)

def format_ref_id(book: int, chapter: int, verse: int) -> str:
    return f"{osis_books[book - 1]}.{chapter}.{verse}"

     

if len(sys.argv) < 2:
    raise RuntimeError("You must pass a file path")
elif len(sys.argv) > 2:
    raise RuntimeError("More than 1 argument was supplied")

path = sys.argv[1]

if not os.path.isfile(path):
    raise RuntimeError(f"File path {path} is not a valid path")

_, ext = os.path.splitext(path)
if not ext == ".csv":
    raise RuntimeError(f"File path {path} is not a json csv")

print(f"Reading file: {path}...")
data: list[list[str]] = []
with open(path, 'r', newline='') as f:
    reader = csv.reader(f, delimiter="\t")
    for row in reader:
        data.append(row)

print("Writing to file: out.jsonl...")

with open('out.jsonl', 'w') as file:
    for row in data:
        book_index = int(row[0])
        chapter_index = int(row[1])
        verse_index = int(row[2])
        source = format_ref_id(book_index, chapter_index, verse_index)

        source_text = row[4].replace("\"", "\\\"")
        refs = row[5].split(";")
        
        targets: List[str] = []
        for ref in refs:
            for (book, chapter, verses) in parse_tsk_verse(ref):
                if isinstance(verses, int):
                    targets.append(f"{tsk_to_osis[book]}.{chapter}.{verses}")
                elif isinstance(verses, Tuple):
                    targets.append(f"{tsk_to_osis[book]}.{chapter}.{verses[0]}-{tsk_to_osis[book]}.{chapter}.{verses[1]}")
                else:
                    for verse in verses:
                        targets.append(f"{tsk_to_osis[book]}.{chapter}.{verse}")
    
        ref_str = "[ " + ", ".join(map(lambda x : f"\"{x}\"", targets)) + " ]"
        json_str = f"{{ \"type\": \"directed\", \"source\": \"{source}\", \"source_text\": \"{source_text}\", \"targets\": {ref_str} }}\n"

        file.write(json_str)

print("Done!")