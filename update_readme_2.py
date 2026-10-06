with open('name-tbd/../README.md', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('(`DataSourceService.replaceRows`)', '')
with open('name-tbd/../README.md', 'w', encoding='utf-8') as f:
    f.write(content)
