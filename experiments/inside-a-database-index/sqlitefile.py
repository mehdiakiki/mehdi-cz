"""Read SQLite b-tree pages straight from a database file (file format version 4)."""

import os
import struct

PAGE_TYPES = {
    0x02: "interior index",
    0x05: "interior table",
    0x0A: "leaf index",
    0x0D: "leaf table",
}
INT_SIZES = {1: 1, 2: 2, 3: 3, 4: 4, 5: 6, 6: 8}


def varint(buf, pos):
    """Decode the varint at pos and return (value, position after it)."""
    value = 0
    for i in range(8):
        b = buf[pos + i]
        value = (value << 7) | (b & 0x7F)
        if b < 0x80:
            return value, pos + i + 1
    return (value << 8) | buf[pos + 8], pos + 9


def serial_name(t):
    if t == 0:
        return "NULL"
    if t in INT_SIZES:
        return f"{INT_SIZES[t] * 8}-bit integer"
    if t == 7:
        return "float"
    if t in (8, 9):
        return f"the integer {t - 8}"
    if t >= 13 and t % 2:
        return f"text of {(t - 13) // 2} bytes"
    if t >= 12:
        return f"blob of {(t - 12) // 2} bytes"
    return "reserved"


def record(buf, pos):
    """Decode the record at pos: header size, serial types, values and value offsets."""
    hsize, p = varint(buf, pos)
    types = []
    while p < pos + hsize:
        t, p = varint(buf, p)
        types.append(t)
    values, offsets = [], []
    q = pos + hsize
    for t in types:
        offsets.append(q)
        if t == 0:
            values.append(None)
        elif t in INT_SIZES:
            n = INT_SIZES[t]
            values.append(int.from_bytes(buf[q:q + n], "big", signed=True))
            q += n
        elif t == 7:
            values.append(struct.unpack(">d", buf[q:q + 8])[0])
            q += 8
        elif t in (8, 9):
            values.append(t - 8)
        elif t % 2:
            n = (t - 13) // 2
            values.append(bytes(buf[q:q + n]).decode())
            q += n
        else:
            n = (t - 12) // 2
            values.append(bytes(buf[q:q + n]))
            q += n
    return hsize, types, values, offsets, q


class DbFile:
    def __init__(self, path):
        self.fd = os.open(path, os.O_RDONLY)
        head = os.pread(self.fd, 100, 0)
        size = struct.unpack(">H", head[16:18])[0]
        self.page_size = 65536 if size == 1 else size
        self.page_count = struct.unpack(">I", head[28:32])[0]
        self.freelist_trunk = struct.unpack(">I", head[32:36])[0]
        self.freelist_count = struct.unpack(">I", head[36:40])[0]

    def close(self):
        os.close(self.fd)

    def page(self, pgno):
        return os.pread(self.fd, self.page_size, (pgno - 1) * self.page_size)

    def btree_page(self, pgno):
        """Return (page bytes, type, cell offsets, right-most child or None)."""
        buf = self.page(pgno)
        off = 100 if pgno == 1 else 0
        kind = buf[off]
        ncells = struct.unpack(">H", buf[off + 3:off + 5])[0]
        interior = kind in (0x02, 0x05)
        right = struct.unpack(">I", buf[off + 8:off + 12])[0] if interior else None
        start = off + (12 if interior else 8)
        cells = [struct.unpack(">H", buf[start + 2 * i:start + 2 * i + 2])[0] for i in range(ncells)]
        return buf, kind, cells, right

    def leftmost_leaf(self, root):
        """Follow the first child pointer from the root down to a leaf. Return the path of pages."""
        path = []
        pgno = root
        while True:
            buf, kind, cells, right = self.btree_page(pgno)
            path.append((pgno, kind, len(cells)))
            if kind in (0x0A, 0x0D):
                return path
            pgno = struct.unpack(">I", buf[cells[0]:cells[0] + 4])[0] if cells else right

    def find_rowid(self, root, rowid):
        """Descend a table b-tree to the leaf that holds rowid. Return the path of pages."""
        path = []
        pgno = root
        while True:
            buf, kind, cells, right = self.btree_page(pgno)
            path.append((pgno, kind, len(cells)))
            if kind == 0x0D:
                return path
            child = right
            for c in cells:
                key, _ = varint(buf, c + 4)
                if rowid <= key:
                    child = struct.unpack(">I", buf[c:c + 4])[0]
                    break
            pgno = child

    def index_cell(self, pgno, i):
        """Decode cell i of an index leaf page: (cell offset, cell bytes, payload length, record)."""
        buf, kind, cells, _ = self.btree_page(pgno)
        c = cells[i]
        plen, p = varint(buf, c)
        rec = record(buf, p)
        return c, bytes(buf[c:rec[4]]), plen, rec

    def table_cell(self, pgno, rowid):
        """Find the cell of rowid on a table leaf page: (cell offset, cell bytes, payload length, record)."""
        buf, kind, cells, _ = self.btree_page(pgno)
        for c in cells:
            plen, p = varint(buf, c)
            key, p = varint(buf, p)
            if key == rowid:
                rec = record(buf, p)
                return c, bytes(buf[c:rec[4]]), plen, rec
        return None
