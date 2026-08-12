import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE, PLUGIN_SLUG } from "@/lib/constants";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ChevronDown,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { navigate } from "raviger";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apis } from "@/apis";
import { cn, sleep, toast } from "@/lib/utils";
import {
  getPaymentMethodOptions,
  PINELABS_PAYMENT_MODES,
  PinelabsPaymentModeEnum,
} from "@/lib/paymentMethods";
import { PaymentReconciliationPaymentMethod } from "@/types/payment_reconciliation";
import {
  CreatePinelabsConfigBody,
  UpdatePinelabsConfigBody,
} from "@/types/pinelabs_config";
import { Device } from "@/types/device";
import { PlugConfigMeta } from "@/types/plugin";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"

const CARE_METHOD_OPTIONS = getPaymentMethodOptions();

const PAYMENT_FLOW_OPTIONS = [
  { value: "pinelabs", labelKey: "payment_flow_pinelabs" },
  { value: "native", labelKey: "payment_flow_native" },
];

function getPluginConfig(): PlugConfigMeta | null {
  try {
    if (!window.__CARE_PLUGIN_RUNTIME__?.meta?.[PLUGIN_SLUG]) {
      return null;
    }
    return window.__CARE_PLUGIN_RUNTIME__.meta[PLUGIN_SLUG] as PlugConfigMeta;
  } catch (error) {
    console.warn("Error accessing plugin runtime config:", error);
    return null;
  }
}

const SEARCH_DEBOUNCE_INTERVAL = 500;

const MONOSPACE_FONT_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

type PinelabsConfigurePageProps = {
  facilityId: string;
};

type SheetStep = "form" | "terminals";

