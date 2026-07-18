import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CreatePinelabsTerminalBody,
  PinelabsTerminal,
} from "@/types/pinelabs_terminal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FC, useState } from "react";
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
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Facility } from "@/types/facility";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { apis } from "@/apis";
import { toast } from "@/lib/utils";
import { useForm } from "react-hook-form";

type FacilityHomeActionsProps = {
  facility: Facility;
  className?: string;
};

const FacilityHomeActions: FC<FacilityHomeActionsProps> = ({ facility }) => {
  const [open, setOpen] = useState(false);
  const [addTerminalOpen, setAddTerminalOpen] = useState(false);
  const [deleteTerminalOpen, setDeleteTerminalOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] =
    useState<PinelabsTerminal | null>(null);
  const [deletingTerminal, setDeletingTerminal] =
    useState<PinelabsTerminal | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<CreatePinelabsTerminalBody>({
    defaultValues: {
      facility_id: facility?.id || "",
      client_id: "",
      store_id: "",
      name: "",
      is_active: true,
    },
  });

  // Reset form when dialog opens/closes
  const handleAddTerminalOpenChange = (open: boolean) => {
    setAddTerminalOpen(open);
    setEditingTerminal(null);
    if (open) {
      form.reset({
        facility_id: facility?.id || "",
        client_id: "",
        store_id: "",
        name: "",
        is_active: true,
      });
    }
  };

  const handleEditTerminal = (terminal: PinelabsTerminal) => {
    setEditingTerminal(terminal);
    form.reset({
      facility_id: terminal.facility_id,
      client_id: terminal.client_id,
      store_id: terminal.store_id,
      name: terminal.name,
      is_active: terminal.is_active,
    });
    setAddTerminalOpen(true);
  };

  const handleDeleteTerminal = (terminal: PinelabsTerminal) => {
    setDeletingTerminal(terminal);
    setDeleteTerminalOpen(true);
  };

  const { data: terminals, isLoading: isTerminalsLoading } = useQuery({
    queryKey: ["pinelabs_terminals", facility?.id],
    queryFn: () => apis.pinelabs_terminals.list(facility?.id || ""),
    enabled: !!facility?.id && open,
  });

  const createTerminalMutation = useMutation({
    mutationFn: apis.pinelabs_terminals.create,
    onSuccess: () => {
      toast.success("Terminal created successfully");
      queryClient.invalidateQueries({
        queryKey: ["pinelabs_terminals", facility?.id],
      });
      setAddTerminalOpen(false);
      setEditingTerminal(null);
      form.reset();
    },
    onError: (error: unknown) => {
      toast.error("Failed to create terminal");
    },
  });

  const updateTerminalMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: CreatePinelabsTerminalBody;
    }) => apis.pinelabs_terminals.update(id, data),
    onSuccess: () => {
      toast.success("Terminal updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["pinelabs_terminals", facility?.id],
      });
      setAddTerminalOpen(false);
      setEditingTerminal(null);
      form.reset();
    },
    onError: (error: unknown) => {
      toast.error("Failed to update terminal");
    },
  });

  const deleteTerminalMutation = useMutation({
    mutationFn: (id: string) => apis.pinelabs_terminals.delete(id),
    onSuccess: () => {
      toast.success("Terminal deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["pinelabs_terminals", facility?.id],
      });
      setDeleteTerminalOpen(false);
      setDeletingTerminal(null);
    },
    onError: (error: unknown) => {
      toast.error("Failed to delete terminal");
    },
  });

  const onSubmit = (data: CreatePinelabsTerminalBody) => {
    if (editingTerminal) {
      updateTerminalMutation.mutate({
        id: editingTerminal.id,
        data: {
          ...data,
          facility_id: facility?.id || "",
        },
      });
    } else {
      createTerminalMutation.mutate({
        ...data,
        facility_id: facility?.id || "",
      });
    }
  };

  const handleConfirmDelete = () => {
    if (deletingTerminal) {
      deleteTerminalMutation.mutate(deletingTerminal.id);
    }
  };

  if (!facility) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="abdm-container">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer font-semibold"
          >
            <SettingsIcon />
            Configure Pinelabs Terminal
          </Button>
        </SheetTrigger>
        <SheetContent className="abdm-container w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configure Pinelabs Terminal</SheetTitle>
            <SheetDescription>
              Manage Pinelabs terminals associated with{" "}
              <strong>{facility.name}</strong>. Add, view, and configure your
              terminals here.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Terminals</h3>
              <Button
                onClick={() => handleAddTerminalOpenChange(true)}
                size="sm"
                className="gap-2"
              >
                <PlusIcon className="size-4" />
                Add Terminal
              </Button>
            </div>

            {isTerminalsLoading ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2Icon className="size-4 animate-spin" />
                <p className="text-sm text-gray-600">Loading terminals...</p>
              </div>
            ) : terminals?.results && terminals.results.length > 0 ? (
              <div className="space-y-3">
                {terminals.results.map((terminal) => (
                  <Card key={terminal.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {terminal.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Client ID: {terminal.client_id} | Store ID:{" "}
                            {terminal.store_id}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={terminal.is_active ? "default" : "secondary"}
                        >
                          {terminal.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          Created:{" "}
                          {new Date(terminal.created_date).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTerminal(terminal)}
                            className="gap-2"
                          >
                            <PencilIcon className="size-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTerminal(terminal)}
                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2Icon className="size-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>
                  No terminals found. Add your first terminal to get started.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={addTerminalOpen} onOpenChange={handleAddTerminalOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTerminal ? "Edit Terminal" : "Add New Terminal"}
            </DialogTitle>
            <DialogDescription>
              {editingTerminal
                ? "Update the details for this Pinelabs terminal."
                : "Enter the details for the new Pinelabs terminal."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terminal Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter terminal name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client_id"
                rules={{ required: "Client ID is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter client ID" {...field} />
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
                    <FormLabel>Store ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter store ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable or disable this terminal
                      </FormDescription>
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleAddTerminalOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createTerminalMutation.isPending ||
                    updateTerminalMutation.isPending
                  }
                >
                  {createTerminalMutation.isPending ||
                  updateTerminalMutation.isPending ? (
                    <>
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                      {editingTerminal ? "Updating..." : "Creating..."}
                    </>
                  ) : editingTerminal ? (
                    "Update Terminal"
                  ) : (
                    "Create Terminal"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTerminalOpen} onOpenChange={setDeleteTerminalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Terminal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the terminal{" "}
              <strong>{deletingTerminal?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTerminalOpen(false);
                setDeletingTerminal(null);
              }}
              disabled={deleteTerminalMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteTerminalMutation.isPending}
            >
              {deleteTerminalMutation.isPending ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Terminal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FacilityHomeActions;
