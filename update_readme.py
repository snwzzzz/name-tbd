import re

with open('name-tbd/../README.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Update roadmap
content = re.sub(r'^- Exported data lives in the export and in each visitor\'s browser\. There\'s no shared live data yet\.\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^- \*\*Live data sources\*\* \(databases, APIs\): a new definition section plus an `AppData` implementation \(section 15\)\.\n', '', content, flags=re.MULTILINE)

# Update backend
text_to_add = """
### 10.2 Data Connections and Proxy

Connectors in `livedata/` (PostgreSQL, Google Sheets, Microsoft 365, generic REST) allow live apps to query data where it lives. The backend acts as a proxy: exported apps call `/api/data/:sourceId/*` with their App Key. The proxy applies queries, limits rows, and forwards requests to the target using credentials encrypted at rest.
"""
content = content.replace("commands/        request bodies (NewPageCommand, UpdateUiComponentCommand, …)\n```", "commands/        request bodies (NewPageCommand, UpdateUiComponentCommand, …)\n```\n" + text_to_add)

# Update export pipeline
content = content.replace("GET /api/branches/{id}/export?format=html\n", "GET /api/branches/{id}/export?format=html&dataMode=embed&allColumns=false\n")
content = content.replace("DataSourcesContributor   \"dataSources\", \"dataRevision\"", "DataSourcesContributor   \"dataSources\", \"dataRevision\"\n                       │     AppKeysContributor       \"appKey\" if mode is live/cache")
content = content.replace("1. **Navbar → Export** sends the changes still waiting (`SaveQueue.flush`), then downloads `GET /api/branches/{id}/export?format=html`.", "1. **Navbar → Export** sends the changes still waiting (`SaveQueue.flush`), then opens the Export Dialog. You can choose the `dataMode` (embed, cache, live) and toggle `allColumns`.")

with open('name-tbd/../README.md', 'w', encoding='utf-8') as f:
    f.write(content)
