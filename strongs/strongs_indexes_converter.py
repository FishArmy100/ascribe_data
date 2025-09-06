import os
import re
from typing import Optional, Set, List, Dict
import xml.etree.ElementTree as XML
from pydantic import BaseModel, Field
import argparse
from pathlib import Path
from sys import stdout
import string

regex = r"^(?P<prefix>I+\s+)?(?P<book>[a-zA-Z][a-zA-Z\s]*[a-zA-Z])\s+(?P<chapter>\d+):(?P<verse>\d+):\s+(?P<content>.+)?$"

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

new_testament_books = [
    "Matt",
    "Mark",
    "Luke",
    "John",
    "Acts",
    "Rom",
    "1Cor",
    "2Cor",
    "Gal",
    "Eph",
    "Phil",
    "Col",
    "1Thess",
    "2Thess",
    "1Tim",
    "2Tim",
    "Titus",
    "Phlm",
    "Heb",
    "Jas",
    "1Pet",
    "2Pet",
    "1John",
    "2John",
    "3John",
    "Jude",
    "Rev",
]

def is_new_testament(verse_id: str) -> bool:
    for b in new_testament_books:
        if verse_id.startswith(b):
            return True
        
    return False

def is_old_testament(verse_id: str) -> bool:
    return not is_new_testament(verse_id)

class Word(BaseModel):
    red: Optional[bool] = None
    italics: Optional[bool] = None
    begin_punc: Optional[str] = Field(None, alias="begin_punc")
    end_punc: Optional[str] = Field(None, alias="end_punc")
    text: str

    class Config:
        extra = "forbid"  # like serde(deny_unknown_fields)

class Verse(BaseModel):
    id: int  # substitute your EntryId type here
    verse_id: str  # substitute your VerseId type here
    words: List[Word]

    class Config:
        extra = "forbid"

def load_bible(path: str) -> Dict[str, Verse]:
    bibles: Dict[str, Verse] = {}
    with open(path, "r", encoding="utf-8") as file:
        for line in file:
            verse = Verse.model_validate_json(line)
            bibles[verse.verse_id] = verse
    
    return bibles

class OsisStrongs:
    def __init__(self, osis: str, content: XML.Element):
        self.osis = osis
        self.content = content

# Helper to count all words in an element, recursively
def count_all_text_words(elem: XML.Element) -> int:
    """Count all words inside this element, including nested elements and tails."""
    count = 0
    if elem.text:
        count += len(elem.text.translate(str.maketrans("", "", string.punctuation)).split())
    for child in elem:
        count += count_all_text_words(child)
        if child.tail:
            count += len(child.tail.translate(str.maketrans("", "", string.punctuation)).split())
    return count

def count_text_words_excluding_empty_w(elem: XML.Element) -> int:
    # Count all words inside this element, but exclude empty <w> elements from the count.
    count = 0
    
    # Count words in the element's direct text content
    if elem.text:
        count += len(elem.text.translate(str.maketrans("", "", string.punctuation)).split())
    
    # Recursively process child elements
    for child in elem:
        if child.tag == "w" and count_all_text_words(child) == 0:
            # Skip empty <w> elements entirely - don't count their words
            continue
        
        # For non-empty elements (or non-<w> elements), recursively count words
        count += count_text_words_excluding_empty_w(child)
        
        # Count words in the tail text (text that comes after the closing tag)
        if child.tail:
            count += len(child.tail.translate(str.maketrans("", "", string.punctuation)).split())
    
    return count

def process_element_for_strongs(elem: XML.Element, offset: int, strongs_words: List[str], line: int) -> int:
    """Recursively process an element and its children for Strong's numbers."""
    
    # Count words in direct text content before any children
    if elem.text:
        words_in_text = len(elem.text.translate(str.maketrans("", "", string.punctuation)).split())
        offset += words_in_text
    
    # Process each child element
    for child in elem:
        if child.tag == "w":
            # Strong's numbers
            strongs_attr = child.attrib.get("savlm", "")
            nums_list = [n.split(":")[1] for n in strongs_attr.split() if "strong:" in n]
            nums = "[ " + ", ".join(f'"{v}"' for v in nums_list) + " ]"

            # Count all words inside <w> including nested elements
            w_words = count_all_text_words(child)

            if w_words == 0:
                continue

            start = offset
            end = start + w_words - 1
            offset = end + 1

            if start > end:
                raise RuntimeError(f"Error on line {line}: the start word index is larger than the end word index")

            if start == end:
                strongs_words.append(f'{{ "strongs": {nums}, "range": "{start}" }}')
            else:
                strongs_words.append(f'{{ "strongs": {nums}, "range": "{start}-{end}" }}')
        else:
            # Recursively process non-<w> elements
            offset = process_element_for_strongs(child, offset, strongs_words, line)
        
        # Count words in tail text after this child
        if child.tail:
            words_in_tail = len(child.tail.translate(str.maketrans("", "", string.punctuation)).split())
            offset += words_in_tail
    
    return offset

