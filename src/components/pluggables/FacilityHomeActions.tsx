import { FC } from "react";
import { navigate } from "raviger";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { SettingsIcon } from "lucide-react";
import { Facility } from "@/types/facility";

type FacilityHomeActionsProps = {
  facility: Facility;
  className?: string;
};

const FacilityHomeActions: FC<FacilityHomeActionsProps> = ({ facility }) => {
  const { t } = useTranslation(I18NNAMESPACE);

  if (!facility) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() =>
        navigate(`/facility/${facility.id}/settings/general/pinelabs`)
      }
      className="hover:bg-gray-100 hover:text-gray-900 flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
    >
      <SettingsIcon className="size-4 text-gray-500" />
      {t("configure_pinelabs")}
    </button>
  );
};

export default FacilityHomeActions;
