import React, { useState } from 'react';
import { UserContext } from '../../types';

interface PreFillFormProps {
  onSubmit: (context: UserContext) => void;
}

export const PreFillForm: React.FC<PreFillFormProps> = ({ onSubmit }) => {
  const [age, setAge] = useState<string>('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const ageNumber = parseInt(age);
    if (isNaN(ageNumber) || ageNumber < 1 || ageNumber > 100) {
      return;
    }

    onSubmit({
      age: ageNumber
    });
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid numbers
    if (value === '' || /^\d{1,3}$/.test(value)) {
      setAge(value);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-white mb-6">Welcome! Let's personalize your experience</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-300 mb-2">
            Your Age
          </label>
          <input
            id="age"
            type="text" // Change to text type
            value={age}
            onChange={handleAgeChange}
            placeholder="Enter your age"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg
              text-white focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={!age || parseInt(age) < 1 || parseInt(age) > 100}
          className="w-full px-6 py-3 bg-primary hover:bg-primary-dark rounded-lg
            transition-colors duration-200 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Get Started
        </button>
      </form>
    </div>
  );
}; 