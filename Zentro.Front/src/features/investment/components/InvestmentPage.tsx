import PageHeading from "../../../shared/components/PageHeading.tsx";
import HistoryYearFilter from "../../history/components/HistoryYearFilter.tsx";
import { type Profile } from "../../../domain/index.ts";
import { type OpenProfileForm } from "../../profile/types.ts";
import { type HistoryControls } from "../../history/hooks/useHistoryView.ts";
import MonthlyHistory from "../../history/components/MonthlyHistory.tsx";

type Props = {
  data: Profile;
  open: OpenProfileForm;
  controls: HistoryControls;
};
export default function InvestmentPage(props: Props) {
  return (
    <>
      <PageHeading
        title="Inversión"
        actions={
          <HistoryYearFilter
            data={props.data}
            kind="investment"
            controls={props.controls}
          />
        }
      />
      <MonthlyHistory kind="investment" hideYearFilter {...props} />
    </>
  );
}
