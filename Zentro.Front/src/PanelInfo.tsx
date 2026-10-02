import { Info } from "lucide-react";
import type { ReactNode } from "react";

export default function PanelInfo({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="panel-help">
      <details
        className="panel-info"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.currentTarget.open = false;
            event.currentTarget.querySelector("summary")?.focus();
          }
        }}
      >
        <summary
          aria-label={`Información de ${title}`}
          title={`Información de ${title}`}
        >
          <Info size={19} aria-hidden="true" />
        </summary>
        <div className="panel-info-content" role="note">
          <strong>{title}</strong>
          <p>{children}</p>
        </div>
      </details>
    </div>
  );
}
