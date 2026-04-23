import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Input } from './Input';
import { Pagination } from './Pagination';

export const Table = ({ columns, data, searchKey = "", emptyMessage = "No data available." }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  // Search
  const filteredData = React.useMemo(() => {
    if (!searchTerm || !searchKey) return data;
    return data.filter(item => 
      String(item[searchKey]).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm, searchKey]);

  // Sort
  const sortedData = React.useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  // Pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-4">
      {searchKey && (
        <div className="relative w-72">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-10"
          />
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-sm text-left text-slate-700">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50">
            <tr>
              {columns.map((column, index) => (
                <th key={index} 
                    className="px-6 py-3 cursor-pointer hover:bg-slate-100"
                    onClick={() => column.sortable !== false && requestSort(column.accessor)}>
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {sortConfig?.key === column.accessor && (
                      sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              currentRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="bg-white border-b hover:bg-slate-50 last:border-0">
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                      {column.render ? column.render(row) : row[column.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      )}
    </div>
  );
};
