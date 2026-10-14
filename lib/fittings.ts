export const FITTING_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED'] as const;

export type FittingStatus = (typeof FITTING_STATUSES)[number];

/** Only SCHEDULED fittings block another booking at the same time. */
export function fittingBlocksCalendarSlot(status: FittingStatus | string | undefined): boolean {
  return (status ?? 'SCHEDULED') === 'SCHEDULED';
}

/** Compare by instant with seconds cleared — matches server and picker behaviour. */
export function isSameFittingTimeSlot(a: Date, b: Date): boolean {
  const na = new Date(a);
  na.setSeconds(0, 0);
  const nb = new Date(b);
  nb.setSeconds(0, 0);
  return na.getTime() === nb.getTime();
}

type ThemeColors = {
  success: string;
  warning: string;
  error: string;
  info: string;
};

export function getFittingStatusDisplayConfig(status: FittingStatus | undefined, colors: ThemeColors) {
  const value = status ?? 'SCHEDULED';

  switch (value) {
    case 'COMPLETED':
      return { backgroundColor: `${colors.success}1A`, textColor: colors.success };
    case 'CANCELLED':
      return { backgroundColor: `${colors.error}1A`, textColor: colors.error };
    case 'MISSED':
      return { backgroundColor: `${colors.warning}1A`, textColor: colors.warning };
    case 'SCHEDULED':
    default:
      return { backgroundColor: `${colors.info}1A`, textColor: colors.info };
  }
}

/** Most photos the backend accepts per fitting. */
export const MAX_FITTING_PHOTOS = 10;

export type FittingPayloadSource = {
  id?: string;
  scheduledAt: string;
  status?: FittingStatus;
  notes?: string | null;
  photos?: string[];
};

/** Body for one fitting in an order PUT. The server replaces all fittings, so photos must always be sent back. */
export function toFittingPayload(f: FittingPayloadSource) {
  return {
    id: f.id,
    scheduledAt: f.scheduledAt,
    status: f.status ?? 'SCHEDULED',
    notes: f.notes ?? null,
    photos: f.photos ?? [],
  };
}
