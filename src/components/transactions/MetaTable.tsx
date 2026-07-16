import { FC, useState } from "react";
import {
  PINELABS_FIELDS,
  STATUS_FIELDS,
  TRANSACTION_DATA_FIELDS,
  UPLOAD_FIELDS,
  PAYMENT_MODE_LABELS,
} from "@/lib/pinelabsMetaConfig";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

type MetaTableProps = {
  data: Record<string, unknown>;
};

type Section = {
  title: string;
  rows: Array<{ key: string; value: string }>;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

export const MetaTable: FC<MetaTableProps> = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(),
  );

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatValue = (value: unknown, key?: string): string => {
    if (value === null || value === undefined) {
      return "N/A";
    }

    // Special handling for Payment Mode (check for snake_case and other variants)
    if (key === "payment_mode" || key === "Payment Mode" || key === "PaymentMode") {
      const modeValue = String(value);
      const label = PAYMENT_MODE_LABELS[modeValue];
      if (label) {
        return `${modeValue} (${label})`;
      }
    }

    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatKey = (key: string): string => {
    // Special case for upload_response_message
    if (key === "upload_response_message") {
      return "Upload Status";
    }

    // Don't format keys that are already properly formatted (like "Card Type")
    if (key.includes(" ")) {
      return key;
    }
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Build structured sections for Pinelabs data
  const sections: Section[] = [];

  // Section 1: Main Pinelabs fields + Upload response_message
  const pinelabsRows: Array<{ key: string; value: string }> = [];

  // Add all main Pinelabs fields
  for (const field of PINELABS_FIELDS) {
    if (field in data) {
      pinelabsRows.push({
        key: field,
        value: formatValue(data[field], field),
      });
    }
  }

  // Add upload response_message to this section
  if ("upload" in data && typeof data.upload === "object" && data.upload) {
    const uploadObj = data.upload as Record<string, unknown>;
    if ("response_message" in uploadObj) {
      pinelabsRows.push({
        key: "upload_response_message",
        value: formatValue(uploadObj.response_message, "upload_response_message"),
      });
    }
  }

  if (pinelabsRows.length > 0) {
    sections.push({
      title: "Transaction Details",
      rows: pinelabsRows,
      collapsible: true,
      defaultCollapsed: true,
    });
  }

  // Section 2: Status (collapsible) - check for lowercase "status"
  if ("status" in data && typeof data.status === "object" && data.status) {
    const statusObj = data.status as Record<string, unknown>;
    const allStatusRows: Array<{ key: string; value: string }> = [];

    // Add status fields
    for (const field of STATUS_FIELDS) {
      if (field in statusObj) {
        allStatusRows.push({
          key: field,
          value: formatValue(statusObj[field], field),
        });
      }
    }

    // Add transaction_data fields if available
    if (
      "transaction_data" in statusObj &&
      typeof statusObj.transaction_data === "object" &&
      statusObj.transaction_data
    ) {
      const txnData = statusObj.transaction_data as Record<string, unknown>;
      for (const field of TRANSACTION_DATA_FIELDS) {
        if (field in txnData) {
          allStatusRows.push({
            key: field,
            value: formatValue(txnData[field], field),
          });
        }
      }
    }

    if (allStatusRows.length > 0) {
      sections.push({
        title: "Status",
        rows: allStatusRows,
        collapsible: true,
        defaultCollapsed: true,
      });
    }
  }

  // Section 3: Upload section removed - response_message is now shown in Transaction Details

  // If no sections were built, fall back to simple display
  if (sections.length === 0) {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return null;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                Field
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map(([key, value]) => (
              <tr key={key}>
                <td className="px-4 py-2 text-sm font-medium text-gray-700 whitespace-nowrap">
                  {formatKey(key)}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 break-words">
                  {formatValue(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Helper function to filter rows for collapsed sections
  const getVisibleRows = (
    section: Section,
    sectionIndex: number,
  ): Array<{ key: string; value: string }> => {
    if (!section.collapsible || expandedSections.has(sectionIndex)) {
      return section.rows;
    }

    // Filter based on section title
    if (section.title === "Transaction Details") {
      // Show only transaction_reference_id and upload_response_message when collapsed
      return section.rows.filter(
        (row) =>
          row.key === "transaction_reference_id" ||
          row.key === "upload_response_message",
      );
    } else if (section.title === "Status") {
      // Show only TID and TransactionLogId when collapsed
      return section.rows.filter(
        (row) => row.key === "TID" || row.key === "TransactionLogId",
      );
    }

    return section.rows;
  };

  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => {
        const isExpanded = expandedSections.has(sectionIndex);
        const visibleRows = getVisibleRows(section, sectionIndex);

        return (
          <div key={sectionIndex} className="overflow-x-auto">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-semibold text-gray-700">
                {section.title}
              </h4>
              {section.collapsible && (
                <button
                  onClick={() => toggleSection(sectionIndex)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Field
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-700 whitespace-nowrap">
                      {formatKey(row.key)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 break-words">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};
