// src/components/shared/UserInfoModal.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

interface UserInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userInfo: UserInfo) => void;
}

interface UserInfo {
  age: number;
  location: string;
  studyingFor: string;
}

export const UserInfoModal = ({ isOpen, onClose, onSubmit }: UserInfoModalProps) => {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    age: 0,
    location: '',
    studyingFor: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(userInfo);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-6">Tell us about yourself</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Age
            </label>
            <input
              type="number"
              value={userInfo.age || ''}
              onChange={(e) => setUserInfo(prev => ({ ...prev, age: parseInt(e.target.value) }))}
              className="input w-full"
              placeholder="Enter your age"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Location
            </label>
            <input
              type="text"
              value={userInfo.location}
              onChange={(e) => setUserInfo(prev => ({ ...prev, location: e.target.value }))}
              className="input w-full"
              placeholder="Enter your city/country"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Preparing For
            </label>
            <select
              value={userInfo.studyingFor}
              onChange={(e) => setUserInfo(prev => ({ ...prev, studyingFor: e.target.value }))}
              className="input w-full"
              required
            >
              <option value="">Select exam type</option>
              <option value="JEE">JEE Main</option>
              <option value="NEET">NEET</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary w-full">
            Start Learning
          </button>
        </form>
      </div>
    </div>
  );
};