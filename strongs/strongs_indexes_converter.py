import sys
import os
import re
from typing import Set
import xml.etree.ElementTree as XML

book_convert_map = {
    "Genesis": "Gen",
    "Exodus": "Exod",
    "Leviticus": "Lev",
    "Numbers": "Num",
    "Deuteronomy": "Deut",
    "Joshua": "Josh",
    "Judges": "Judg",
    "Ruth": "Ruth",
    "I Samuel": "1Sam",
    "II Samuel": "2Sam",
    "I Kings": "1Kgs",
    "II Kings": "2Kgs",
    "I Chronicles": "1Chr",
    "II Chronicles": "2Chr",
    "Ezra": "Ezra",
    "Nehemiah": "Neh",
    "Esther": "Esth",
    "Job": "Job",
    "Psalms": "Ps",
    "Proverbs": "Proverbs",
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
    "I Corinthians": "1Cor",
    "II Corinthians": "2Cor",
    "Galatians": "Gal",
    "Ephesians": "Eph",
    "Philippians": "Phil",
    "Colossians": "Col",
    "I Thessalonians": "1Thess",
    "II Thessalonians": "2Thess",
    "I Timothy": "1Tim",
    "II Timothy": "2Tim",
    "Titus": "Titus",
    "Philemon": "Phlm",
    "Hebrews": "Heb",
    "James": "Jas",
    "I Peter": "1Pet",
    "II Peter": "2Pet",
    "I John": "1John",
    "II John": "2John",
    "III John": "3John",
    "Jude": "Jude",
    "Revelation of John": "Rev",
}

def collect_tags(elem: XML.Element, tags: Set[str] | None = None) -> Set[str]:
    if tags is None:
        tags = set()

    tags.add(elem.tag)

    for child in elem:
        collect_tags(child, tags)

    return tags


if len(sys.argv) < 2:
    raise RuntimeError("You must pass a file path")
elif len(sys.argv) > 2:
    raise RuntimeError("More than 1 argument was supplied")

path = sys.argv[1]

if not os.path.isfile(path):
    raise RuntimeError(f"File path {path} is not a valid path")

regex = r"^(?P<prefix>I+\s+)?(?P<book>[a-zA-Z][a-zA-Z\w]*[a-zA-Z])\s+(?P<chapter>\d+):(?P<verse>\d+):\s+(?P<content>.+)$"
verse = 'Genesis 1:1: <w savlm="strong:H07225">In the beginning</w> <w savlm="strong:H0430">God</w> <w  savlm="strong:H0853 strong:H01254">created</w> <w savlm="strong:H08064">the heaven</w> <w savlm="strong:H0853">and</w> <w savlm="strong:H0776">the earth</w>.'

tags = set[str]()
with open(path, 'r', encoding='utf-8-sig') as file:
    lines = file.readlines()
    lines = lines[:-1]
    for line in file:
        captures = re.search(regex, line)
        if not captures:
            raise RuntimeError(f"File {path} is in an invalid format.")
        
        prefix = captures["prefix"]
        book = captures["book"]
        chapter = int(captures["chapter"])
        verse = int(captures["verse"])
        content = f"<content>{captures['content']}</content>"

        if prefix:
            book = prefix.strip() + " " + book

        if book != "Gen":
            continue

        osis = f"{book}.{chapter}.{verse}"
        tree = XML.fromstring(content)
        collect_tags(tree, tags)

print("List of all tags:\n")
for t in tags:
    print(t + "\n")

    