import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const unitPerWater =  0.63 ;
export const unitPerEletrict =0.38;
export const USD_TO_RIEL = 4000;


export const formatDate = (dateInput: any) => {
  const date = new Date(dateInput);
  
  // Get components
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

// Example usage:
// formatDate(new Date()) -> "18-06-2026"