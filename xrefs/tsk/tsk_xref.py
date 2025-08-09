from abc import ABC, abstractmethod
import sys
import os
import csv
from typing import List
import re

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

class Atom(ABC):
    @abstractmethod
    def __str__(self) -> str:
        pass

class ChapterAtom(Atom):
    
    def __init__(self, book: str, chapter: int):
        self.book = book
        self.chapter = chapter

    def __str__(self) -> str:
        return f"{self.book}.{self.chapter}"
    
class VerseAtom(Atom):
    def __init__(self, book: str, chapter: int, verse: int):
        self.book = book
        self.chapter = chapter
        self.verse = verse

    def __str__(self) -> str:
        return f"{self.book}.{self.chapter}.{self.verse}"
    
class RefId(ABC):
    @abstractmethod
    def __str__(self) -> str:
        pass

class SingleRef(RefId):
    def __init__(self, atom: Atom):
        self.atom = atom

    def __str__(self) -> str:
        return str(self.atom)
    
class RangeRef(RefId):
    def __init__(self, start: Atom, end: Atom):
        self.start = start
        self.end = end

    def __str__(self) -> str:
        return f"{str(self.start)}-{str(self.end)}"


def parse_tsk_ref_id(ref: str) -> List[RefId]:
    book_pair = ref.split()

    if len(book_pair) != 2:
        print(ref)

    book = book_pair[0]
    chapter_pair = book_pair[1].split(':')

    if re.fullmatch(r"\d+-\d+", book_pair[1]):
        [ch_start, ch_end] = book_pair[1].split("-")
        ch_start = int(ch_start)
        ch_end = int(ch_end)

        return [RangeRef(ChapterAtom(book, ch_start), ChapterAtom(book, ch_end))]

    if not chapter_pair[0].isdecimal():
        print(ref)

    chapter = int(chapter_pair[0])
    if chapter_pair[1].isdecimal():
        return [SingleRef(VerseAtom(book, chapter, int(chapter_pair[1])))]
    
    chapter_verses = chapter_pair[1].split(",")
    if len(chapter_verses) > 1:
        ret_verses: List[RefId] = []
        for chapter_verse in chapter_verses:
            verses = chapter_verse.split('-')
            if len(verses) == 2:
                ret_verses.append(RangeRef(VerseAtom(book, chapter, int(verses[0])), VerseAtom(book, chapter, int(verses[1]))))
            elif len(verses) == 1:
                ret_verses.append(SingleRef(VerseAtom(book, chapter, int(verses[0]))))
            else:
                raise RuntimeError("Unknown reference format: " + ref)
        
        return ret_verses
    
    verse_range = chapter_pair[1].split("-")
    if len(verse_range) == 2:
        return [RangeRef(VerseAtom(book, chapter, int(verse_range[0])), VerseAtom(book, chapter, int(verse_range[1])))]
    
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

print("Writing to file: tsk_xrefs.jsonl...")

with open('tsk_xrefs.jsonl', 'w') as file:
    for row in data:
        book_index = int(row[0])
        chapter_index = int(row[1])
        verse_index = int(row[2])
        source = format_ref_id(book_index, chapter_index, verse_index)

        source_text = row[4].replace("\"", "\\\"")
        refs = row[5].split(";")
        
        targets: List[str] = []
        for ref in refs:
            for ref_id in parse_tsk_ref_id(ref):
                if isinstance(ref_id, RangeRef):
                    if isinstance(ref_id.start, ChapterAtom) and isinstance(ref_id.end, ChapterAtom):
                        targets.append(f"{tsk_to_osis[ref_id.start.book]}.{ref_id.start.chapter}-{tsk_to_osis[ref_id.end.book]}.{ref_id.end.chapter}")
                    elif isinstance(ref_id.start, VerseAtom) and isinstance(ref_id.end, VerseAtom):
                        targets.append(f"{tsk_to_osis[ref_id.start.book]}.{ref_id.start.chapter}.{ref_id.start.verse}-{tsk_to_osis[ref_id.end.book]}.{ref_id.end.chapter}.{ref_id.end.verse}")
                    else:
                        raise RuntimeError(f"Error: Unknown reference format {str(ref_id)}")
                elif isinstance(ref_id, SingleRef):
                    if isinstance(ref_id.atom, ChapterAtom):
                        targets.append(f"{tsk_to_osis[ref_id.atom.book]}.{ref_id.atom.chapter}")
                    elif isinstance(ref_id.atom, VerseAtom):
                        targets.append(f"{tsk_to_osis[ref_id.atom.book]}.{ref_id.atom.chapter}.{ref_id.atom.verse}")
                    else:
                        raise RuntimeError(f"Error: Unknown reference format {str(ref_id)}")
                else:
                    raise RuntimeError(f"Error: Unknown reference format {str(ref_id)}")
    
        ref_str = "[ " + ", ".join(map(lambda x : f"\"{x}\"", targets)) + " ]"
        json_str = f"{{ \"type\": \"directed\", \"source\": \"{source}\", \"source_text\": \"{source_text}\", \"targets\": {ref_str} }}\n"

        file.write(json_str)

print("Done!")