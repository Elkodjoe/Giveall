import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { nightlyRecalculateWeights } from './recalculateWeights';
export { activatePartnership } from './activatePartnership';
export { validateProfile } from './validateProfile';
export { generateAppreciation } from './generateAppreciation';
