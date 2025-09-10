// File: civil-eng-website/client/src/components/ProjectWizard.jsx

import React, { useState } from 'react';
import LocationSearch from '../components/LocationSearch';

const ProjectWizard = ({ stations, onStationSelect }) => {
  // onStationSelect now receives the full place object
  const handleNext = (place) => {
    console.log('Place selected in ProjectWizard:', place); // Debug log
    onStationSelect(place);
  };

  if (!stations) {
    return <div>Loading stations...</div>;
  }

  return (
    <div className="mb-8 flex justify-center">
      <LocationSearch onStationSelected={handleNext} />
      {/* The rest of your component's JSX */}
    </div>
  );
};

export default ProjectWizard;