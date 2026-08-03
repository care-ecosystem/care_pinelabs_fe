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
import { ConfigureFormProps } from "@/types/configureform";

// interface ConfigureFormProps {
//   facilityId: string;
//   metadata: Record<string, any>;
//   onChange: (metadata: Record<string, any>) => void;
// }

// type DeleteConfirmState = PinelabsTerminal | null;

export const PinelabsDeviceConfigurationForm = ({
    // facilityId,
    metadata,
    onChange,
}: ConfigureFormProps) => {
    // const [editingTerminal, setEditingTerminal] =
    //   useState<PinelabsTerminal | null>(null);
    // const queryClient = useQueryClient();

    const form = useForm({
        defaultValues: {
            terminal_name: metadata?.terminal_name || "",
            client_id: metadata?.client_id || "",
            store_id: metadata?.store_id || "",
            is_active: metadata?.is_active ?? true,
        },
    });

    // Watch for metadata changes from parent
    // React.useEffect(() => {
    //   form.reset({
    //     terminal_name: metadata?.terminal_name || "",
    //     client_id: metadata?.client_id || "",
    //     store_id: metadata?.store_id || "",
    //     is_active: metadata?.is_active ?? true,
    //   });
    // }, [metadata, form]);

    // Handle form field changes - update metadata in parent
    const handleChange = (key: string, value: unknown) => {
        const newMetadata = { ...metadata, [key]: value };
        onChange(newMetadata);
    };

    // const handleEditTerminal = (terminal: PinelabsTerminal) => {
    //   setEditingTerminal(terminal);
    //   form.reset({
    //     terminal_name: terminal.name,
    //     client_id: terminal.client_id,
    //     store_id: terminal.store_id,
    //     is_active: terminal.is_active,
    //   });
    //   // Update metadata with terminal data
    //   handleChange("terminal_name", terminal.name);
    //   handleChange("client_id", terminal.client_id);
    //   handleChange("store_id", terminal.store_id);
    //   handleChange("is_active", terminal.is_active);
    // };



    return (
        <PluginComponent>
            <div className="space-y-1">
                {/* Pinelabs Terminals Section */}
                <h2 className="text-sm font-medium text-gray-500">Pinelabs Terminals</h2>

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
                                                Client ID
                                                <span className="text-red-500 ml-1">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter client ID"
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
                                                Store ID
                                                <span className="text-red-500 ml-1">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter store ID"
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