import React from 'react';

// The EXACT uploaded EDGE logo — not a recreation
const LOGO_PATH = '/edge-logo.jpg';

export const EdgeLogoFull = ({ height = 32 }) => (
    <img
        src={LOGO_PATH}
        alt="EDGE"
        style={{ height, width: 'auto', objectFit: 'contain' }}
        draggable={false}
    />
);

export const EdgeIcon = ({ size = 28 }) => (
    <img
        src={LOGO_PATH}
        alt="EDGE"
        style={{ height: size, width: 'auto', objectFit: 'contain' }}
        draggable={false}
    />
);

export default EdgeLogoFull;
