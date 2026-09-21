import { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { I18NNAMESPACE } from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PaginationProps = {
  /** Total number of records across all pages. */
  totalCount: number;
  /** Current page, 1-indexed. */
  currentPage: number;
  /** Records per page. */
  perPage: number;
  onChange: (page: number) => void;
  className?: string;
};

/**
 * Numbered pagination bar, mirroring care_fe's native payments page
 * (`components/Common/Pagination.tsx`) so both listings behave identically.
 */
export const Pagination: FC<PaginationProps> = ({
  totalCount,
  currentPage,
  perPage,
  onChange,
  className = "mx-auto my-4",
}) => {
  const { t } = useTranslation(I18NNAMESPACE);

  if (!totalCount || totalCount <= perPage) {
    return null;
  }

  const totalPage = Math.ceil(totalCount / perPage);

  // Show a sliding window of up to 3 page numbers around the current page.
  const getPageNumbers = () => {
    if (totalPage === 0) return [1];

    const pageNumbers: number[] = [];

    if (currentPage === 1 && currentPage === totalPage) {
      pageNumbers.push(currentPage);
    } else if (currentPage === totalPage) {
      let tempPage = currentPage;
      let pageLimit = 3;
      while (tempPage >= 1 && pageLimit > 0) {
        pageNumbers.push(tempPage);
        tempPage--;
        pageLimit--;
      }
    } else {
      pageNumbers.push(currentPage);
      if (currentPage > 1) {
        pageNumbers.push(currentPage - 1);
        if (currentPage + 1 <= totalPage) {
          pageNumbers.push(currentPage + 1);
        }
      } else {
        pageNumbers.push(currentPage + 1);
        if (currentPage + 2 <= totalPage) {
          pageNumbers.push(currentPage + 2);
        }
      }
    }
    return pageNumbers.sort((a, b) => a - b);
  };

  const pageNumbers = getPageNumbers();

  const goToPage = (page: number) => {
    onChange(page);
    // The host app scrolls the listing back to the top on page change.
    const pageContainer = window.document.getElementById("pages");
    pageContainer?.scroll({ top: 0, left: 0 });
  };

  return (
    <div className={className}>
      {/* Mobile view */}
      <div className="flex flex-1 justify-between sm:hidden">
        <NavButton
          id="prev-page"
          tooltip={t("previous")}
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage - 1 <= 0}
        >
          <ChevronLeftIcon />
        </NavButton>
        <NavButton
          id="next-page"
          tooltip={t("next")}
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage + 1 > totalPage}
        >
          <ChevronRightIcon />
        </NavButton>
      </div>

      {/* Desktop view */}
      <nav className="relative hidden rounded-lg border border-gray-300 bg-white sm:inline-flex sm:flex-1 sm:items-center sm:justify-between">
        <NavButton
          id="first-page"
          tooltip={t("jump_to_first_page")}
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeftIcon />
        </NavButton>
        <NavButton
          id="prev-pages"
          tooltip={t("previous")}
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage - 1 <= 0}
        >
          <ChevronLeftIcon />
        </NavButton>

        {pageNumbers.map((page) => (
          <NavButton
            id={`page-${page}`}
            key={page}
            onClick={() => goToPage(page)}
            selected={currentPage === page}
            tooltip={t("move_to_page", { page })}
          >
            {page}
          </NavButton>
        ))}

        <NavButton
          id="next-pages"
          tooltip={t("next")}
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage + 1 > totalPage}
        >
          <ChevronRightIcon />
        </NavButton>
        <NavButton
          id="last-page"
          tooltip={t("jump_to_last_page")}
          onClick={() => goToPage(totalPage)}
          disabled={totalPage === 0 || currentPage === totalPage}
        >
          <ChevronsRightIcon />
        </NavButton>
      </nav>
    </div>
  );
};

type NavButtonProps = {
  id?: string;
  onClick: () => void;
  children: ReactNode;
  tooltip: ReactNode;
  disabled?: boolean;
  selected?: boolean;
};

const NavButton: FC<NavButtonProps> = ({
  id,
  onClick,
  children,
  tooltip,
  disabled,
  selected,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        id={id}
        disabled={disabled}
        onClick={onClick}
        variant={selected ? "primary" : "secondary"}
        className="rounded-none text-sm font-bold"
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{tooltip}</TooltipContent>
  </Tooltip>
);

export default Pagination;
