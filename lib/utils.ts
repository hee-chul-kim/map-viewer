import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn 함수는 클래스 이름을 조합하는 유틸리티 함수입니다.
 * clsx를 사용하여 다양한 형태의 클래스 값(문자열, 객체, 배열 등)을 병합하고,
 * tailwind-merge를 통해 Tailwind CSS 클래스 간의 충돌을 해결합니다.
 *
 * 이 함수는 classnames 라이브러리로도 대체 가능합니다. 다만 classnames는
 * Tailwind CSS 클래스 충돌 해결 기능이 없으므로, tailwind-merge와 함께 사용해야
 * 동일한 기능을 구현할 수 있습니다.
 *
 * 예시:
 * cn('text-red-500', { 'bg-blue-500': isActive }, ['p-4', 'rounded'])
 *
 * @param inputs - 병합할 클래스 값들 (문자열, 객체, 배열 등)
 * @returns 최종 병합된 클래스 문자열
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
