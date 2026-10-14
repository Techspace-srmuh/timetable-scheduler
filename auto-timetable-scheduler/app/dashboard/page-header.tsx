import type { ReactNode } from "react";
import styles from "./page-header.module.css";

type DashboardPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  controls?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
};

export default function DashboardPageHeader({
  eyebrow,
  title,
  description,
  controls,
  metadata,
  actions,
}: DashboardPageHeaderProps) {
  return (
    <header className={styles.container} aria-labelledby="dashboard-page-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 id="dashboard-page-title" className={styles.title}>
          {title}
        </h1>
        <p className={styles.description}>{description}</p>
        {controls && <div className={styles.controls}>{controls}</div>}
      </div>

      {(metadata || actions) && (
        <div className={styles.right}>
          {metadata && <div className={styles.metadata}>{metadata}</div>}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
    </header>
  );
}
