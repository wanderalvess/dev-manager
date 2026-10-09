import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const FONT_SCALE = {
  selector: "Literal[value=/text-\\[1[12]px\\]/], TemplateElement[value.raw=/text-\\[1[12]px\\]/]",
  message: 'Use text-2xs (11px) ou text-xs (12px) da escala do tema.'
};
const GRAY_TOKENS = {
  selector:
    "Literal[value=/\\b(text|bg|border)-(slate|zinc|neutral|gray)-\\d/], TemplateElement[value.raw=/\\b(text|bg|border)-(slate|zinc|neutral|gray)-\\d/]",
  message: 'Use os tokens do tema (foreground, muted-foreground, card, border). Cinza cru só em console/terminal.'
};
const MODAL_SHELL = {
  selector: "Literal[value=/\\bfixed inset-0\\b/], TemplateElement[value.raw=/\\bfixed inset-0\\b/]",
  message: 'Diálogos usam components/ui/Modal. Menus de clique-fora são a exceção.'
};

// Superfícies escuras por definição (console, terminal, log, bloco de código): cinza cru é permitido.
const DARK_SURFACES = [
  'src/renderer/src/components/terminal/**', 'src/renderer/src/components/TerminalViewer.tsx',
  'src/renderer/src/components/logs/LogLine.tsx', 'src/renderer/src/components/markdown/Markdown*.tsx',
  'src/renderer/src/components/AiMarkdownViewer.tsx', 'src/renderer/src/components/quality/testrunners/ConsolePanel.tsx',
  'src/renderer/src/components/quality/taut/**', 'src/renderer/src/components/karaf/modals/Karaf*Modal.tsx',
  'src/renderer/src/components/karaf/features/KarafFeaturesLogDrawer.tsx', 'src/renderer/src/components/containers/modals/ContainerLogsModal.tsx',
  'src/renderer/src/components/database/grid/ResultsGridCellContent.tsx', 'src/renderer/src/components/database/backup/BackupCustomCommandPanel.tsx',
  'src/renderer/src/components/apm/ApmSetupModal.tsx', 'src/renderer/src/components/apm/dashboard/ApmDashboard{Standby,TimeChart}.tsx',
  'src/renderer/src/components/onboarding/WelcomeIntro.tsx', 'src/renderer/src/components/settings/dirs/DirsWinthorStartPanel.tsx',
  'src/renderer/src/main.tsx', 'src/renderer/src/utils/terminalViewerUtils*.ts'
];
// Menus/dropdowns e o tour usam fixed inset-0 só como camada de clique-fora/spotlight, não como diálogo.
const CLICK_AWAY_LAYERS = [
  'src/renderer/src/components/database/grid/ResultsGrid*Menu.tsx', 'src/renderer/src/components/database/sqleditor/SqlSnippetsMenu.tsx',
  'src/renderer/src/components/deploy/DeployProfileMenu.tsx', 'src/renderer/src/components/environment/ProfileActionsMenu.tsx',
  'src/renderer/src/components/karaf/KarafHeaderActions.tsx', 'src/renderer/src/components/settings/Settings*.tsx',
  'src/renderer/src/components/onboarding/OnboardingTour.tsx', 'src/renderer/src/components/onboarding/tour/**',
  'src/renderer/src/components/ui/Modal.tsx'
];

export default tseslint.config(
  { ignores: ['dist', 'dist-electron', 'release', 'node_modules'] },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Travas da auditoria de UI: diálogo nativo e escalas paralelas não voltam.
      'no-restricted-globals': [
        'error',
        { name: 'confirm', message: 'Use requestConfirm (components/ui/confirmService).' },
        { name: 'alert', message: 'Use showNotice (components/ui/confirmService) ou um toast.' }
      ],
      'no-restricted-syntax': ['warn', FONT_SCALE, GRAY_TOKENS, MODAL_SHELL]
    }
  },
  {
    files: DARK_SURFACES,
    rules: { 'no-restricted-syntax': ['warn', FONT_SCALE] }
  },
  {
    files: CLICK_AWAY_LAYERS,
    rules: { 'no-restricted-syntax': ['warn', FONT_SCALE, GRAY_TOKENS] }
  },
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'src/server/**/*.ts', 'src/mcp/**/*.ts', 'src/shared/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  }
);
