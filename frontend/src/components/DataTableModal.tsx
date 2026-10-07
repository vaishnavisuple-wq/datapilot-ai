import React, { useState } from 'react';
import { X, Search, Table, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { DatasetProfile } from '../types';

interface DataTableModalProps {
  profile: DatasetProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const DataTableModal: React.FC<DataTableModalProps> = ({
  profile,
  isOpen,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  if (!isOpen) return null;

  const rawData = profile.preview_data || [];
  const columns = Object.keys(profile.column_types || {});

  const filteredData = rawData.filter((row) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some((val) => String(val).toLowerCase().includes(term));
  });

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getBadgeForType = (type: string) => {
    switch (type) {
      case 'numeric':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'datetime':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'categorical':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'id':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[85vh] rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Data Explorer</h3>
              <p className="text-xs text-slate-400">
                Previewing top records from <span className="text-slate-200 font-medium">{profile.filename}</span> ({profile.total_rows.toLocaleString()} total rows)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Columns Summary Bar */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search in preview records..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Showing {filteredData.length} records</span>
            <span>•</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-300 font-semibold z-10">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-800 text-slate-500 w-12 text-center">#</th>
                {columns.map((col) => {
                  const type = profile.column_types[col] || 'text';
                  const missing = profile.missing_counts[col] || 0;
                  return (
                    <th key={col} className="py-2.5 px-3 border-r border-slate-800 whitespace-nowrap">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">{col}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getBadgeForType(type)}`}>
                          {type}
                        </span>
                      </div>
                      {missing > 0 && (
                        <span className="text-[10px] text-amber-400 font-normal block mt-0.5">
                          {missing} missing
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {paginatedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50 transition">
                  <td className="py-2.5 px-3 text-slate-500 text-center font-mono border-r border-slate-900">
                    {(currentPage - 1) * pageSize + idx + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="py-2.5 px-3 border-r border-slate-900 whitespace-nowrap max-w-[200px] truncate">
                      {row[col] !== undefined && row[col] !== null ? String(row[col]) : (
                        <span className="text-slate-600 italic">null</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Preview limited to top 50 sampled rows for performance. Full calculations run on all {profile.total_rows.toLocaleString()} records.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-300 font-medium px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
