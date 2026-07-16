import { FC } from "react";
import {
  PINELABS_FIELDS,
  STATUS_FIELDS,
  TRANSACTION_DATA_FIELDS,
  UPLOAD_FIELDS,
  PAYMENT_MODE_LABELS,
} from "@/lib/pinelabsMetaConfig";

type MetaTableProps = {
  data: Record<string, unknown>;
};

type Section = {
  title: string;
  rows: Array<{ key: string; value: string }>;
};

export const MetaTable: FC<MetaTableProps> = ({ data }) => {
  const formatValue = (value: unknown, key?: string): string => {
    if (value === null || value === undefined) {
      return "N/A";
    }

    // Special handling for Payment Mode
    if (key === "Payment Mode" || key === "PaymentMode") {
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
    // Don't format keys that are already properly formatted (like "Card Type")
    if (key.includes(" ")) {
      return key;
    }
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Check if this is Pinelabs metadata
  const isPinelabsData = "Status" in data || "Upload" in data;

  if (!isPinelabsData) {
    // Fallback to simple display for non-Pinelabs data
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

  // Build structured sections for Pinelabs data
  const sections: Section[] = [];

  // Section 1: Main Pinelabs fields
  const pinelabsRows: Array<{ key: string; value: string }> = [];
  for (const field of PINELABS_FIELDS) {
    if (field in data) {
      pinelabsRows.push({
        key: field,
        value: formatValue(data[field], field),
      });
    }
  }
  if (pinelabsRows.length > 0) {
    sections.push({
      title: "Transaction Details",
      rows: pinelabsRows,
    });
  }

  // Section 2: Status
  if ("Status" in data && typeof data.Status === "object" && data.Status) {
    const statusObj = data.Status as Record<string, unknown>;
    const statusRows: Array<{ key: string; value: string }> = [];

    // Add status fields
    for (const field of STATUS_FIELDS) {
      if (field in statusObj) {
        statusRows.push({
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
          statusRows.push({
            key: field,
            value: formatValue(txnData[field], field),
          });
        }
      }
    }

    if (statusRows.length > 0) {
      sections.push({
        title: "Status",
        rows: statusRows,
      });
    }
  }

  // Section 3: Upload
  if ("Upload" in data && typeof data.Upload === "object" && data.Upload) {
    const uploadObj = data.Upload as Record<string, unknown>;
    const uploadRows: Array<{ key: string; value: string }> = [];

    for (const field of UPLOAD_FIELDS) {
      if (field in uploadObj) {
        uploadRows.push({
          key: field,
          value: formatValue(uploadObj[field], field),
        });
      }
    }

    if (uploadRows.length > 0) {
      sections.push({
        title: "Upload",
        rows: uploadRows,
      });
    }
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="overflow-x-auto">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            {section.title}
          </h4>
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
              {section.rows.map((row, rowIndex) => (
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
      ))}
    </div>
  );
};
