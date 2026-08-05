import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FC, useEffect, useState } from "react";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  { value: "pinelabs", label: "Pinelabs" },
  { value: "native", label: "Native" },
];

const SEARCH_DEBOUNCE_INTERVAL = 500;

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
  // Snapshot of linked device ids as last persisted, so we can tell whether
  // the user actually changed the POS terminal list before saving/toasting.
  const [terminalsBaseline, setTerminalsBaseline] = useState<string[]>([]);
  // Caches device info (id -> registered_name) so already-linked terminals
  // can show a human-readable name without keeping a full device list around.
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

  // Whether the linked terminals differ from what's currently persisted -
  // drives the terminals screen's Save button and whether a device-linking
  // toast/API call is warranted on config save.
  const hasTerminalChanges =
    JSON.stringify([...(terminals ?? []).map((t) => t.device_id)].sort()) !==
    JSON.stringify([...terminalsBaseline].sort());

  // Fetch config for this facility. `staleTime: Infinity` keeps this cached
  // across opens/closes/refocuses - we only ever refresh it explicitly
  // (refetchConfig()/invalidateQueries) right after a mutation that actually
  // changes it, instead of silently refetching on every mount.
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

  // Fetch linked POS terminals for the config - same caching rationale as
  // the config query above; only refetchTerminals() after a linking change
  // should hit the network again.
  const {
    data: posTerminals,
    isError: isTerminalsError,
    refetch: refetchTerminals,
  } = useQuery({
    queryKey: ["pinelabs_config", config?.id, "pos-terminals"],
    // `refetch()` bypasses `enabled`, so guard here too - otherwise a
    // refetch triggered while `config` is momentarily unset hits
    // `/pinelabs_config//pos-terminals/` (empty id) and fails.
    queryFn: () =>
      config?.id
        ? apis.pinelabs_config.getTerminals(config.id)
        : Promise.resolve([]),
    enabled: !!config?.id && open,
    retry: 1,
  });

  // Seed the device-info cache from already-linked terminals so their names
  // can be shown without keeping a full device list around.
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

  // Search devices for terminal selection in create-config form - hits the
  // API on every (debounced) keystroke rather than filtering a locally
  // cached page of devices.
  const {
    data: deviceSearchData,
    isFetching: isSearchingDevices,
    error: deviceSearchError,
  } = useQuery({
    queryKey: ["facilities", facility?.id, "devices-for-config", terminalDeviceSearch],
    queryFn: async ({ signal }) => {
      if (!facility?.id) throw new Error("Facility ID is required");
      await sleep(SEARCH_DEBOUNCE_INTERVAL);
      return apis.devices.list(
        facility.id,
        {
          care_type: "pos-terminal",
          limit: 20,
          search_text: terminalDeviceSearch || undefined,
        },
        signal,
      );
    },
    enabled: !!facility?.id && open && sheetView === "terminals" && terminalPickerOpen,
    retry: false,
    // Re-typing/reopening with the same search term within this window reuses
    // the cached page instead of hitting the API again.
  });

  const deviceSearchResults = deviceSearchData?.results ?? [];

  // Create config mutation
  const createConfigMutation = useMutation({
    mutationFn: (data: CreatePinelabsConfigBody) => {
      // ✅ Remove pos_terminals from create payload - they're linked separately
      const { pos_terminals, ...configData } = data;
      return apis.pinelabs_config.create(configData as CreatePinelabsConfigBody);
    },
    onSuccess: (createdConfig) => {
      toast.success("Configuration created successfully");

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
              setSheetView("main");
              setEditingConfig(false);
              createConfigForm.reset();
            },
          },
        );
      } else {
        refetchConfig();
        setSheetView("main");
        createConfigForm.reset();
      }
    },
    onError: (error: any) => {
      const errorMsg =
        error?.response?.data?.errors?.[0]?.msg ||
        "Failed to create configuration";
      toast.error(errorMsg);
      console.error(error);
    },
  });

  // ✅ Sync the full POS terminal list (device_ids) to the config. Invoked
  // directly from the terminals screen's Save button (against an existing
  // config), and bundled into create/update submits when terminals changed.
  // Navigation on success is handled per call-site via mutate()'s options,
  // since "save terminals" alone should behave differently from "save
  // terminals as part of the whole config".
  const linkTerminalsMutation = useMutation({
    mutationFn: async (params: { configId: string; deviceIds: string[] }) => {
      if (!params.configId) {
        throw new Error("Missing config id");
      }
      return apis.pinelabs_config.linkTerminals(params.configId, params.deviceIds);
    },
    onSuccess: (_data, variables) => {
      toast.success("POS terminals updated successfully");
      setTerminalsBaseline(variables.deviceIds);
      setTimeout(() => {
        refetchConfig();
        refetchTerminals();
      }, 500);
    },
    onError: (error: any) => {
      const errorMsg =
        error?.response?.data?.errors?.[0]?.msg ||
        "Failed to update POS terminals";
      toast.error(errorMsg);
      console.error(error);
    },
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: (data: UpdatePinelabsConfigBody) => {
      if (!config) throw new Error("Config not found");
      // ✅ pos_terminals are synced separately via the pos-terminals endpoint
      const { pos_terminals, ...configData } = data;
      return apis.pinelabs_config.update(config.id, configData);
    },
    onSuccess: (_updatedConfig, variables) => {
      toast.success("Configuration updated successfully");
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
        "Failed to update configuration";
      toast.error(errorMsg);
      console.error(error);
    },
  });

  const onCreateConfigSubmit = (data: CreatePinelabsConfigBody) => {
    const hasDefault = data.payment_method_mappings.some((m) => m.is_default);
    if (!hasDefault) {
      toast.error("At least one payment method must be set as default");
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

  // Once a configuration exists, always land directly in the editable
  // form when the sheet is opened - there's no separate read-only/edit-button view.
  // Waits for the linked-terminals fetch to settle so the form (and its dirty
  // baseline) is populated once, with complete data, instead of resetting twice.
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

  // First care method not already used by any existing mapping - used to
  // default a newly-added card to a method that isn't already taken, so
  // "Add Method" only ever proposes something from the remaining balance.
  const getFirstAvailableCareMethod = () => {
    const selectedMethods = (paymentMethodMappings ?? [])
      .map((mapping) => mapping.care_method)
      .filter(Boolean) as string[];

    return CARE_METHOD_OPTIONS.find(
      (option) => !selectedMethods.includes(option.value)
    );
  };

  // Exclude already-selected terminals from the search results (the search
  // text itself is applied server-side via search_text)
  const availableDeviceResults = deviceSearchResults.filter((device) => {
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
          Configure Pinelabs
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
            {sheetView === "main" && "Pinelabs Configuration"}
            {sheetView === "create-config" &&
              (editingConfig ? "Edit Configuration" : "Create Configuration")}
            {sheetView === "terminals" && "POS Terminals"}
          </SheetTitle>
          {sheetView === "main" && (
            <SheetDescription>
              Manage Pinelabs configuration for{" "}
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
                  Loading configuration...
                </p>
              </div>
            ) : configNotFound ? (
              <div className="mt-6 text-center py-12">
                <div className="space-y-4">
                  <div className="text-center">
                    <SettingsIcon className="size-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-semibold text-lg text-gray-900 mb-1">
                      No Configuration Found
                    </p>
                    <p className="text-sm text-gray-600 max-w-sm mx-auto">
                      Set up your Pinelabs merchant credentials and payment
                      methods to get started.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setSheetView("create-config")}
                    size="lg"
                    className="w-full"
                  >
                    <PlusIcon className="size-4 mr-2" />
                    Create Configuration
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
                  <h3 className="text-lg font-medium">Basic Settings</h3>

                  <FormField
                    control={createConfigForm.control}
                    name="default_payment_flow"
                    rules={{ required: "Payment flow is required" }}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel aria-required>Payment Flow</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full" ref={field.ref}>
                              <SelectValue placeholder="Select payment flow" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_FLOW_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose between Pinelabs or Native payment processing
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createConfigForm.control}
                    name="pinelabs_merchant_id"
                    rules={{ required: "Merchant ID is required" }}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel aria-required>Merchant ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., MERCH001"
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
                      required: !editingConfig && "Security token is required",
                    }}
                    render={({ field }) => {
                      const canToggleVisibility = !editingConfig || !!field.value;
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel aria-required>Security Token</FormLabel>
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
                                    : "Enter your security token"
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
                                      ? "Hide security token"
                                      : "Show security token"
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
                              Leave empty to keep existing token
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
                  <h3 className="text-lg font-medium">Payment Features</h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={createConfigForm.control}
                      name="allow_advance_payment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-md border p-2">
                          <div className="space-y-0.5">
                            <FormLabel>Advance Payment</FormLabel>
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
                            <FormLabel>Partial Payment</FormLabel>
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
                  <h3 className="text-lg font-medium">POS Terminals</h3>

                  <div className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-sm text-gray-700">
                      {terminalFields.length > 0
                        ? `${terminalFields.length} terminal${
                            terminalFields.length > 1 ? "s" : ""
                          } linked`
                        : "No terminals linked"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSheetView("terminals")}
                    >
                      Manage Terminals
                    </Button>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Payment Methods</h3>

                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="space-y-3 rounded-md border p-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Method {index + 1}
                          </span>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="size-8"
                              aria-label="Remove method"
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
                              required: "Payment method is required",
                            }}
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel aria-required>
                                  Care Method
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
                                      <SelectValue placeholder="Select method" />
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
                              required: "Pinelabs method is required",
                            }}
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel aria-required>
                                  Pinelabs Method
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
                                      <SelectValue placeholder="Select method" />
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
                              <FormLabel>Set as Default</FormLabel>
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
                          pinelabs_method: PinelabsPaymentModeEnum.CASH,
                          is_default: false,
                        });
                      }}
                      className="w-full"
                    >
                      <PlusIcon className="mr-2 size-4" />
                      Add Method
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
                    Cancel
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
                          Updating...
                        </>
                      ) : (
                        "Update Configuration"
                      )
                    ) : createConfigMutation.isPending ? (
                      <>
                        <Loader2Icon className="mr-2 size-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Configuration"
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
              <Label>Add Terminal</Label>
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
                      Search and select a device
                    </span>
                    <ChevronDown className="size-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-(--radix-popover-trigger-width) p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search devices by name..."
                      value={terminalDeviceSearch}
                      onValueChange={setTerminalDeviceSearch}
                      className="outline-hidden border-none ring-0 shadow-none text-base sm:text-sm"
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isSearchingDevices
                          ? "Searching..."
                          : "No devices found."}
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
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {!!deviceSearchError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Error loading devices. Please try again.
                </AlertDescription>
              </Alert>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terminalFields.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-gray-500 font-normal"
                    >
                      No terminals linked yet.
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
                            aria-label="Remove terminal"
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
                Back
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
                    Saving...
                  </>
                ) : (
                  "Save"
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
