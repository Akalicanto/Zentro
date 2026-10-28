import { BriefcaseBusiness } from "lucide-react";
import type { Profile } from "../../../domain/index.ts";
import InlineEdit from "../../../shared/components/InlineEdit.tsx";
import { Surface } from "../../../shared/ui/index.tsx";

export default function SalaryReference({
  data,
  onSave,
}: {
  data: Profile;
  onSave: (profile: Profile) => boolean;
}) {
  return (
    <Surface
      component="section"
      className="salary-reference"
      aria-label="Salario neto mensual"
    >
      <div className="salary-reference-title">
        <span className="salary-reference-icon">
          <BriefcaseBusiness size={24} aria-hidden="true" />
        </span>
        <div>
          <h3>Salario neto mensual</h3>
          <p>Cifra mensual de referencia.</p>
        </div>
      </div>
      <span className="salary-reference-value">
        <InlineEdit
          label="Editar salario neto mensual"
          value={data.monthlyNetSalary ?? null}
          onSave={(value) =>
            onSave({ ...data, monthlyNetSalary: Number(value) })
          }
        />
      </span>
    </Surface>
  );
}
