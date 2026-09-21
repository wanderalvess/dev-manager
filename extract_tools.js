const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'src', 'mcp', 'index.ts'), 'utf-8');

const tools = [];
const regex = /server\.tool\(\s*['"]([^'"]+)['"],\s*['"]([^'"]+)['"]/g;
let match;
while ((match = regex.exec(content)) !== null) {
  tools.push({ name: match[1], desc: match[2] });
}

const docsDir = path.join(__dirname, 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const outPath = path.join(docsDir, 'MCP_TOOLS.md');
let outContent = '# Ferramentas MCP (Model Context Protocol)\n\n';
outContent += 'Esta documentação lista todas as ferramentas (tools) disponibilizadas pelo servidor MCP embutido no DevManager.\n\n';
outContent += `Total de ferramentas: ${tools.length}\n\n`;

for (const tool of tools) {
  outContent += `## ${tool.name}\n${tool.desc}\n\n`;
}

fs.writeFileSync(outPath, outContent, 'utf-8');
console.log(`Extracted ${tools.length} tools to ${outPath}`);
