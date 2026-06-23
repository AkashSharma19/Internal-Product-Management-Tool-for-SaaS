import React from 'react';
import { Search, Plus, Download, Upload } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

interface TabContainerProps {
  title: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPlaceholder?: string;
  onAddClick?: () => void;
  addLabel?: string;
  onExportCSV?: () => void;
  onImportCSVClick?: () => void;
  filterComponent?: React.ReactNode;
  children: React.ReactNode;
}

export const TabContainer: React.FC<TabContainerProps> = ({
  title,
  searchQuery,
  setSearchQuery,
  searchPlaceholder = 'Search...',
  onAddClick,
  addLabel = 'Add New',
  onExportCSV,
  onImportCSVClick,
  filterComponent,
  children
}) => {
  const { canUserEdit } = useDashboard();

  return (
    <div className="full-canvas-workspace">
      <div className="sheet-toolbar">
        <div className="toolbar-left">
          <h2 style={{ fontSize: '1.25rem', marginRight: '1rem' }}>{title}</h2>
          
          <div className="search-input-wrapper">
            <Search size={16} />
            <input 
              type="text" 
              className="search-input" 
              placeholder={searchPlaceholder} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filterComponent}
        </div>

        <div className="toolbar-right">
          {onImportCSVClick && canUserEdit && (
            <button className="btn btn-secondary btn-sm" onClick={onImportCSVClick} title="Import CSV data">
              <Upload size={14} /> Import CSV
            </button>
          )}
          
          {onExportCSV && (
            <button className="btn btn-secondary btn-sm" onClick={onExportCSV} title="Download CSV backup">
              <Download size={14} /> Export CSV
            </button>
          )}

          {onAddClick && canUserEdit && (
            <button className="btn btn-primary btn-sm" onClick={onAddClick}>
              <Plus size={14} /> {addLabel}
            </button>
          )}
        </div>
      </div>

      <div 
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
        onDoubleClickCapture={(e) => {
          if (!canUserEdit) {
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
};
