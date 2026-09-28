import React, { useState } from 'react';
import DatePicker from '@/components/shared/DatePicker';

const TimeSelector = ({ onTimeSet }: { onTimeSet: (date: Date) => void }) => {
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);

  return (
    <DatePicker
      label='Schedule Time'
      value={selectedTime}
      onChange={setSelectedTime}
      showTimeSelect
      timeFormat='HH:mm'
      timeIntervals={15}
      dateFormat='MM/dd/yyyy h:mm aa'
      required
      onBlur={() => selectedTime && onTimeSet(selectedTime)}
    />
  );
};

export default TimeSelector;