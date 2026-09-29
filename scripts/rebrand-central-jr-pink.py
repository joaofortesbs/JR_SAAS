from pathlib import Path
import json
root = Path('/home/ubuntu/jr-saas')
css_path = root / 'client/src/index.css'
css = css_path.read_text()
css = css.replace('background: linear-gradient(145deg, #1769d2, #1559b7);', 'background: linear-gradient(145deg, #1559b7 0%, #c52f78 100%);')
css = css.replace('box-shadow: 0 8px 16px rgba(21, 89, 183, .22);', 'box-shadow: 0 8px 16px rgba(197, 47, 120, .22);')
css = css.replace('.orb-peach { top: -78px; right: 27%; width: 150px; height: 150px; background: #ffd9c8; opacity: .55; }', '.orb-peach { top: -78px; right: 27%; width: 150px; height: 150px; background: #f7b4d2; opacity: .45; }')
css = css.replace('.dark .hero-title { color: #f4efff; }', '.dark .hero-title { color: #f7faff; }')
css_path.write_text(css)
package_path = root / 'package.json'
data = json.loads(package_path.read_text())
data['name'] = 'central-jr'
package_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
