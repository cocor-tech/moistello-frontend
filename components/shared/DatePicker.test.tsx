import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DatePicker from './DatePicker';

describe('DatePicker', () => {
  const mockOnChange = jest.fn();
  const mockT = jest.fn((key) => key);

  beforeEach(() => {
    jest.mock('@/hooks/useI18n', () => ({
      useI18n: () => ({ t: mockT }),
    }));
  });

  it('renders with label and required indicator', () => {
    render(<DatePicker label='Test Date' required onChange={mockOnChange} />);
    expect(screen.getByLabelText('Test Date')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    render(<DatePicker label='Test Date' onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '{arrowdown}');
    expect(mockOnChange).not.toHaveBeenCalled();
    await userEvent.keyboard('{enter}');
    expect(screen.getByTestId('react-datepicker__input')).toBeInTheDocument();
  });

  it('validates min/max dates', () => {
    const minDate = new Date('2023-01-01');
    const maxDate = new Date('2023-12-31');
    render(<DatePicker
      label='Test Date'
      minDate={minDate}
      maxDate={maxDate}
      onChange={mockOnChange}
    />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '2023-06-01' } });
    fireEvent.blur(screen.getByRole('textbox'));
    expect(mockOnChange).toHaveBeenCalledWith(expect.any(Date));
  });

  it('shows error when required and empty', () => {
    render(<DatePicker label='Test Date' required onChange={mockOnChange} />);
    fireEvent.blur(screen.getByRole('textbox'));
    expect(screen.getByText('fields.required')).toBeInTheDocument();
  });
});