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
import { cn } from "@/lib/utils";
import { LocationTypeIcons } from "@/types/location";

export type LocationSelectProps = {
  facilityId: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export const LocationSelect: FC<LocationSelectProps> = ({
  facilityId,
  value,
  onValueChange,
  disabled,
  className,
}) => {
  const { data: locations, isLoading: isLocationsLoading } = useQuery({
    queryKey: ["pinelabs_locations", facilityId],
    queryFn: () =>
      apis.locations.list(facilityId, {
        status: "active",
        mine: true,
      }),
    enabled: !!facilityId,
  });

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "justify-between h-10 min-h-10 px-3 py-2 w-full",
          "hover:bg-gray-50 hover:text-gray-900",
          "focus:ring-2 focus:ring-gray-300 focus:ring-offset-2",
          "transition-all duration-200",
          className,
        )}
      >
        <SelectValue placeholder="Select location" />
      </SelectTrigger>
      <SelectContent>
        {isLocationsLoading ? (
          <div className="flex items-center justify-center gap-2 p-2">
            <Loader2Icon
              role="status"
              aria-label="Loading"
              className="size-4 animate-spin"
            />
            <p className="text-sm text-gray-600">Loading</p>
          </div>
        ) : (
          <SelectGroup>
            <SelectLabel>Location</SelectLabel>
            {locations?.results.map((location) => {
              const Icon = LocationTypeIcons[location.form];
              return (
                <SelectItem key={location.id} value={location.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-500 shrink-0" />
                    <span className="truncate">{location.name}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
};
