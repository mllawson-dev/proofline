import { STAGE_LABELS, STAGE_OWNER, type Stage } from '@/lib/types';
import styles from './StageChip.module.css';

export const OWNER_LABEL = { counter: 'Counter', design: 'Design', customer: 'Customer', production: 'Production', done: 'Done' } as const;

/** Stage name plus who owns the next move. The colored dot repeats the owner; the words carry the meaning. */
export function StageChip({ stage }: { stage: Stage }) {
  const owner = STAGE_OWNER[stage];
  return (
    <span className={styles.chip} data-owner={owner} title={`Next move: ${OWNER_LABEL[owner]}`}>
      <span className={styles.dot} aria-hidden="true" />
      {STAGE_LABELS[stage]}
    </span>
  );
}
