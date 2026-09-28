import React, { useState, useRef, useEffect } from 'react';
import { format, parse, isValid, isAfter, isBefore } from 'date-fns';
import { useLocale } from '@/contexts/LocaleContext';
import { useI18n } from '@/hooks/useI18n';
import DatePickerCore from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showTimeSelect?: boolean;
  timeFormat?: string;
  timeIntervals?: number;
  timeCaption?: string;
  dateFormat?: string;
  disabled?: boolean;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  required = false,
  minDate,
  maxDate,
  showTimeSelect = false,
  timeFormat = 'HH:mm',
  timeIntervals = 15,
  timeCaption = 'time',
  dateFormat = 'P',
  disabled = false,
  className = '',
}) => {
  const { locale } = useLocale();
  const { t } = useI18n();
  const [inputValue, setInputValue] = useState<string>(format(value || new Date(), dateFormat));
  const datePickerRef = useRef<HTMLDivElement>(null);

  const handleChange = (date: Date | null) => {
    if (date) {
      const formatted = format(date, dateFormat);
      setInputValue(formatted);
    } else {
      setInputValue('');
    }
    onChange(date);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !disabled) {
      e.preventDefault();
      datePickerRef.current?.querySelector('input')?.focus();
    }
  };

  const validateDate = (date: Date) => {
    if (minDate && isBefore(date, minDate)) return false;
    if (maxDate && isAfter(date, maxDate)) return false;
    return true;
  };

  useEffect(() => {
    if (value) {
      setInputValue(format(value, dateFormat));
    }
  }, [value, dateFormat]);

  return (
    <div className={`date-picker-container ${className}`}>
      <label htmlFor='date-picker-input' className='block text-sm font-medium text-gray-700'>
        {label}
        {required && <span className='text-red-500 ml-1'>*</span>}
      </label>
      <div className='relative'>
        <DatePickerCore
          id='date-picker-input'
          selected={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          ref={datePickerRef}
          minDate={minDate}
          maxDate={maxDate}
          showTimeSelect={showTimeSelect}
          timeFormat={timeFormat}
          timeIntervals={timeIntervals}
          timeCaption={timeCaption}
          dateFormat={dateFormat}
          locale={locale}
          disabled={disabled}
          inline
          className='absolute z-10'
          popperClassName='p-2 border rounded shadow-lg'
          portalId='date-picker-portal'
        />
        <input
          type='text'
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => {
            const parsed = parse(inputValue, dateFormat, new Date());
            if (isValid(parsed)) {
              handleChange(parsed);
            } else if (value) {
              setInputValue(format(value, dateFormat));
            }
          }}
          onKeyDown={handleKeyDown}
          className='mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
          aria-label={label}
          aria-required={required}
          aria-invalid={!value && required}
          aria-describedby='date-picker-error'
          disabled={disabled}
        />
        {(!value && required) && (
          <p id='date-picker-error' className='mt-1 text-sm text-red-600'>
            {t('fields.required')}
          </p>
        )}
      </div>
    </div>
  );
};

export default DatePicker;