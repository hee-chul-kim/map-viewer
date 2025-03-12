/**
 * Integration tests for the FileUpload component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUpload from '@/components/file-upload';
import { useShapefileStore } from '@/lib/store';
import * as shpjs from 'shpjs';

// Mock the store
jest.mock('@/lib/store', () => ({
  useShapefileStore: jest.fn(),
}));

// Mock shpjs
jest.mock('shpjs', () => ({
  __esModule: true,
  default: {
    parseShp: jest.fn(),
    parseDbf: jest.fn(),
    combine: jest.fn(),
  },
}));

// Mock toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

describe('FileUpload Component', () => {
  const mockAddShapefile = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup store mock
    (useShapefileStore as jest.Mock).mockReturnValue({
      addShapefile: mockAddShapefile,
    });
    
    // Setup shpjs mock return values
    const mockGeoJSON = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] } }],
    };
    
    const mockDbfData = [{ id: 1, name: 'Test' }];
    
    const mockCombinedData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { id: 1, name: 'Test' },
        },
      ],
    };
    
    (shpjs.default.parseShp as jest.Mock).mockResolvedValue(mockGeoJSON);
    (shpjs.default.parseDbf as jest.Mock).mockResolvedValue(mockDbfData);
    (shpjs.default.combine as jest.Mock).mockReturnValue(mockCombinedData);
  });
  
  test('renders the file upload component', () => {
    render(<FileUpload />);
    
    expect(screen.getByText(/SHP 파일을 드래그하거나 클릭하여 업로드하세요/i)).toBeInTheDocument();
    expect(screen.getByText(/관련 파일\(.dbf, .shx\)도 함께 업로드해야 합니다/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /파일 선택/i })).toBeInTheDocument();
  });
  
  test('handles file upload with valid SHP file', async () => {
    render(<FileUpload />);
    
    // Create mock files
    const shpFile = new File([], 'test.shp');
    const dbfFile = new File([], 'test.dbf');
    const shxFile = new File([], 'test.shx');
    
    // Get file input and simulate file selection
    const fileInput = screen.getByRole('button', { name: /파일 선택/i });
    
    // Simulate clicking the button which triggers the file input
    fireEvent.click(fileInput);
    
    // Get the actual file input and simulate file selection
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Mock the file selection
    Object.defineProperty(input, 'files', {
      value: [shpFile, dbfFile, shxFile],
    });
    
    // Trigger change event
    fireEvent.change(input);
    
    // Wait for async operations to complete
    await waitFor(() => {
      expect(shpjs.default.parseShp).toHaveBeenCalled();
      expect(shpjs.default.parseDbf).toHaveBeenCalled();
      expect(shpjs.default.combine).toHaveBeenCalled();
      expect(mockAddShapefile).toHaveBeenCalledWith(expect.objectContaining({
        name: 'test',
        visible: true,
      }));
    });
  });
  
  test('shows error when SHP file is missing', async () => {
    const { toast } = require('@/components/ui/use-toast');
    render(<FileUpload />);
    
    // Create mock files without SHP
    const dbfFile = new File([], 'test.dbf');
    const shxFile = new File([], 'test.shx');
    
    // Get file input and simulate file selection
    const fileInput = screen.getByRole('button', { name: /파일 선택/i });
    
    // Simulate clicking the button which triggers the file input
    fireEvent.click(fileInput);
    
    // Get the actual file input and simulate file selection
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Mock the file selection
    Object.defineProperty(input, 'files', {
      value: [dbfFile, shxFile],
    });
    
    // Trigger change event
    fireEvent.change(input);
    
    // Wait for async operations to complete
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: '오류',
        description: 'SHP 파일이 포함되어 있지 않습니다.',
        variant: 'destructive',
      }));
    });
  });
}); 