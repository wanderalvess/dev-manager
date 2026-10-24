import React from 'react';
import { Globe, ArrowRight } from 'lucide-react';

interface HttpClientModuleCardProps {
  onNavigate?: (tab: string) => void;
}

export const HttpClientModuleCard: React.FC<HttpClientModuleCardProps> = ({ onNavigate }) => {
  return (
    <div className="p-4 rounded-xl bg-card border border-border shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">API Studio (HTTP Client)</h3>
              <span className="text-xs text-muted-foreground">Postman Integrado • Atalho Alt+9</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-primary/10 text-primary">
            REST &amp; Tokens
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Cliente de requisições HTTP REST integrado para teste e homologação de endpoints sem precisar de ferramentas externas pesadas:
        </p>

        <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground mb-4">
          <li>
            <strong className="text-foreground">Importação Nativa do Postman:</strong> Importe coleções inteiras (.json v2.1/v2.0) com árvores completas de pastas, rotas e corpos.
          </li>
          <li>
            <strong className="text-foreground">Ambientes &amp; Variáveis:</strong> Interpolação dinâmica de <code className="font-mono text-primary font-bold">{'{{host}}'}</code>, <code className="font-mono text-primary font-bold">{'{{port}}'}</code>, <code className="font-mono text-primary font-bold">{'{{TOKEN}}'}</code> e <code className="font-mono text-primary font-bold">{'{{$randomInt}}'}</code>.
          </li>
          <li>
            <strong className="text-foreground">1-Click Login WinThor:</strong> Autenticação direta contra <code className="font-mono text-primary">/winthor/autenticacao/v1/login</code> com injeção automática de Bearer Token.
          </li>
          <li>
            <strong className="text-foreground">Monaco Editor &amp; Formatação:</strong> Editor de body JSON com coloração sintática, formatação Beautify e visualizador de respostas.
          </li>
        </ul>
      </div>

      {onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate('http-client')}
          className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium text-foreground transition-colors group"
        >
          <span>Abrir API Studio</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};
