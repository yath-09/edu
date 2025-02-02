import React, { useState } from 'react';
import { PreFillFormProps, UserContext } from '../../types';

export const PreFillForm: React.FC<PreFillFormProps> = ({ onSubmit }) => {
  const [age, setAge] = useState<number>(15);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userContext: UserContext = {
      age: age,
      studyingFor: 'General Learning' // Default value
    };
    onSubmit(userContext);
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
            type="number"
            id="age"
            min="8"
            max="100"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg
              text-white focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full px-6 py-3 bg-primary hover:bg-primary-dark rounded-lg
            transition-colors duration-200 text-white font-medium"
        >
          Get Started
        </button>
      </form>
    </div>
  );
}; 