const PinelabsConfigurePage: FC<PinelabsConfigurePageProps> = ({
  facilityId,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [step, setStep] = useState<SheetStep>("form");
  const [editingConfig, setEditingConfig] = useState(false);
  const [terminalDeviceSearch, setTerminalDeviceSearch] = useState("");
  const [terminalPickerOpen, setTerminalPickerOpen] = useState(false);
  const [showSecurityToken, setShowSecurityToken] = useState(false);
  const [terminalsBaseline, setTerminalsBaseline] = useState<string[]>([]);
  const [deviceInfoCache, setDeviceInfoCache] = useState<
    Record<string, Pick<Device, "id" | "registered_name">>
  >({});
  const [pluginConfig, setPluginConfig] = useState<PlugConfigMeta | null>(
    null,
  );

  const queryClient = useQueryClient();

  useEffect(() => {
    setPluginConfig(getPluginConfig());
  }, []);

  const fieldEnabled = (fieldKey: string): boolean =>
    pluginConfig?.config?.[fieldKey] === true;

  const goBackToFacility = () => {
    navigate(`/facility/${facilityId}/settings/general`);
  };

  const closeConfigureSheet = () => {
    goBackToFacility();
  };

  // Form for creating/editing config
  const createConfigForm = useForm<CreatePinelabsConfigBody>({
    defaultValues: {
      facility_id: facilityId,
      default_payment_flow: "pinelabs" as const,
      pinelabs_merchant_id: "",
      pinelabs_security_token: "",
      meta: {},
      payment_method_mappings: [
        {
          care_method: PaymentReconciliationPaymentMethod.debc,
          pinelabs_method: PinelabsPaymentModeEnum.CARD,
          is_default: true,
        },
      ],
      pos_terminals: [],
    },
  });

  // Field array for payment method mappings
  const { fields, append, remove } = useFieldArray({
    control: createConfigForm.control,
    name: "payment_method_mappings",
  });

  // Watch payment method mappings to filter dropdown options
  const paymentMethodMappings = useWatch({
    control: createConfigForm.control,
    name: "payment_method_mappings",
  });

  const allowManualEntryWatched = useWatch({
    control: createConfigForm.control,
    name: "meta.allow_manual_entry",
  });
  const defaultPaymentFlowWatched = useWatch({
    control: createConfigForm.control,
    name: "default_payment_flow",
  });
  const manualEntryDisabled =
    fieldEnabled("allow_manual_entry") && !allowManualEntryWatched;

  useEffect(() => {
    if (manualEntryDisabled && defaultPaymentFlowWatched === "native") {
      createConfigForm.setValue("default_payment_flow", "pinelabs", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [manualEntryDisabled, defaultPaymentFlowWatched, createConfigForm]);

  // Field array for POS terminals
  const {
    fields: terminalFields,
    append: appendTerminal,
    remove: removeTerminal,
  } = useFieldArray({
    control: createConfigForm.control,
    name: "pos_terminals",
  });

  // Watch terminals to filter devices already selected
  const terminals = useWatch({
    control: createConfigForm.control,
    name: "pos_terminals",
  });

  const hasTerminalChanges =
    JSON.stringify([...(terminals ?? []).map((t) => t.device_id)].sort()) !==
    JSON.stringify([...terminalsBaseline].sort());

  const {
    data: config,
    isLoading: isConfigLoading,
    refetch: refetchConfig,
  } = useQuery({
    queryKey: ["pinelabs_config", facilityId],
    queryFn: () => apis.pinelabs_config.get(facilityId),
    enabled: !!facilityId,
    retry: false,
  });

  const {
    data: posTerminals,
    isError: isTerminalsError,
    refetch: refetchTerminals,
  } = useQuery({
    queryKey: ["pinelabs_config", config?.id, "pos-terminals"],
    queryFn: () =>
      config?.id
        ? apis.pinelabs_config.getTerminals(config.id)
        : Promise.resolve([]),
    enabled: !!config?.id,
    retry: 1,
  });

  useEffect(() => {
    if (!posTerminals?.length) return;
    setDeviceInfoCache((prev) => {
      const next = { ...prev };
      posTerminals.forEach((t) => {
        next[t.device.id] = {
          id: t.device.id,
          registered_name: t.device.registered_name,
        };
      });
      return next;
    });
  }, [posTerminals]);

  const {
    data: deviceSearchData,
    isFetching: isSearchingDevices,
    fetchNextPage: fetchNextDevicePage,
    hasNextPage: hasMoreDevices,
    isFetchingNextPage: isFetchingMoreDevices,
    error: deviceSearchError,
  } = useInfiniteQuery({
    queryKey: [
      "facilities",
      facilityId,
      "devices-for-config",
      terminalDeviceSearch,
    ],
    queryFn: async ({ pageParam, signal }) => {
      if (!facilityId) throw new Error("Facility ID is required");
      if (pageParam === 0) {
        await sleep(SEARCH_DEBOUNCE_INTERVAL);
      }
      return apis.devices.list(
        facilityId,
        {
          care_type: "pos-terminal",
          limit: DEFAULT_PAGE_SIZE,
          offset: pageParam,
          search_text: terminalDeviceSearch || undefined,
        },
        signal,
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const fetchedCount = allPages.reduce(
        (sum, page) => sum + page.results.length,
        0,
      );
      return fetchedCount < lastPage.count ? fetchedCount : undefined;
    },
    enabled: !!facilityId && step === "terminals" && terminalPickerOpen,
    retry: false,
  });

  const deviceSearchResults = useMemo(
    () => deviceSearchData?.pages.flatMap((page) => page.results) ?? [],
    [deviceSearchData],
  );

  // Create config mutation
  const createConfigMutation = useMutation({
    mutationFn: (data: CreatePinelabsConfigBody) => {
      const { pos_terminals, ...configData } = data;
      return apis.pinelabs_config.create(configData as CreatePinelabsConfigBody);
    },
    onSuccess: (createdConfig) => {
      toast.success(t("configuration_created_successfully"));

      const terminalDeviceIds = (createConfigForm.getValues("pos_terminals") ?? [])
        .map((t) => t.device_id);

      if (terminalDeviceIds.length > 0) {
        linkTerminalsMutation.mutate(
          {
            configId: createdConfig.id,
            deviceIds: terminalDeviceIds,
          },
          {
            onSuccess: () => {
              createConfigForm.reset();
              goBackToFacility();
            },
          },
        );
      } else {
        refetchConfig();
        createConfigForm.reset();
        goBackToFacility();
      }
    },
    onError: (error: any) => {
      const errorMsg =
        error?.response?.data?.errors?.[0]?.msg ||
        t("failed_to_create_configuration");
      toast.error(errorMsg);
      console.error(error);
    },
  });

  const linkTerminalsMutation = useMutation({
    mutationFn: async (params: { configId: string; deviceIds: string[] }) => {
      if (!params.configId) {
        throw new Error("Missing config id");
      }
      return apis.pinelabs_config.linkTerminals(params.configId, params.deviceIds);
    },
    onSuccess: (_data, variables) => {
      toast.success(t("pos_terminals_updated_successfully"));
      setTerminalsBaseline(variables.deviceIds);
      setTimeout(() => {
        refetchConfig();
        refetchTerminals();
        queryClient.invalidateQueries({
          queryKey: ["pinelabs_config", variables.configId, "pos-terminals"],
        });
      }, 500);
    },
    onError: (error: any) => {
      const errorMsg =
        error?.response?.data?.errors?.[0]?.msg ||
        t("failed_to_update_pos_terminals");
      toast.error(errorMsg);
      console.error(error);
    },
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: (data: UpdatePinelabsConfigBody) => {
      if (!config) throw new Error("Config not found");
      const { pos_terminals, ...configData } = data;
      return apis.pinelabs_config.update(config.id, configData);
    },
    onSuccess: (_updatedConfig, variables) => {
      toast.success(t("configuration_updated_successfully"));
      queryClient.invalidateQueries({
        queryKey: ["pinelabs_config", facilityId],
      });

      if (config) {
        if (hasTerminalChanges) {
          const terminalDeviceIds = (variables.pos_terminals ?? []).map(
            (t) => t.device_id,
          );
          linkTerminalsMutation.mutate(
            {
              configId: config.id,
              deviceIds: terminalDeviceIds,
            },
            { onSuccess: () => goBackToFacility() },
          );
        } else {
          goBackToFacility();
        }
      }
    },
    onError: (error: any) => {
      const errorMsg =
        error?.response?.data?.errors?.[0]?.msg ||
        t("failed_to_update_configuration");
      toast.error(errorMsg);
      console.error(error);
    },
  });

  const onCreateConfigSubmit = (data: CreatePinelabsConfigBody) => {
    const hasDefault = data.payment_method_mappings.some((m) => m.is_default);
    if (!hasDefault) {
      toast.error(t("at_least_one_payment_method_must_be_default"));
      return;
    }

    if (editingConfig && config) {
      const updateData: UpdatePinelabsConfigBody = {
        default_payment_flow: data.default_payment_flow,
        allow_advance_payment: data.allow_advance_payment ?? true,
        allow_partial_payment: data.allow_partial_payment ?? true,
        pinelabs_merchant_id: data.pinelabs_merchant_id,
        meta: {
          allow_manual_entry: data.meta?.allow_manual_entry ?? true,
        },
        ...(data.pinelabs_security_token && {
          pinelabs_security_token: data.pinelabs_security_token,
        }),
        payment_method_mappings: data.payment_method_mappings,
        pos_terminals: data.pos_terminals,
      };
      updateConfigMutation.mutate(updateData);
    } else {
      createConfigMutation.mutate({
        ...data,
        facility_id: facilityId,
        allow_advance_payment: data.allow_advance_payment ?? true,
        allow_partial_payment: data.allow_partial_payment ?? true,
        meta: {
          allow_manual_entry: data.meta?.allow_manual_entry ?? true,
        },
      });
    }
  };

  const handleEditConfig = () => {
    if (config) {
      createConfigForm.reset({
        facility_id: config.facility_id,
        default_payment_flow: config.default_payment_flow as any,
        allow_advance_payment: config.allow_advance_payment ?? true,
        allow_partial_payment: config.allow_partial_payment ?? true,
        pinelabs_merchant_id: config.pinelabs_merchant_id,
        pinelabs_security_token: "",
        meta: {
          allow_manual_entry: config.meta?.allow_manual_entry ?? true,
        },
        payment_method_mappings: config.payment_method_mappings.map((m) => ({
          care_method: m.care_method,
          pinelabs_method: m.pinelabs_method,
          is_default: m.is_default,
        })),
        pos_terminals: (posTerminals ?? []).map((t) => ({
          device_id: t.device.id,
        })),
      });
      setTerminalsBaseline((posTerminals ?? []).map((t) => t.device.id));
      setShowSecurityToken(false);
      setEditingConfig(true);
    }
  };

  useEffect(() => {
    const terminalsSettled = posTerminals !== undefined || isTerminalsError;
    if (config && terminalsSettled) {
      handleEditConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, posTerminals, isTerminalsError]);

  const getAvailableCareMethodsForIndex = () => {
    return CARE_METHOD_OPTIONS;
  };

  const getFirstAvailableCareMethod = () => {
    return CARE_METHOD_OPTIONS[0];
  };

  const getAvailablePinelabsModesForIndex = (currentIndex: number) => {
    const selectedModes = paymentMethodMappings
      ?.map((mapping, index) => {
        if (index === currentIndex) return null;
        return mapping.pinelabs_method;
      })
      .filter(Boolean) as string[];

    return PINELABS_PAYMENT_MODES.filter(
      (mode) => !selectedModes?.includes(mode.value)
    );
  };

  const getFirstAvailablePinelabsMode = () => {
    const selectedModes = (paymentMethodMappings ?? [])
      .map((mapping) => mapping.pinelabs_method)
      .filter(Boolean) as string[];

    return PINELABS_PAYMENT_MODES.find(
      (mode) => !selectedModes.includes(mode.value)
    );
  };

  const availableDeviceResults = deviceSearchResults.filter((device) => {
    if (device.status !== "active") return false;
    const isAlreadyAdded = terminals?.some(
      (t) => t.device_id === device.id
    );
    return !isAlreadyAdded;
  });

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) closeConfigureSheet();
      }}
    >
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {isConfigLoading ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <Loader2Icon className="size-5 animate-spin text-black" />
            <p className="text-sm text-black">{t("loading_configuration")}</p>
          </div>
        ) : (
          <div className="space-y-6">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">
              {step === "terminals"
                ? t("pos_terminals")
                : editingConfig
                  ? t("edit_configuration")
                  : t("create_configuration")}
            </SheetTitle>
          </SheetHeader>

          {step === "form" && (
              <div>
                <Form {...createConfigForm}>
                  <form
                    onSubmit={createConfigForm.handleSubmit(onCreateConfigSubmit)}
                    className="space-y-6"
                  >
                    {/* Basic Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">{t("basic_settings")}</h3>

                      <FormField
                        control={createConfigForm.control}
                        name="default_payment_flow"
                        rules={{ required: t("payment_flow_required") }}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel aria-required>{t("payment_flow")}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full" ref={field.ref}>
                                  <SelectValue placeholder={t("select_payment_flow")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PAYMENT_FLOW_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    disabled={
                                      option.value === "native" &&
                                      manualEntryDisabled
                                    }
                                  >
                                    {t(option.labelKey)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {manualEntryDisabled
                                ? t("pinelabs_flow_requires_manual_entry")
                                : t("choose_pinelabs_or_native")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                          control={createConfigForm.control}
                          name="pinelabs_merchant_id"
                          rules={{ required: t("merchant_id_required") }}
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel aria-required>{t("merchant_id")}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t("merchant_id_placeholder")}
                                  {...field}
                                  className="font-mono"
                                  style={{ fontFamily: MONOSPACE_FONT_STACK }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createConfigForm.control}
                          name="pinelabs_security_token"
                          rules={{
                            required: !editingConfig && t("security_token_required"),
                          }}
                          render={({ field }) => {
                            const canToggleVisibility = !editingConfig || !!field.value;
                            return (
                              <FormItem className="flex flex-col">
                                <FormLabel aria-required>{t("security_token")}</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={
                                        canToggleVisibility && showSecurityToken
                                          ? "text"
                                          : "password"
                                      }
                                      placeholder={
                                        editingConfig
                                          ? "••••••••••••••••"
                                          : t("enter_security_token")
                                      }
                                      {...field}
                                      className={canToggleVisibility ? "pr-10" : undefined}
                                    />
                                    {canToggleVisibility && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setShowSecurityToken((prev) => !prev)
                                        }
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                                        aria-label={
                                          showSecurityToken
                                            ? t("hide_security_token")
                                            : t("show_security_token")
                                        }
                                      >
                                        {showSecurityToken ? (
                                          <EyeOffIcon className="size-4" />
                                        ) : (
                                          <EyeIcon className="size-4" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </FormControl>
                                {editingConfig && (
                                  <FormDescription>
                                    {t("leave_empty_to_keep_existing_token")}
                                  </FormDescription>
                                )}
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                    </div>

                    {/* Payment Features */}
                    {(fieldEnabled("allow_advance_payment") ||
                      fieldEnabled("allow_partial_payment") ||
                      fieldEnabled("allow_manual_entry")) && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t("payment_features")}</h3>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {fieldEnabled("allow_advance_payment") && (
                            <FormField
                              control={createConfigForm.control}
                              name="allow_advance_payment"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border p-2">
                                  <div className="space-y-0.5">
                                    <FormLabel>{t("advance_payment")}</FormLabel>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value ?? false}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}

                          {fieldEnabled("allow_partial_payment") && (
                            <FormField
                              control={createConfigForm.control}
                              name="allow_partial_payment"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border p-2">
                                  <div className="space-y-0.5">
                                    <FormLabel>{t("partial_payment")}</FormLabel>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value ?? false}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}

                          {fieldEnabled("allow_manual_entry") && (
                            <FormField
                              control={createConfigForm.control}
                              name="meta.allow_manual_entry"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border p-2">
                                  <div className="space-y-0.5">
                                    <FormLabel>{t("manual_entry")}</FormLabel>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value ?? false}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* POS Terminals */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">{t("pos_terminals")}</h3>

                      <div className="flex items-center justify-between rounded-md border p-2">
                        <span className="text-sm text-gray-700">
                          {terminalFields.length > 0
                            ? t("terminal_linked_count", {
                                count: terminalFields.length,
                              })
                            : t("no_terminals_linked")}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setStep("terminals")}
                        >
                          {t("manage_terminals")}
                        </Button>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">{t("payment_methods")}</h3>

                      <div className="space-y-3">
                        {fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="space-y-3 rounded-md border p-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {t("method_number", { number: index + 1 })}
                              </span>
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => remove(index)}
                                  className="size-8"
                                  aria-label={t("remove_method")}
                                >
                                  <Trash2Icon className="size-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <FormField
                                control={createConfigForm.control}
                                name={`payment_method_mappings.${index}.pinelabs_method`}
                                rules={{
                                  required: t("pinelabs_method_required"),
                                }}
                                render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                    <FormLabel aria-required>
                                      {t("pinelabs_method")}
                                    </FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger
                                          className="w-full"
                                          ref={field.ref}
                                        >
                                          <SelectValue placeholder={t("select_method")} />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {getAvailablePinelabsModesForIndex(
                                          index
                                        ).map((mode) => (
                                          <SelectItem
                                            key={mode.value}
                                            value={mode.value}
                                          >
                                            {t(mode.labelKey)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={createConfigForm.control}
                                name={`payment_method_mappings.${index}.care_method`}
                                rules={{
                                  required: t("error_payment_method_required"),
                                }}
                                render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                    <FormLabel aria-required>
                                      {t("care_method")}
                                    </FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger
                                          className="w-full"
                                          ref={field.ref}
                                        >
                                          <SelectValue placeholder={t("select_method")} />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {getAvailableCareMethodsForIndex().map((option) => (
                                          <SelectItem
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {t(option.labelKey)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={createConfigForm.control}
                              name={`payment_method_mappings.${index}.is_default`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between ">
                                  <FormLabel>{t("set_as_default")}</FormLabel>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={(checked) => {
                                        // If setting to true, unset all other defaults
                                        if (checked) {
                                          fields.forEach((_, i) => {
                                            if (i !== index) {
                                              createConfigForm.setValue(
                                                `payment_method_mappings.${i}.is_default`,
                                                false
                                              );
                                            }
                                          });
                                        }
                                        field.onChange(checked);
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            !getFirstAvailableCareMethod() ||
                            !getFirstAvailablePinelabsMode()
                          }
                          onClick={() => {
                            const nextCareMethod = getFirstAvailableCareMethod();
                            const nextPinelabsMode = getFirstAvailablePinelabsMode();
                            if (!nextCareMethod || !nextPinelabsMode) return;
                            append({
                              care_method: nextCareMethod.value,
                              pinelabs_method: nextPinelabsMode.value,
                              is_default: false,
                            });
                          }}
                          className="w-full"
                        >
                          <PlusIcon className="mr-2 size-4" />
                          {t("add_method")}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mb-16 pr-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeConfigureSheet}
                        disabled={
                          createConfigMutation.isPending ||
                          updateConfigMutation.isPending
                        }
                      >
                        {t("cancel")}
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={
                          createConfigMutation.isPending ||
                          updateConfigMutation.isPending ||
                          (editingConfig && !createConfigForm.formState.isDirty)
                        }
                      >
                        {editingConfig ? (
                          updateConfigMutation.isPending ? (
                            <>
                              <Loader2Icon className="mr-2 size-4 animate-spin" />
                              {t("saving")}
                            </>
                          ) : (
                            t("save")
                          )
                        ) : createConfigMutation.isPending ? (
                          <>
                            <Loader2Icon className="mr-2 size-4 animate-spin" />
                            {t("saving")}
                          </>
                        ) : (
                          t("save")
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
          )}

          {step === "terminals" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("add_terminal")}</Label>
                  <Popover
                    open={terminalPickerOpen}
                    onOpenChange={(next) => {
                      setTerminalPickerOpen(next);
                      if (!next) {
                        setTerminalDeviceSearch("");
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        role="combobox"
                        aria-expanded={terminalPickerOpen}
                        className={cn(
                          "flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50",
                        )}
                      >
                        <span className="text-gray-500">
                          {t("search_and_select_device")}
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
                        <CommandInput
                          placeholder={t("search_devices_by_name")}
                          value={terminalDeviceSearch}
                          onValueChange={setTerminalDeviceSearch}
                          className="outline-hidden border-none ring-0 shadow-none text-base sm:text-sm"
                        />
                        <CommandList
                          onScroll={(e) => {
                            const target = e.currentTarget;
                            const nearBottom =
                              target.scrollTop + target.clientHeight >=
                              target.scrollHeight - 32;
                            if (
                              nearBottom &&
                              hasMoreDevices &&
                              !isFetchingMoreDevices &&
                              !isSearchingDevices
                            ) {
                              fetchNextDevicePage();
                            }
                          }}
                        >
                          <CommandEmpty>
                            {isSearchingDevices
                              ? t("searching")
                              : t("no_devices_found")}
                          </CommandEmpty>
                          <CommandGroup>
                            {availableDeviceResults.map((device) => (
                              <CommandItem
                                key={device.id}
                                value={device.registered_name}
                                onSelect={() => {
                                  setDeviceInfoCache((prev) => ({
                                    ...prev,
                                    [device.id]: {
                                      id: device.id,
                                      registered_name: device.registered_name,
                                    },
                                  }));
                                  appendTerminal({
                                    device_id: device.id,
                                  });
                                  setTerminalDeviceSearch("");
                                }}
                              >
                                {device.registered_name}
                              </CommandItem>
                            ))}
                            {isFetchingMoreDevices && (
                              <div className="flex items-center justify-center gap-2 py-2">
                                <Loader2Icon className="size-4 animate-spin text-gray-500" />
                                <span className="text-sm text-gray-500">
                                  {t("loading")}
                                </span>
                              </div>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {!!deviceSearchError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {t("error_loading_devices")}
                    </AlertDescription>
                  </Alert>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("device")}</TableHead>
                      <TableHead>{t("device_id")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {terminalFields.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-gray-500 font-normal"
                        >
                          {t("no_terminals_linked_yet")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      terminalFields.map((field, index) => {
                        const device = deviceInfoCache[field.device_id];
                        return (
                          <TableRow key={field.id}>
                            <TableCell>
                              {device?.registered_name || "—"}
                            </TableCell>
                            <TableCell
                              className="text-sm text-gray-500 font-mono font-normal"
                              style={{ fontFamily: MONOSPACE_FONT_STACK }}
                            >
                              {field.device_id}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTerminal(index)}
                                aria-label={t("remove_terminal")}
                              >
                                <Trash2Icon className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={linkTerminalsMutation.isPending}
                    onClick={() => setStep("form")}
                  >
                    {t("back")}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!hasTerminalChanges || linkTerminalsMutation.isPending}
                    onClick={() => {
                      if (editingConfig && config) {
                        linkTerminalsMutation.mutate(
                          {
                            configId: config.id,
                            deviceIds: (terminals ?? []).map((t) => t.device_id),
                          },
                          { onSuccess: () => setStep("form") },
                        );
                      } else {
                        // No config to link against yet - terminals are staged
                        // locally and get linked once the config is created.
                        setStep("form");
                      }
                    }}
                  >
                    {linkTerminalsMutation.isPending ? (
                      <>
                        <Loader2Icon className="mr-2 size-4 animate-spin" />
                        {t("saving")}
                      </>
                    ) : (
                      t("save")
                    )}
                  </Button>
                </div>
              </div>
          )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default PinelabsConfigurePage;
