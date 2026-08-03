import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import PluginComponent from "@/components/ui/plug-component";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";

interface Props {
  device: {
    id: string;
    care_type: string;
    care_metadata: {
      terminal_name?: string;
      client_id?: string;
      store_id?: string;
      is_active?: boolean;
    };
  };
  onEdit?: () => void;
}

export const PinelabsShowPageCard = ({
  device,
}: Props) => {
  const { t } = useTranslation(I18NNAMESPACE);

  return (
    <PluginComponent>
      {/* Outer Card with Header */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>{t("device_configuration_title")}</CardTitle>
        </CardHeader>

        {/* Inner Content Area */}
        <CardContent className="pt-0">
          {/* Terminal Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Client ID */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">
                {t("client_id")}
              </h4>
              <p className="text-base font-medium text-gray-900">
                {device.care_metadata.client_id || "-"}
              </p>
            </div>

            {/* Store ID */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">
                {t("store_id")}
              </h4>
              <p className="text-base font-medium text-gray-900">
                {device.care_metadata.store_id || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </PluginComponent>
  );
};

export default PinelabsShowPageCard;