import React from 'react';

const DataTable = ({
  data = [],
  columns = [],
  onEdit,
  onDelete,
  loading = false,
}) => {
  return (
    <div className="overflow-x-auto px-4 md:px-8 mt-6">
      <table className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <thead className="text-slate-900 dark:text-slate-50 text-left text-sm font-semibold border-b border-slate-300 dark:border-neutral-600 whitespace-nowrap">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-3 py-3.5">
                {column.label}
              </th>
            ))}

            {(onEdit || onDelete) && (
              <th scope="col" className="px-3 py-3.5">
                Actions
              </th>
            )}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="text-sm divide-y divide-slate-200 dark:divide-neutral-700">
          {loading ? (
            <tr>
              <td
                colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                className="text-center py-8 text-slate-500"
              >
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                className="text-center py-8 text-slate-500"
              >
                No data found
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id || row._id}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-3 py-4 text-slate-500 dark:text-slate-400"
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}

                {(onEdit || onDelete) && (
                  <td className="px-3 py-4">
                    <div className="flex gap-3">
                      {/* Edit */}
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          className="text-sm text-blue-700 dark:text-blue-500 cursor-pointer hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                        >
                          Edit
                        </button>
                      )}

                      {/* Archive */}
                      {onDelete && row.status !== 'ARCHIVED' && (
                        <button
                          type="button"
                          onClick={() => onDelete(row)}
                          className="text-sm text-red-700 dark:text-red-500 cursor-pointer hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                        >
                          Archive
                        </button>
                      )}

                      {/* Archived */}
                      {row.status === 'ARCHIVED' && (
                        <span className="text-sm text-slate-400 dark:text-slate-500">
                          Archived
                        </span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
