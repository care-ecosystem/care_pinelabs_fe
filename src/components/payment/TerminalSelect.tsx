import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

import { FC, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Loader2Icon, AlertCircleIcon } from "lucide-react";
import { apis } from "@/apis";
import { I18NNAMESPACE } from "@/lib/constants";
import { cn } from "@/lib/utils";
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
  const { t } = useTranslation(I18NNAMESPACE);
  const [open, setOpen] = useState(false);
  const [showMineOnly, setShowMineOnly] = useState(true);

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
    queryKey: ["pinelabs_config", config?.id, "pos-terminals", showMineOnly],
    queryFn: () =>
      apis.pinelabs_config.getTerminals(config?.id || "", showMineOnly),
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

  const selectedTerminal = useMemo(
    () => terminals.find((terminal) => terminal.id === value),
    [terminals, value],
  );

  const handleSelect = useCallback(
    (terminalId: string) => {
      onValueChange?.(terminalId);
      const terminal = terminals.find((t) => t.id === terminalId);
      if (terminal) {
        fetchDeviceDetails(terminal.device.id);
      }
      setOpen(false);
    },
    [onValueChange, fetchDeviceDetails, terminals],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isDeviceLoading}
          className={cn(
            "flex h-10 min-h-10 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <span
            className={cn("truncate", !selectedTerminal && "text-gray-500")}
          >
            {selectedTerminal
              ? selectedTerminal.device.registered_name
              : t("select_pos_terminal")}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-gray-50">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              {t("available_terminals")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowMineOnly((prev) => !prev)}
            >
              {showMineOnly ? t("my_terminals") : t("all_terminals")}
            </Button>
          </div>
          <CommandList>
            {isConfigOrTerminalsLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 px-2">
                <Loader2Icon
                  role="status"
                  aria-label={t("loading_terminals")}
                  className="size-4 animate-spin"
                />
                <p className="text-sm text-gray-600">
                  {t("loading_terminals")}
                </p>
              </div>
            ) : configOrTerminalsError ? (
              <div className="flex items-center gap-2 py-4 px-2 text-sm text-red-600">
                <AlertCircleIcon className="size-4 flex-shrink-0" />
                <p>{t("failed_to_load_terminals")}</p>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="py-4 px-2 text-sm text-gray-500 text-center">
                    {showMineOnly
                      ? t("no_my_terminals_found")
                      : t("no_pos_terminals_configured")}
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {terminals.map((terminal) => (
                    <CommandItem
                      key={terminal.id}
                      value={terminal.device.registered_name}
                      onSelect={() => handleSelect(terminal.id)}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                        <span className="truncate">
                          {terminal.device.registered_name}
                        </span>
                        {terminal.device.metadata?.client_id && (
                          <span className="text-xs text-gray-500 truncate shrink-0">
                            ({terminal.device.metadata.client_id})
                          </span>
                        )}
                      </div>
                      {value === terminal.id && (
                        <Check className="size-4 text-gray-700 flex-shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
