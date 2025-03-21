/**
 * PRJ 파일을 파싱하여 좌표계 정보를 추출합니다.
 * @param buffer - PRJ 파일 버퍼
 * @returns 좌표계 정보
 */
export async function parsePrj(buffer: ArrayBuffer): Promise<string> {
    try {
      // PRJ 파일은 텍스트 파일이므로 UTF-8로 디코딩
      const decoder = new TextDecoder('utf-8');
      const prjText = decoder.decode(buffer);
  
      // WKT(Well-Known Text) 형식의 좌표계 정보 반환
      return Promise.resolve(prjText.trim());
    } catch (error) {
      console.error('PRJ 파일 파싱 오류:', error);
      throw error;
    }
  }
  