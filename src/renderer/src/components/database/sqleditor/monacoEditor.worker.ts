// Worker do Monaco. Fica num arquivo local (e não importado direto de node_modules) porque o otimizador de
// dependências do Vite não aceita `?worker` em caminhos de node_modules. O monacoEntry importa este arquivo
// com `?worker&inline`, gerando um worker embutido (blob).
import '@monaco/editor/editor.worker.js';
