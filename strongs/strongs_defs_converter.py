import sys
import os
import csv

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
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        data.append(row)

print("Writing to file: out.jsonl...")

with open('strongs_defs.jsonl', 'w') as file:
    for row in data:
        defs = ", ".join(map(lambda d : f"\"{d.strip()}\"", row[1].split(",")))
        file.write(f"{{ \"strongs_ref\": \"{row[0]}\", \"definitions\": [{defs}] }}\n")
        
with open('kjv_strongs_defs.jsonl', 'w') as file:
    for row in data:
        defs = ", ".join(map(lambda d : f"\"{d.strip()}\"", row[2].split(",")))
        file.write(f"{{ \"strongs_ref\": \"{row[0]}\", \"definitions\": [{defs}] }}\n")

with open('strongs_derivations.jsonl', 'w') as file:
    for row in data:
        file.write(f"{{ \"strongs_ref\": \"{row[0]}\", \"note\": [{row[4]}] }}\n")

print("Done!")