"""Print the first entry of the email index and the table row it points to, read from the raw file."""

import sys

import common
from sqlitefile import PAGE_TYPES, DbFile, serial_name


def show_path(path):
    for pgno, kind, ncells in path:
        print(f"  page {pgno:>6}  {PAGE_TYPES[kind]:<15} {ncells:>4} cells")


def show_hex(raw):
    for i in range(0, len(raw), 16):
        print("  " + raw[i:i + 16].hex(" "))


def show_record(rec):
    hsize, types, values, _, _ = rec
    print(f"  record header: {hsize} bytes, serial types {types}")
    for t, v in zip(types, values):
        print(f"    {t:>3} = {serial_name(t):<20} {v!r}")


def main(path):
    con = common.connect(path)
    roots = dict(con.execute("SELECT name, rootpage FROM sqlite_schema"))
    con.close()
    db = DbFile(path)
    print(f"page size {db.page_size}, {db.page_count} pages in the file header")

    print("index users_email, from the root page to the first leaf:")
    ipath = db.leftmost_leaf(roots["users_email"])
    show_path(ipath)
    leaf = ipath[-1][0]
    _, raw, plen, rec = db.index_cell(leaf, 0)
    print(f"first cell of page {leaf}, {len(raw)} bytes:")
    show_hex(raw)
    print(f"  payload length {plen}")
    show_record(rec)
    email, rowid = rec[2]

    print(f"table users, from the root page to the leaf that holds rowid {rowid}:")
    tpath = db.find_rowid(roots["users"], rowid)
    show_path(tpath)
    tleaf = tpath[-1][0]
    _, raw, plen, rec = db.table_cell(tleaf, rowid)
    print(f"the cell of rowid {rowid} on page {tleaf}, {len(raw)} bytes:")
    show_hex(raw)
    print(f"  payload length {plen}, rowid {rowid}")
    show_record(rec)
    db.close()


if __name__ == "__main__":
    main(sys.argv[1])
