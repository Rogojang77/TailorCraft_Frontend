import React from 'react';
import { Share } from 'lucide-react-native';
import { AppFloatingFooter } from '@/components/AppFloatingFooter';
import { useTheme } from '@/contexts/ThemeContext';

export interface OrderPdfActionsProps {
  onExportPDF: () => void | Promise<void>;
  onSharePDF: () => void | Promise<void>;
  isExporting: boolean;
  t: (key: string) => string;
}

export function OrderPdfActions({
  onExportPDF,
  onSharePDF,
  isExporting,
  t,
}: OrderPdfActionsProps) {
  const { colors } = useTheme();

  return (
    <AppFloatingFooter
      primaryLabel={isExporting ? t('orderDetails.generatingPdf') : t('orderDetails.downloadPdf')}
      onPrimaryPress={onExportPDF}
      primaryDisabled={isExporting}
      primaryLoading={isExporting}
      secondaryLabel={t('orderDetails.share')}
      onSecondaryPress={onSharePDF}
      secondaryDisabled={isExporting}
      secondaryIcon={<Share size={20} color={colors.textSecondary} strokeWidth={2.5} />}
      secondaryBordered
    />
  );
}

