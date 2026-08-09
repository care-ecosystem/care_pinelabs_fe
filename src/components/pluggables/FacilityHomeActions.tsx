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
import { I18NNAMESPACE } from "@/lib/constants";
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
  Loader2Icon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
  ChevronLeftIcon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useFieldArray, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Facility } from "@/types/facility";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { useForm } from "react-hook-form";
import {
  getPaymentMethodOptions,
  PINELABS_PAYMENT_MODES,
  PinelabsPaymentModeEnum,
} from "@/lib/paymentMethods";
import { PaymentReconciliationPaymentMethod } from "@/types/payment_reconciliation";
import {
  UpdatePinelabsConfigBody,
  CreatePinelabsConfigBody,
} from "@/types/pinelabs_config";
import { Device } from "@/types/device";

// Get payment method options from existing enum
const CARE_METHOD_OPTIONS = getPaymentMethodOptions();

// Payment flow options
const PAYMENT_FLOW_OPTIONS = [
  { value: "pinelabs", labelKey: "payment_flow_pinelabs" },
  { value: "native", labelKey: "payment_flow_native" },
];

const SEARCH_DEBOUNCE_INTERVAL = 500;
const DEVICE_SEARCH_PAGE_SIZE = 10;

// This plugin's `font-mono` utility only applies inside a `.care-pinelabs-container`
// ancestor, which this component isn't wrapped in, so it silently has no effect here.
// Set the font family inline instead, which always works regardless of CSS scoping.
const MONOSPACE_FONT_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

type FacilityHomeActionsProps = {
  facility: Facility;
  className?: string;
};

type SheetView = "main" | "create-config" | "terminals";

