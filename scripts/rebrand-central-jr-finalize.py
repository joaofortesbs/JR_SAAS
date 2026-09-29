from pathlib import Path
root = Path('/home/ubuntu/jr-saas/client/src')
for path in root.rglob('*'):
    if path.is_file() and path.suffix in {'.tsx', '.ts', '.css'}:
        text = path.read_text()
        text = text.replace('--edu-purple-strong', '--edu-blue-strong')
        text = text.replace('--edu-purple', '--edu-blue')
        text = text.replace('"purple"', '"blue"')
        text = text.replace("'purple'", "'blue'")
        path.write_text(text)
