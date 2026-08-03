import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
// import {  useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import PluginComponent from "@/components/ui/plug-component";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";


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

    const handleChange = (key: string, value: unknown) => {
        const newMetadata = { ...metadata, [key]: value };
        onChange(newMetadata);
    };

    return (
        <PluginComponent>
            <div className="space-y-1">
                {/* Pinelabs Terminals Section */}
                <h2 className="text-sm font-medium text-gray-500">{t("device_configuration_title")}</h2>

                <div className="rounded-lg">
                    <Form {...form}>
                        <form className="space-y-6">
                            {/* Client ID and Store ID - Side by Side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="client_id"
                                    rules={{ required: "Client ID is required" }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 font-medium">
                                                {t("client_id")}
                                                <span className="text-red-500 ml-1">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t("client_id_placeholder")}
                                                    className="mt-2 bg-white border-gray-300"
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
                                    rules={{ required: "Store ID is required" }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 font-medium">
                                                {t("store_id")}
                                                <span className="text-red-500 ml-1">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t("store_id_placeholder")}
                                                    className="mt-2 bg-white border-gray-300"
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
                        </form>
                    </Form>
                </div>
            </div>
        </PluginComponent>
    );
};

export default PinelabsDeviceConfigurationForm;