def get_strongs(entry: OsisStrongs, bible: Dict[str, Verse], line: int) -> str:
    # Align <w> elements (with Strong's numbers) to bible words, while counting all text properly.
    total_words = count_text_words_excluding_empty_w(entry.content)
    offset = len(bible[entry.osis].words) - total_words + 1  # 1-based indexing

    if offset < 0:
        raise RuntimeError(f"Words in strongs more than in bible on line {line}, s_word = {total_words}; b_word = {len(bible[entry.osis].words)}; ref = {entry.osis}")

    strongs_words: List[str] = []

    # Process the content recursively
    final_offset = process_element_for_strongs(entry.content, offset, strongs_words, line)

    # Final sanity check
    if final_offset - 1 != len(bible[entry.osis].words):
        raise RuntimeError(
            f"Error on line {line}, last strongs word index does not match bible word count "
            f"(expected {len(bible[entry.osis].words)}, got {final_offset - 1})"
        )

    words_str = "[ " + ", ".join(strongs_words) + " ]"
    return f'{{ "verse_id": "{entry.osis}", "id": {line - 1}, "words": {words_str} }}'

def collect_tags(elem: XML.Element, tags: Set[str] | None = None) -> Set[str]:
    if tags is None:
        tags = set()

    tags.add(elem.tag)

    for child in elem:
        collect_tags(child, tags)

    return tags

def write_to_file(path: str, content: str):
    file_path = Path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

def valid_path(path: str) -> str:
    """Check if the path exists."""
    if not os.path.exists(path):
        raise argparse.ArgumentTypeError(f"Path does not exist: {path}")
    return path

if __name__ == "__main__": # Main entry point
    parser = argparse.ArgumentParser(
        description="Example CLI with a positional path and an optional -b path"
    )

    # Positional argument (required)
    parser.add_argument(
        "path_str",
        type=valid_path,
        help="Main path (must exist)"
    )

    # Optional argument (-b or --backup)
    parser.add_argument(
        "-b", "--bible",
        dest="bible_path",
        type=valid_path,
        help="Bible path (must exist)",
        required=True
    )

    parser.add_argument(
        "-o", "--out",
        dest="out_path",
        help="The output path",
        required=True,
    )

    args = parser.parse_args()
    path: str = args.__dict__["path_str"]
    bible_path: str = args.__dict__["bible_path"]
    out_path: str = args.__dict__["out_path"]

    print("Loading bible...")
    bible = load_bible(bible_path)
    print("Bible loaded")

    def print_progress_bar(iteration: int, total: int, length: int=40):
        percent = f"{100 * (iteration / float(total)):.1f}"
        filled_length = int(length * iteration // total)
        bar = '█' * filled_length + '-' * (length - filled_length)
        stdout.write(f'\rProgress: |{bar}| {percent}% ({iteration}/{total})')
        stdout.flush()
        if iteration == total:
            print()

        
    out_lines: List[str] = []
    error_count = 0

    with open(path, 'r', encoding='utf-8-sig') as file:
        lines = file.readlines()
        lines = lines[:-1]
        total_lines = len(lines)
        line_index = 1
        for line in lines:
            captures = re.search(regex, line)
            if not captures:
                raise RuntimeError(f"File {path} is in an invalid format on line {line_index}.")
            
            prefix = captures["prefix"]
            book = captures["book"]
            chapter = int(captures["chapter"])
            verse = int(captures["verse"])
            content: str | None = captures['content']
            if content is None:
                line_index += 1
                continue

            content = f"<content>{captures['content']}</content>"

            if prefix:
                book = prefix.strip() + " " + book

            book = book_convert_map[book]

            osis = f"{book}.{chapter}.{verse}"
            tree = XML.fromstring(content)
            entry = OsisStrongs(osis, tree)

            try:
                out_lines.append(get_strongs(entry, bible, line_index))
            except RuntimeError as e:
                error_count += 1
                print(e)
                
            
            print_progress_bar(line_index, total_lines)
            line_index += 1

    out_file = "\n".join(out_lines)

    # print(f"Error count: {error_count}")
    print("Writing to out file...")
    write_to_file(out_path, out_file)
    print("Jobs done!")



    