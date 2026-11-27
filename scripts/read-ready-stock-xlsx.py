#!/usr/bin/env python3
import json
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}
RID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def column_index(reference):
    letters = re.match(r"[A-Z]+", reference).group(0)
    result = 0
    for char in letters:
        result = result * 26 + ord(char) - 64
    return result - 1


def cell_text(cell, shared_strings):
    cell_type = cell.get("t")
    value = cell.find("m:v", NS)
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//m:t", NS))
    if value is None:
        return ""
    if cell_type == "s":
        return shared_strings[int(value.text)]
    return value.text or ""


def main(path):
    with zipfile.ZipFile(path) as archive:
        shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
        shared = ["".join(node.text or "" for node in item.findall(".//m:t", NS)) for item in shared_root.findall("m:si", NS)]
        sheet_root = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        rel_root = ET.fromstring(archive.read("xl/worksheets/_rels/sheet1.xml.rels"))
        relations = {rel.get("Id"): rel.get("Target") for rel in rel_root.findall("r:Relationship", REL_NS)}
        hyperlinks = {}
        for link in sheet_root.findall(".//m:hyperlink", NS):
            if link.get(RID) in relations:
                hyperlinks[link.get("ref")] = relations[link.get(RID)]

        rows = []
        for row in sheet_root.findall(".//m:sheetData/m:row", NS):
            values = []
            for cell in row.findall("m:c", NS):
                index = column_index(cell.get("r"))
                while len(values) <= index:
                    values.append("")
                values[index] = cell_text(cell, shared)
            rows.append(values)

        print(json.dumps({"hyperlinks": hyperlinks, "rows": rows}, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1])
