import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { FC, useCallback, useMemo } from "react";
import { Loader2Icon, AlertCircleIcon } from "lucide-react";
import { apis } from "@/apis";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Device } from "@/types/device";

export type TerminalSelectProps = {
  facilityId: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onDeviceSelected?: (device: Device) => void;
  disabled?: boolean;
};

export const TerminalSelect: FC<TerminalSelectProps> = ({
  facilityId,
  value,
  onValueChange,
  onDeviceSelected,
  disabled,
}) => {
  const {
    data: config,
    isLoading: isConfigLoading,
    error: configError,
  } = useQuery({
    queryKey: ["pinelabs_config", facilityId],
    queryFn: () => apis.pinelabs_config.get(facilityId),
    enabled: !!facilityId,
    retry: 1,
  });

  const {
    data: posTerminals,
    isLoading: isTerminalsLoading,
    error: terminalsError,
  } = useQuery({
    queryKey: ["pinelabs_config", config?.id, "pos-terminals"],
    queryFn: () => apis.pinelabs_config.getTerminals(config?.id || ""),
    enabled: !!config?.id,
    retry: 1,
  });

  const isConfigOrTerminalsLoading = isConfigLoading || isTerminalsLoading;
  const configOrTerminalsError = configError || terminalsError;

  const { mutate: fetchDeviceDetails, isPending: isDeviceLoading } =
    useMutation({
      mutationFn: (deviceId: string) => {
        return apis.devices.retrieve(facilityId, deviceId);
      },
      onSuccess: (device) => {
        onDeviceSelected?.(device);
      },
    });

  const terminals = useMemo(() => posTerminals ?? [], [posTerminals]);

  const handleValueChange = useCallback((terminalId: string) => {
    onValueChange?.(terminalId);
    const terminal = terminals.find((t) => t.id === terminalId);
    if (terminal) {
      fetchDeviceDetails(terminal.device.id);
    }
  }, [onValueChange, fetchDeviceDetails, terminals]);

  return (
    <Select 
      value={value} 
      onValueChange={handleValueChange} 
      disabled={disabled || isDeviceLoading}
    >
      <SelectTrigger className="w-full h-10 min-h-10 px-3 py-2">
        <SelectValue placeholder="Select the POS Terminal" />
      </SelectTrigger>
      <SelectContent>
        {isConfigOrTerminalsLoading ? (
          <div className="flex items-center justify-center gap-2 py-2 px-2">
            <Loader2Icon
              role="status"
              aria-label="Loading terminals"
              className="size-4 animate-spin"
            />
            <p className="text-sm text-gray-600">Loading terminals...</p>
          </div>
        ) : configOrTerminalsError ? (
          <div className="flex items-center gap-2 py-2 px-2 text-sm text-red-600">
            <AlertCircleIcon className="size-4 flex-shrink-0" />
            <p>Failed to load terminals</p>
          </div>
        ) : terminals.length === 0 ? (
          <div className="py-2 px-2 text-sm text-gray-500 text-center">
            No POS terminals configured
          </div>
        ) : (
          <SelectGroup>
            <SelectLabel>Available Terminals</SelectLabel>
            {terminals.map((terminal) => (
              <SelectItem key={terminal.id} value={terminal.id}>
                <div className="flex flex-col">
                  <span>{terminal.device.registered_name}</span>
                  {terminal.device.metadata?.client_id && (
                    <span className="text-xs text-gray-500">
                      ({terminal.device.metadata.client_id})
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
};