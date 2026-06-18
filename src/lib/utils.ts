import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const unitPerWater =  0.63 ;
export const unitPerEletrict =0.38;
export const USD_TO_RIEL = 4000;
