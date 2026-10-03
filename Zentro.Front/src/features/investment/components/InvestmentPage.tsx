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
  return <MonthlyHistory kind="investment" {...props} />;
}
