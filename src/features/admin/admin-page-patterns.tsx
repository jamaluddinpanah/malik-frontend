import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import { LoadingState } from '@/shared/ui/feedback';
import styles from './admin-patterns.module.css';

export function AdminPageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
}: {
  icon?: ComponentType<LucideProps> | null;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderMain}>
        {Icon ? (
          <span className={styles.pageHeaderIcon}>
            <Icon size={22} />
          </span>
        ) : null}
        <div className={styles.pageHeaderCopy}>
          {eyebrow ? <div className={styles.pageHeaderEyebrow}>{eyebrow}</div> : null}
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {actions ? <div className={styles.pageHeaderActions}>{actions}</div> : null}
    </header>
  );
}

export function AdminLoadingState({ label }: { label?: string }) {
  return (
    <div className={styles.loadingSurface}>
      <LoadingState label={label} />
    </div>
  );
}