const FacilityHomeActions: FC<FacilityHomeActionsProps> = ({ facility }) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [open, setOpen] = useState(false);
  const [sheetView, setSheetView] = useState<SheetView>("main");
  const [editingConfig, setEditingConfig] = useState(false);
  const [terminalDeviceSearch, setTerminalDeviceSearch] = useState("");
  const [terminalPickerOpen, setTerminalPickerOpen] = useState(false);
  const [showSecurityToken, setShowSecurityToken] = useState(false);
  const [terminalsBaseline, setTerminalsBaseline] = useState<string[]>([]);
  const [deviceInfoCache, setDeviceInfoCache] = useState<
    Record<string, Pick<Device, "id" | "registered_name">>
  >({});

  const queryClient = useQueryClient();

  // Form for creating/editing config
  const createConfigForm = useForm<CreatePinelabsConfigBody>({
    defaultValues: {
      facility_id: facility?.id || "",
      default_payment_flow: "pinelabs" as const,
      allow_advance_payment: true,
      allow_partial_payment: false,
      pinelabs_merchant_id: "",
      pinelabs_security_token: "",
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
    isError: configNotFound,
    refetch: refetchConfig,
  } = useQuery({
    queryKey: ["pinelabs_config", facility?.id],
    queryFn: () => apis.pinelabs_config.get(facility?.id || ""),
    enabled: !!facility?.id && open,
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
    enabled: !!config?.id && open,
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
    queryKey: ["facilities", facility?.id, "devices-for-config", terminalDeviceSearch],
    queryFn: async ({ pageParam, signal }) => {
      if (!facility?.id) throw new Error("Facility ID is required");
      if (pageParam === 0) {
        await sleep(SEARCH_DEBOUNCE_INTERVAL);
      }
      return apis.devices.list(
        facility.id,
        {
          care_type: "pos-terminal",
          limit: DEVICE_SEARCH_PAGE_SIZE,
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
    enabled: !!facility?.id && open && sheetView === "terminals" && terminalPickerOpen,
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
              closeSheet();
            },
          },
        );
      } else {
        refetchConfig();
        createConfigForm.reset();
        closeSheet();
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
        queryKey: ["pinelabs_config", facility?.id],
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
            { onSuccess: () => closeSheet() },
          );
        } else {
          closeSheet();
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
        allow_advance_payment: data.allow_advance_payment,
        allow_partial_payment: data.allow_partial_payment,
        pinelabs_merchant_id: data.pinelabs_merchant_id,
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
        facility_id: facility?.id || "",
      });
    }
  };

  const handleEditConfig = () => {
    if (config) {
      createConfigForm.reset({
        facility_id: config.facility_id,
        default_payment_flow: config.default_payment_flow as any,
        allow_advance_payment: config.allow_advance_payment,
        allow_partial_payment: config.allow_partial_payment,
        pinelabs_merchant_id: config.pinelabs_merchant_id,
        pinelabs_security_token: "",
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
      setSheetView("create-config");
    }
  };

  useEffect(() => {
    const terminalsSettled = posTerminals !== undefined || isTerminalsError;
    if (open && config && sheetView === "main" && terminalsSettled) {
      handleEditConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, config, sheetView, posTerminals, isTerminalsError]);

  const closeSheet = () => {
    setOpen(false);
    setSheetView("main");
    setEditingConfig(false);
    setShowSecurityToken(false);
    setTerminalsBaseline([]);
  };

  const getAvailableCareMethodsForIndex = (currentIndex: number) => {
    const selectedMethods = paymentMethodMappings
      ?.map((mapping, index) => {
        if (index === currentIndex) return null;
        return mapping.care_method;
      })
      .filter(Boolean) as string[];

    return CARE_METHOD_OPTIONS.filter(
      (option) => !selectedMethods?.includes(option.value)
    );
  };

  const getFirstAvailableCareMethod = () => {
    const selectedMethods = (paymentMethodMappings ?? [])
      .map((mapping) => mapping.care_method)
      .filter(Boolean) as string[];

    return CARE_METHOD_OPTIONS.find(
      (option) => !selectedMethods.includes(option.value)
    );
  };

  const availableDeviceResults = deviceSearchResults.filter((device) => {
    if (device.status !== "active") return false;
    const isAlreadyAdded = terminals?.some(
      (t) => t.device_id === device.id
    );
    return !isAlreadyAdded;
  });

  if (!facility) {
    return null;
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOpen(true);
        } else {
          closeSheet();
        }
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          className="hover:bg-gray-100 hover:text-gray-900 flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
        >
          <SettingsIcon className="size-4 text-gray-500" />
          {t("configure_pinelabs")}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          {sheetView === "create-config" && !editingConfig && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSheetView("main")}
              className="absolute left-4 top-4 gap-2 h-8 w-8 p-0"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
          )}
          <SheetTitle>
            {sheetView === "main" && t("pinelabs_configuration")}
            {sheetView === "create-config" &&
              (editingConfig
                ? t("edit_configuration")
                : t("create_configuration"))}
            {sheetView === "terminals" && t("pos_terminals")}
          </SheetTitle>
          {sheetView === "main" && (
            <SheetDescription>
              {t("manage_pinelabs_config_for")}{" "}
              <strong>{facility.name}</strong>.
            </SheetDescription>
          )}
        </SheetHeader>

        {/* MAIN VIEW */}
        {sheetView === "main" && (
          <>
            {isConfigLoading || config ? (
              <div className="flex items-center justify-center gap-2 py-12">
                <Loader2Icon className="size-5 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">
                  {t("loading_configuration")}
                </p>
              </div>
            ) : configNotFound ? (
              <div className="mt-6 text-center py-12">
                <div className="space-y-4">
                  <div className="text-center">
                    <SettingsIcon className="size-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-semibold text-lg text-gray-900 mb-1">
                      {t("no_configuration_found")}
                    </p>
                    <p className="text-sm text-gray-600 max-w-sm mx-auto">
                      {t("setup_pinelabs_credentials_hint")}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setSheetView("create-config")}
                    size="lg"
                    className="w-full"
                  >
                    <PlusIcon className="size-4 mr-2" />
                    {t("create_configuration")}
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}

        {/* CREATE/EDIT CONFIG VIEW */}
        {sheetView === "create-config" && (
          <div className="mt-6">
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
                              >
                                {t(option.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {t("choose_pinelabs_or_native")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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

                {/* Payment Features */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t("payment_features")}</h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

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
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

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
                      onClick={() => setSheetView("terminals")}
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
                                    {getAvailableCareMethodsForIndex(
                                      index
                                    ).map((option) => (
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
                                    {PINELABS_PAYMENT_MODES.map((mode) => (
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
                      disabled={!getFirstAvailableCareMethod()}
                      onClick={() => {
                        const nextCareMethod = getFirstAvailableCareMethod();
                        if (!nextCareMethod) return;
                        append({
                          care_method: nextCareMethod.value,
                          pinelabs_method: PinelabsPaymentModeEnum.UPI_BHARAT_QR,
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

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (editingConfig) {
                        closeSheet();
                        return;
                      }
                      setSheetView("main");
                      setEditingConfig(false);
                      setShowSecurityToken(false);
                    }}
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
                          {t("updating")}
                        </>
                      ) : (
                        t("update_configuration")
                      )
                    ) : createConfigMutation.isPending ? (
                      <>
                        <Loader2Icon className="mr-2 size-4 animate-spin" />
                        {t("creating")}
                      </>
                    ) : (
                      t("create_configuration")
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* POS TERMINALS VIEW */}
        {sheetView === "terminals" && (
          <div className="mt-6 space-y-4">
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
                          className="text-xs text-gray-500 font-mono font-normal"
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
                onClick={() => setSheetView("create-config")}
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
                      { onSuccess: () => setSheetView("create-config") },
                    );
                  } else {
                    // No config to link against yet - terminals are staged
                    // locally and get linked once the config is created.
                    setSheetView("create-config");
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
      </SheetContent>
    </Sheet>
  );
};

export default FacilityHomeActions;
