import type { SceneNodeKey } from './traceAnimationModel';

/**
 * O mesmo desenho serve aos dois sentidos da integração. Os oito passos ocupam as mesmas posições
 * (2 no primeiro sistema, 2 no WSH, 3 no terceiro e o destino); o perfil só diz o nome de cada um.
 * As chaves dos nós são posições: no recebimento, o primeiro sistema é o PDVSync e o terceiro é o WinThor.
 */
export interface SceneProfile {
  key: 'outbound' | 'inbound';
  nodeLabels: Readonly<Record<SceneNodeKey, string>>;
  /** Nome completo de cada passo, na ordem; sem ele valem os nomes do rastreio de lote. */
  stepLabels?: readonly string[];
  /** Nome curto dos sete passos que ficam dentro dos sistemas. */
  shortLabels: readonly string[];
  /** Destino único quando não há status por loja. */
  endpointLabel: string;
}

/** Envio: WinThor → WSH → PDVSync → lojas. */
export const OUTBOUND_SCENE: SceneProfile = {
  key: 'outbound',
  nodeLabels: { winthor: 'WinThor', wsh: 'WSH', pdvsync: 'PDVSync' },
  shortLabels: ['Login', 'Busca na API', 'JOLT', 'Login PDVSync', 'Abertura', 'Envio', 'Fechamento'],
  endpointLabel: 'PDV'
};

/** Recebimento pelo ERP (vendas, pedidos, caixa): PDVSync → WSH → WinThor → retaguarda. */
export const INBOUND_SCENE: SceneProfile = {
  key: 'inbound',
  nodeLabels: { winthor: 'PDVSync', wsh: 'WSH', pdvsync: 'WinThor' },
  stepLabels: [
    'Login no PDVSync',
    'Busca no PDVSync',
    'Transformação JOLT',
    'Login no WinThor',
    'Envio ao WinThor',
    'Resposta do WinThor',
    'Status de volta ao PDVSync',
    'Gravado na retaguarda'
  ],
  shortLabels: ['Login', 'Busca', 'JOLT', 'Login WinThor', 'Envio', 'Resposta', 'Status no PDVSync'],
  endpointLabel: 'Retaguarda'
};
