import { FC } from "react";

type MetaTableProps = {
  data: Record<string, unknown>;
};

export const MetaTable: FC<MetaTableProps> = ({ data }) => {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return null;
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return "N/A";
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatKey = (key: string): string => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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
};
