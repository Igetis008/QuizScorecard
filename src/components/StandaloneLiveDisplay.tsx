import React from 'react';
import { LiveDisplay } from './LiveDisplay';

// This component is used for the standalone live display page
export function StandaloneLiveDisplay() {
  return <LiveDisplay teams={[]} isStandalone={true} />;
}