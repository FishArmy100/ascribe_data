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

id = 0
with open('out.jsonl', 'w') as file:
    for row in data:
        defs = row[1]
        file.write(f"{{ \"term\": \"{row[0]}\", \"definition\": \"<p>{defs}</p>\", \"id\": {id} }}\n")
        id += 1

print("Done!")