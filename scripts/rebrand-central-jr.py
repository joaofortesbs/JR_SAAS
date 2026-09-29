from pathlib import Path

root = Path('/home/ubuntu/jr-saas')
css_path = root / 'client/src/index.css'
css = css_path.read_text()
replacements = {
    '--background: #f9fafb;': '--background: #f7f9fc;',
    '--foreground: #322d43;': '--foreground: #15253d;',
    '--card-foreground: #322d43;': '--card-foreground: #15253d;',
    '--popover-foreground: #322d43;': '--popover-foreground: #15253d;',
    '--primary: #6b58cb;': '--primary: #1559b7;',
    '--secondary: #f2f1f8;': '--secondary: #eef3fa;',
    '--secondary-foreground: #554d68;': '--secondary-foreground: #244366;',
    '--muted: #f1f2f5;': '--muted: #eef3fa;',
    '--muted-foreground: #817b8f;': '--muted-foreground: #52637a;',
    '--accent: #efedff;': '--accent: #e9f1ff;',
    '--accent-foreground: #5345a3;': '--accent-foreground: #1559b7;',
    '--destructive: #c95c61;': '--destructive: #b42318;',
    '--border: #e9e8ef;': '--border: #d7e0ec;',
    '--input: #e3e1eb;': '--input: #d7e0ec;',
    '--ring: #9587e4;': '--ring: #1769d2;',
    '--sidebar-foreground: #433c58;': '--sidebar-foreground: #15253d;',
    '--sidebar-accent: #f0f3ff;': '--sidebar-accent: #eef3fa;',
    '--sidebar-accent-foreground: #5546ad;': '--sidebar-accent-foreground: #1559b7;',
    '--sidebar-border: #efedf4;': '--sidebar-border: #d7e0ec;',
    '--sidebar-ring: #9587e4;': '--sidebar-ring: #1769d2;',
    '--edu-bg: #f8f8fb;': '--edu-bg: #f7f9fc;',
    '--edu-text-primary: #332e42;': '--edu-text-primary: #15253d;',
    '--edu-text-secondary: #7f788d;': '--edu-text-secondary: #52637a;',
    '--edu-purple: #eeecff;': '--edu-purple: #e9f1ff;',
    '--edu-purple-strong: #6b58cb;': '--edu-purple-strong: #1559b7;',
    '--edu-blue: #eaf3ff;': '--edu-blue: #e9f1ff;',
    '--edu-blue-strong: #5484c7;': '--edu-blue-strong: #1769d2;',
    '--edu-coral: #fff0f0;': '--edu-coral: #fce7f3;',
    '--edu-coral-strong: #c85f70;': '--edu-coral-strong: #c52f78;',
    '--edu-peach: #fff0e7;': '--edu-peach: #fff4de;',
    '--edu-peach-strong: #d27b51;': '--edu-peach-strong: #8a4b08;',
    '--background: #242131;': '--background: #0e1726;',
    '--foreground: #f5f2ff;': '--foreground: #f7faff;',
    '--card: #302b40;': '--card: #15243a;',
    '--card-foreground: #f5f2ff;': '--card-foreground: #f7faff;',
    '--popover: #302b40;': '--popover: #1d304a;',
    '--popover-foreground: #f5f2ff;': '--popover-foreground: #f7faff;',
    '--primary: #a296f0;': '--primary: #8fb7ff;',
    '--primary-foreground: #26213b;': '--primary-foreground: #0e1726;',
    '--secondary: #39334c;': '--secondary: #1d304a;',
    '--secondary-foreground: #e8e2ff;': '--secondary-foreground: #b9c7d9;',
    '--muted: #3b3649;': '--muted: #1d304a;',
    '--muted-foreground: #b1a9c0;': '--muted-foreground: #b9c7d9;',
    '--accent: #433b5d;': '--accent: #223650;',
    '--accent-foreground: #ebe7ff;': '--accent-foreground: #9bb eff;'.replace(' ', ''),
    '--destructive: #ef8d95;': '--destructive: #ff8d86;',
    '--destructive-foreground: #2d263b;': '--destructive-foreground: #0e1726;',
    '--border: #49425c;': '--border: #36506d;',
    '--input: #514a66;': '--input: #36506d;',
    '--ring: #a296f0;': '--ring: #9bb eff;'.replace(' ', ''),
    '--sidebar: #2b263a;': '--sidebar: #15243a;',
    '--sidebar-foreground: #f5f2ff;': '--sidebar-foreground: #f7faff;',
    '--sidebar-accent: #433b5d;': '--sidebar-accent: #223650;',
    '--sidebar-accent-foreground: #f5f2ff;': '--sidebar-accent-foreground: #f7faff;',
    '--sidebar-border: #443c57;': '--sidebar-border: #36506d;',
    '--sidebar-ring: #a296f0;': '--sidebar-ring: #9bb eff;'.replace(' ', ''),
    '--edu-bg: #242131;': '--edu-bg: #0e1726;',
    '--edu-text-primary: #f5f2ff;': '--edu-text-primary: #f7faff;',
    '--edu-text-secondary: #b1a9c0;': '--edu-text-secondary: #b9c7d9;',
    '--edu-purple: #403962;': '--edu-purple: #223650;',
    '--edu-purple-strong: #b0a4fb;': '--edu-purple-strong: #9bb eff;'.replace(' ', ''),
    '--edu-blue: #2e405a;': '--edu-blue: #223650;',
    '--edu-blue-strong: #8fb9f2;': '--edu-blue-strong: #8fb7ff;',
    '--edu-coral: #5c3544;': '--edu-coral: #51253d;',
    '--edu-coral-strong: #f39aaa;': '--edu-coral-strong: #ff9ac5;',
}
for old, new in replacements.items():
    css = css.replace(old, new)
# Replace remaining purple/lilac-specific literals and names with semantic Central JR equivalents.
for old, new in {
    '#8070e6': '#1769d2', '#6550c3': '#1559b7', '#40365d': '#15253d',
    '#6658b4': '#1559b7', '#6959b5': '#1559b7', '#8c7ae0': '#1769d2',
    '#eae7ff': '#e9f1ff', '#d2cbff': '#bcd3ff', '#3b3459': '#1d304a',
    'rgba(107, 88, 203, .22)': 'rgba(21, 89, 183, .22)',
    'rgba(107, 88, 203, .08)': 'rgba(21, 89, 183, .08)',
    'rgba(107,88,203,.2)': 'rgba(21,89,183,.2)',
    'rgba(107,88,203,.27)': 'rgba(21,89,183,.27)',
    '#6b58cb': '#1559b7', '#5e4bbd': '#10458d',
}.items():
    css = css.replace(old, new)
css = css.replace('.pill-lilac', '.pill-blue').replace('.bubble-lilac', '.bubble-blue').replace('.status-lilac', '.status-blue').replace('.fill-purple', '.fill-blue')
css = css.replace('--edu-purple', '--edu-blue')
css = css.replace('lilac', 'blue').replace('purple', 'blue')
css_path.write_text(css)

html_path = root / 'client/index.html'
html = html_path.read_text()
html = html.replace('<title>Ponto Estudos — Estúdio de Aprovação</title>', '<title>Central JR — Aprenda no seu ritmo</title>')
html = html.replace('family=Nunito+Sans:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@600;700;800', 'family=Source+Sans+3:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800')
html_path.write_text(html)
