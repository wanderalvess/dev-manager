import re
import json
import os

with open(r'c:\Users\wanderson.alves\projetosTOTVS\winthor-dev-manager\src\mcp\index.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# match server.tool(...)
tools = []
# simple regex to find server.tool(...)
# It registers tools as:
# server.tool(
#   'tool_name',
#   'tool description',
#   { args },
#   async (args) => { ... }
# )

pattern = re.compile(r"server\.tool\(\s*['\"]([^'\"]+)['\"],\s*['\"]([^'\"]+)['\"]", re.MULTILINE)
matches = pattern.findall(content)

with open(r'c:\Users\wanderson.alves\projetosTOTVS\winthor-dev-manager\docs\MCP_TOOLS.md', 'w', encoding='utf-8') as out:
    out.write("# Ferramentas MCP (Model Context Protocol)\n\n")
    out.write("Esta documentação lista todas as ferramentas (tools) disponibilizadas pelo servidor MCP embutido no DevManager.\n\n")
    out.write(f"Total de ferramentas: {len(matches)}\n\n")
    
    for name, desc in matches:
        out.write(f"## {name}\n")
        out.write(f"{desc}\n\n")

print(f"Extracted {len(matches)} tools.")
