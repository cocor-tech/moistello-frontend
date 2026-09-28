import React, { useState } from 'react';
import DatePicker from '@/components/shared/DatePicker';

const ExpirySelector = ({ onExpirySet }: { onExpirySet: (date: Date) => void }) => {
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  const handleSubmit = () => {
    if (expiryDate) {
      onExpirySet(expiryDate);
    }
  };

  return (
    <div className='space-y-4'>
      <DatePicker
        label='Invite Expiry'
        value={expiryDate}
        onChange={setExpiryDate}
        showTimeSelect
        timeFormat='HH:mm'
        dateFormat='MM/dd/yyyy h:mm aa'
        className='w-full'
      />
      <button
        type='button'
        onClick={handleSubmit}
        disabled={!expiryDate}
        className='mt-2 px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50'
      >
        Set Expiry
      </button>
    </div>
  );
};

export default ExpirySelector;