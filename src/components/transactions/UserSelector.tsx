import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { I18NNAMESPACE } from "@/lib/constants";
import { apis } from "@/apis";
import { User } from "@/types/user";
import { formatUserName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/common/Avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type UserSelectorProps = {
  facilityId: string;
  selectedUser?: User;
  onChange: (user: User) => void;
};

export const UserSelector: FC<UserSelectorProps> = ({
  facilityId,
  selectedUser,
  onChange,
}) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["pinelabs_users", facilityId, search],
    queryFn: () =>
      apis.users.list(facilityId, {
        limit: 20,
        search_text: search || undefined,
      }),
    enabled: !!facilityId && open,
  });

  const users = data?.results || [];

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedUser ? (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                imageUrl={selectedUser.profile_picture_url}
                name={formatUserName(selectedUser)}
                className="size-6 rounded-full shrink-0"
              />
              <span className="truncate">{formatUserName(selectedUser)}</span>
            </div>
          ) : (
            <span className="text-gray-500">{t("all_users")}</span>
          )}
          <ChevronDownIcon className="h-4 w-4 ml-auto shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-(--radix-popover-trigger-width)"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("search_users")}
            value={search}
            onValueChange={setSearch}
            className="outline-hidden border-none ring-0 shadow-none text-base sm:text-sm"
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? t("loading") : t("no_users_found")}
            </CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${formatUserName(user)} ${user.username ?? ""}`}
                  onSelect={() => {
                    onChange(user);
                    setOpen(false);
                  }}
                  className="cursor-pointer w-full"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Avatar
                      imageUrl={user.profile_picture_url}
                      name={formatUserName(user)}
                      className="size-6 rounded-full shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span
                        className="truncate text-sm font-medium"
                        title={formatUserName(user)}
                      >
                        {formatUserName(user)}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        {user.username}
                      </span>
                    </div>
                    {selectedUser?.id === user.id && (
                      <CheckIcon className="h-4 w-4 ml-auto shrink-0" />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
