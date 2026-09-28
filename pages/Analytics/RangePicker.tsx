import React, { useState } from 'react';
import DatePicker from '@/components/shared/DatePicker';

const RangePicker = () => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  return (
    <div className='space-y-6'>
      <DatePicker
        label='Start Date'
        value={startDate}
        onChange={setStartDate}
        required
        maxDate={endDate}
        dateFormat='MM/dd/yyyy'
      />
      <DatePicker
        label='End Date'
        value={endDate}
        onChange={setEndDate}
        required
        minDate={startDate}
        dateFormat='MM/dd/yyyy'
      />
    </div>
  );
};

export default RangePicker;