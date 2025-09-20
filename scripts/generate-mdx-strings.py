import json
from itertools import chain
from pathlib import Path

import typer

app = typer.Typer()

def hash_code(s):
    """Returns a hash code from a string.

    Args:
        s (str): The string to hash.

    Returns:
        int: A 32-bit integer hash of the string.

    References:
        - http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
        - https://stackoverflow.com/a/8831937
    """
    hash = 0
    for char in s:
        hash = (hash << 5) - hash + ord(char)
        hash &= 0xFFFFFFFF  # Convert to 32bit integer
    return hash


# Derived from:
# https://chat.openai.com/share/41d568ff-b124-4144-a19e-b51938adf7ce
@app.command()
def get_all_strings(json_file_path):
    # Load the JSON data from the file
    with open(json_file_path, "r") as file:
        data = json.load(file)

    def extract_strings(element, result):
        if isinstance(element, dict):  # If element is a dictionary
            for value in element.values():
                extract_strings(value, result)
        elif isinstance(element, list):  # If element is a list
            for item in element:
                extract_strings(item, result)
        elif isinstance(element, str):  # If element is a string
            result.append(element)

    # Initialize an empty list to hold the strings
    strings = []
    # Extract strings from the loaded JSON data
    extract_strings(data, strings)

    return strings

@app.command()
def dump_mdx(strings: list[str], output_dir: str, overwrite: bool = False):
    output_dir = Path(output_dir)
    if output_dir.exists() and not overwrite:
        raise Exception(f"Output directory '{output_dir}' already exists. Use --overwrite to overwrite it.")
    Path.mkdir(output_dir, parents=True)

    hash_to_string = {}
    for s in strings:
        h = hash_code(s)
        if h in hash_to_string and hash_to_string[h] != s:
            raise Exception(f"ERROR: Hash collision: '{s}' and '{hash_to_string[h]}' have the same hash code {h}")
        hash_to_string[h] = s

    for h, s in hash_to_string.items():
        basename = f"{h}.mdx"

        with open(output_dir / basename, "w") as file:
            file.write(s)

    strings_file = output_dir / "strings.ts"
    with open(strings_file, "w") as file:
        for h in hash_to_string.keys():
            file.write(f"import String{h} from './{h}.mdx'\n")
        file.write("\n")

        file.write("export default {\n")
        for h in hash_to_string.keys():
            file.write(f"  '{h}': String{h},\n")
        file.write("}\n")

    print(f"Dumped {len(strings)} strings to {output_dir}")

@app.command()
def json_to_mdx(json_file_paths: list[str], output_dir: str):
    strings = list(chain.from_iterable(get_all_strings(p) for p in json_file_paths))
    dump_mdx(strings=strings, output_dir=output_dir)

if __name__ == '__main__':
    app()
