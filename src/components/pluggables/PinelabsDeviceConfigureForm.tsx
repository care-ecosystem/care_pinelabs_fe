import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import PluginComponent from "@/components/ui/plug-component";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";
import { toast } from "@/lib/utils";


interface ConfigureFormProps {
    metadata: Record<string, any>;
    onChange: (metadata: Record<string, any>) => void;
}


export const PinelabsDeviceConfigurationForm = ({
    metadata,
    onChange,
}: ConfigureFormProps) => {
    const form = useForm({
        defaultValues: {
            terminal_name: metadata?.terminal_name || "",
            client_id: metadata?.client_id || "",
            store_id: metadata?.store_id || "",
            is_active: metadata?.is_active ?? true,
        },
    });

    const { t } = useTranslation(I18NNAMESPACE);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleChange = (key: string, value: unknown) => {
        const newMetadata = { ...metadata, [key]: value };
        onChange(newMetadata);
    };

    useEffect(() => {
        const hostForm = wrapperRef.current?.closest("form");
        if (!hostForm) return;

        const handleSubmitCapture = (event: SubmitEvent) => {
            const values = form.getValues();
            const clientId = (values.client_id ?? "").trim();
            const storeId = (values.store_id ?? "").trim();

            if (!clientId || !storeId) {
                event.preventDefault();
                event.stopPropagation();
                form.trigger(["client_id", "store_id"]);

                if (!clientId && !storeId) {
                    toast.error(t("client_id_and_store_id_required"));
                } else if (!clientId) {
                    toast.error(t("client_id_required"));
                } else {
                    toast.error(t("store_id_required"));
                }
            }
        };

        hostForm.addEventListener("submit", handleSubmitCapture, {
            capture: true,
        });

        return () => {
            hostForm.removeEventListener("submit", handleSubmitCapture, {
                capture: true,
            });
        };
    }, [form, t]);

    return (
        <PluginComponent>
            <div className="space-y-1" ref={wrapperRef}>
                {/* Pinelabs Terminals Section */}
                <h2 className="text-sm font-medium text-gray-500">{t("device_configuration_title")}</h2>

                <div className="rounded-lg">
                    <Form {...form}>
                        <div className="space-y-6">
                            {/* Client ID and Store ID - Side by Side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="client_id"
                                    rules={{ required: t("client_id_required") }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 font-medium">
                                                {t("client_id")}
                                                <span className="text-red-500 ml-1">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t("client_id_placeholder")}
                                                    className="mt-2 bg-white border-gray-300 focus-visible:ring-0! focus-visible:border-primary-500 focus-visible:border-2"
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        handleChange("client_id", e.target.value);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="store_id"
                                    rules={{ required: t("store_id_required") }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 font-medium">
                                                {t("store_id")}
                                                <span className="text-red-500 ml-1">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t("store_id_placeholder")}
                                                    className="mt-2 bg-white border-gray-300 focus-visible:ring-0! focus-visible:border-primary-500 focus-visible:border-2"
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        handleChange("store_id", e.target.value);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </Form>
                </div>
            </div>
        </PluginComponent>
    );
};

export default PinelabsDeviceConfigurationForm;
