import sys
import os
import csv
from typing import List, Tuple, Dict

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

line_count = 0
with open(path, 'r') as file:
    for line_count, _ in enumerate(file, 1):
        pass

data: Dict[str, Tuple[str, int, List[str]]] = {}

with open(path, 'r', newline='') as f:
    reader = csv.reader(f, delimiter=",")
    next(reader)
    for row in reader:
        print(f"{reader.line_num / line_count}%")
        from_verse = row[0]
        to_verse = row[1]
        votes = int(row[2])
        if votes > 0:
            data.setdefault(from_verse, (from_verse, len(data), []))[2].append(to_verse)

print("Writing to file: out.jsonl...")

with open('out.jsonl', 'w') as file:
    lines_data = sorted(list(data.values()), key=lambda i : i[1])
    for line in lines_data:
        source = line[0]
        targets = line[2]

        ref_str = "[ " + ", ".join(map(lambda x : f"\"{x}\"", targets)) + " ]"
        json_str = f"{{ \"type\": \"directed\", \"source\": \"{source}\", \"targets\": {ref_str} }}\n"

        file.write(json_str)




print("Done!")