export type ManchesterColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue';

export interface ManchesterLevel {
  color: ManchesterColor;
  label: string;
  sublabel: string;
  waitTime: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  headerBg: string;
  textColor: string;
  iconColor: string;
  recommendation: string;
  facility: 'SAMU / Emergência' | 'UPA 24h' | 'UPA ou Hospital' | 'UBS / Posto de Saúde' | 'UBS / Acolhimento';
}

export const MANCHESTER_LEVELS: Record<ManchesterColor, ManchesterLevel> = {
  red: {
    color: 'red',
    label: 'Vermelho - Emergência',
    sublabel: 'Risco imediato de morte ou complicação severa',
    waitTime: 'Atendimento Imediato (0 min)',
    badgeBg: 'bg-red-600',
    badgeBorder: 'border-red-700',
    badgeText: 'text-white',
    headerBg: 'bg-gradient-to-r from-red-600 to-rose-700',
    textColor: 'text-red-700',
    iconColor: '#DC2626',
    recommendation: 'Acione o SAMU 192 imediatamente ou dirija-se à Emergência hospitalar mais próxima.',
    facility: 'SAMU / Emergência',
  },
  orange: {
    color: 'orange',
    label: 'Laranja - Muito Urgente',
    sublabel: 'Risco potencial elevado ou dor aguda intensa',
    waitTime: 'Até 10 minutos',
    badgeBg: 'bg-amber-600',
    badgeBorder: 'border-amber-700',
    badgeText: 'text-white',
    headerBg: 'bg-gradient-to-r from-amber-600 to-orange-700',
    textColor: 'text-amber-800',
    iconColor: '#EA580C',
    recommendation: 'Dirija-se imediatamente à UPA 24h mais próxima. Não aguarde em casa.',
    facility: 'UPA 24h',
  },
  yellow: {
    color: 'yellow',
    label: 'Amarelo - Urgente',
    sublabel: 'Condição que necessita de avaliação médica rápida',
    waitTime: 'Até 60 minutos',
    badgeBg: 'bg-yellow-500',
    badgeBorder: 'border-yellow-600',
    badgeText: 'text-neutral-900 font-bold',
    headerBg: 'bg-gradient-to-r from-yellow-500 to-amber-600',
    textColor: 'text-yellow-800',
    iconColor: '#EAB308',
    recommendation: 'Procure uma UPA 24h ou sua Unidade Básica de Saúde para consulta médica no mesmo dia.',
    facility: 'UPA ou Hospital',
  },
  green: {
    color: 'green',
    label: 'Verde - Pouco Urgente',
    sublabel: 'Condição estável sem sinais iminentes de gravidade',
    waitTime: 'Até 120 minutos',
    badgeBg: 'bg-emerald-600',
    badgeBorder: 'border-emerald-700',
    badgeText: 'text-white',
    headerBg: 'bg-gradient-to-r from-emerald-600 to-teal-700',
    textColor: 'text-emerald-800',
    iconColor: '#16A34A',
    recommendation: 'Procure atendimento na Unidade Básica de Saúde (Posto de Saúde/ESF) do seu bairro.',
    facility: 'UBS / Posto de Saúde',
  },
  blue: {
    color: 'blue',
    label: 'Azul - Não Urgente',
    sublabel: 'Quadro de baixa complexidade ou acompanhamento rotineiro',
    waitTime: 'Até 240 minutos',
    badgeBg: 'bg-blue-600',
    badgeBorder: 'border-blue-700',
    badgeText: 'text-white',
    headerBg: 'bg-gradient-to-r from-blue-600 to-indigo-700',
    textColor: 'text-blue-800',
    iconColor: '#2563EB',
    recommendation: 'Agende atendimento na sua UBS de referência para acompanhamento e orientações preventivas.',
    facility: 'UBS / Acolhimento',
  },
};

export const MANDATORY_LEGAL_DISCLAIMER = 
  'Esta ferramenta é exclusivamente para orientação e triagem prévia e educacional. Não substitui consulta médica presencial. NUNCA utilize este relatório para automedicação. Em caso de urgência ou agravamento, procure imediatamente a UPA mais próxima ou ligue 192 (SAMU).';
