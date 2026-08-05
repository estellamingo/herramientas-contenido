#!/usr/bin/env python3
from pathlib import Path
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
BRANDS_DIR = ROOT / "assets" / "marcas"
CATALOG_PATH = BRANDS_DIR / "catalogo.json"

def visible_name(filename: str) -> str:
    stem = Path(filename).stem
    # Convierte guiones y guiones bajos en espacios.
    name = re.sub(r"[-_]+", " ", stem).strip()
    # Capitaliza palabras sin destruir siglas completas.
    words = []
    for word in name.split():
        words.append(word if word.isupper() else word.capitalize())
    return " ".join(words)

def main() -> None:
    BRANDS_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    for path in sorted(BRANDS_DIR.iterdir(), key=lambda p: p.name.casefold()):
        if path.is_file() and path.suffix.lower() == ".png":
            items.append({
                "nombre": visible_name(path.name),
                "archivo": path.name
            })

    CATALOG_PATH.write_text(
        json.dumps(items, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    print(f"Catálogo actualizado: {len(items)} marcas.")

if __name__ == "__main__":
    main()
