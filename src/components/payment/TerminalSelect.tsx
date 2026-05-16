import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { FC } from "react";
import { Loader2Icon } from "lucide-react";
import { apis } from "@/apis";
import { useQuery } from "@tanstack/react-query";

export type TerminalSelectProps = {
  facilityId: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
};

export const TerminalSelect: FC<TerminalSelectProps> = ({
  facilityId,
  value,
  onValueChange,
  disabled,
}) => {
  const { data: terminals, isLoading: isTerminalsLoading } = useQuery({
    queryKey: ["pinelabs_terminals", facilityId],
    queryFn: () => apis.pinelabs_terminals.list(facilityId),
    enabled: !!facilityId,
  });

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select the POS Terminal" />
      </SelectTrigger>
      <SelectContent>
        {isTerminalsLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2Icon
              role="status"
              aria-label="Loading"
              className="size-4 animate-spin"
            />
            <p className="text-sm text-gray-600">Loading</p>
          </div>
        ) : (
          <SelectGroup>
            <SelectLabel>Terminal</SelectLabel>
            {terminals?.results.map((terminal) => (
              <SelectItem key={terminal.id} value={terminal.id}>
                {terminal.name} ({terminal.client_id})
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
};
