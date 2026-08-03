import { FC, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2Icon } from "lucide-react";
import { apis } from "@/apis";
import { I18NNAMESPACE } from "@/lib/constants";
import { Device } from "@/types/device";

export type TerminalSelectProps = {
  facilityId: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  onTerminalDataChange?: (data: Device | null) => void;
};

export const TerminalSelect: FC<TerminalSelectProps> = ({
  facilityId,
  value,
  onValueChange,
  disabled,
  onTerminalDataChange,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);

  const { data: devicesData, isLoading: isDevicesLoading } = useQuery({
    queryKey: ["pinelabs_terminals", facilityId, "pos-terminal"],
    queryFn: () =>
      apis.devices.list(facilityId, {
        care_type: "pos-terminal",
        limit: 100,
        offset: 0,
      }),
    enabled: !!facilityId,
  });

  // Fetch selected device details
  const { data: selectedDeviceData } = useQuery({
    queryKey: ["pinelabs_terminals", facilityId, value],
    queryFn: () =>
      value ? apis.devices.retrieve(facilityId, value) : Promise.resolve(null),
    enabled: !!value && !!facilityId,
  });

  // Notify parent when device data changes
  useEffect(() => {
    if (selectedDeviceData) {
      onTerminalDataChange?.(selectedDeviceData);
    }
  }, [selectedDeviceData, onTerminalDataChange]);

  const devices = devicesData?.results || [];

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={t("select_terminal")} />
      </SelectTrigger>
      <SelectContent>
        {isDevicesLoading ? (
          <div className="flex items-center justify-center gap-2 p-2">
            <Loader2Icon role="status" aria-label="Loading" className="size-4 animate-spin" />
            <p className="text-sm text-gray-600">{t("loading")}</p>
          </div>
        ) : devices.length > 0 ? (
          <SelectGroup>
            <SelectLabel>{t("terminal")}</SelectLabel>
            {devices.map((device) => (
              <SelectItem key={device.id} value={device.id}>
                <span>{device.registered_name}</span>
                {device.status === "inactive" && (
                  <span className="text-gray-400 ml-2">(Inactive)</span>
                )}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : (
          <div className="p-2 text-center text-sm text-gray-500">
            {t("no_terminals_available")}
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

export default TerminalSelect;